import { RESOURCE_KEYS } from "../factions.js";
import { calculateIncomeRate, registerIncomeTickObserver } from "./economySystem.js";
import { createSimulationClock } from "./simulationClock.js";

function finite(value, fallback = 0) {
  const number = Number(value);
  return Number.isFinite(number) ? number : fallback;
}

function cloneResources(resources = {}) {
  return Object.fromEntries(RESOURCE_KEYS.map(key => [key, finite(resources[key], 0)]));
}

function resourceDelta(a = {}, b = {}) {
  return Object.fromEntries(RESOURCE_KEYS.map(key => [key, finite(a[key], 0) - finite(b[key], 0)]));
}

function addResources(target, delta) {
  for (const key of RESOURCE_KEYS) target[key] = finite(target[key], 0) + finite(delta?.[key], 0);
  return target;
}

function integrateResources(target, rates, dt) {
  const step = Math.max(0, finite(dt, 0));
  for (const key of RESOURCE_KEYS) target[key] = finite(target[key], 0) + finite(rates?.[key], 0) * step;
  return target;
}

function maxAbsVector(vector = {}) {
  return Math.max(0, ...RESOURCE_KEYS.map(key => Math.abs(finite(vector[key], 0))));
}

function summarizeInput(input = {}) {
  return {
    factionId: input.faction?.id || null,
    workforce: finite(input.workforce, 0),
    age: finite(input.age, 0),
    allocation: Object.fromEntries(RESOURCE_KEYS.map(key => [key, finite(input.allocation?.[key], 0)])),
    territoryBonus: Object.fromEntries(RESOURCE_KEYS.map(key => [key, finite(input.territoryBonus?.[key], 0)])),
    upgradeLevels: { ...(input.upgradeLevels || {}) },
    livingBuildings: (input.buildings || []).filter(building => building?.parent && finite(building.userData?.hp, 0) > 0).length
  };
}

function projectedResources(channel, input) {
  const projected = cloneResources(channel.resources);
  if (channel.clock.accumulator <= 0) return projected;
  const rate = calculateIncomeRate(input);
  return integrateResources(projected, rate, channel.clock.accumulator);
}

function freshChannel(tickRate, label) {
  return {
    label,
    clock: createSimulationClock({ tickRate, maxCatchUpTicks: 8 }),
    initialized: false,
    resources: null,
    liveTime: 0,
    lastLiveAfterResources: null,
    samples: [],
    factionId: null,
    maxAbsResourceDrift: 0,
    externalResourceAdjustments: 0
  };
}

export class EconomyDriftProbe {
  constructor({ tickRate = 20, maxSamples = 600, resourceTolerance = 1e-8 } = {}) {
    this.tickRate = Math.max(1, Number(tickRate) || 20);
    this.maxSamples = Math.max(20, Math.trunc(Number(maxSamples) || 600));
    this.resourceTolerance = Math.max(0, Number(resourceTolerance) || 0);
    this.reset();
  }

  reset() {
    this.channels = {};
    this.resourceChannels = new WeakMap();
    this.channelSerial = 0;
  }

  channelFor(resources) {
    if (resources && this.resourceChannels.has(resources)) return this.resourceChannels.get(resources);
    const serial = ++this.channelSerial;
    const id = serial === 1 ? "player" : serial === 2 ? "enemy" : `stream-${serial}`;
    this.channels[id] = freshChannel(this.tickRate, id);
    if (resources && typeof resources === "object") this.resourceChannels.set(resources, id);
    return id;
  }

  observeIncomeTick({ resources, beforeResources = {}, afterResources = {}, dt = 0, input = null } = {}) {
    if (!input?.faction) return null;
    const channelId = this.channelFor(resources);
    const channel = this.channels[channelId];
    const step = Math.max(0, finite(dt, 0));

    if (!channel.initialized) {
      channel.initialized = true;
      channel.resources = cloneResources(beforeResources);
      channel.factionId = input.faction?.id || null;
    } else {
      const adjustment = resourceDelta(beforeResources, channel.lastLiveAfterResources || beforeResources);
      if (maxAbsVector(adjustment) > 1e-10) {
        addResources(channel.resources, adjustment);
        channel.externalResourceAdjustments += 1;
      }
    }

    channel.liveTime += step;
    channel.clock.step(step, ({ dt: fixedDt }) => {
      const rate = calculateIncomeRate(input);
      integrateResources(channel.resources, rate, fixedDt);
    });

    const projected = projectedResources(channel, input);
    const drift = resourceDelta(projected, afterResources);
    const maxResourceDrift = maxAbsVector(drift);
    channel.maxAbsResourceDrift = Math.max(channel.maxAbsResourceDrift, maxResourceDrift);

    const sample = {
      channel: channelId,
      factionId: input.faction?.id || null,
      liveTime: channel.liveTime,
      fixedTick: channel.clock.tick,
      fixedTime: channel.clock.simulationTime,
      accumulator: channel.clock.accumulator,
      liveResources: cloneResources(afterResources),
      shadowProjectedResources: projected,
      resourceDrift: drift,
      maxAbsResourceDrift: maxResourceDrift,
      input: summarizeInput(input)
    };

    channel.samples.push(sample);
    while (channel.samples.length > this.maxSamples) channel.samples.shift();
    channel.lastLiveAfterResources = cloneResources(afterResources);
    return sample;
  }

  channelReport(channelId) {
    const channel = this.channels[channelId];
    if (!channel) return null;
    return {
      initialized: channel.initialized,
      label: channel.label,
      factionId: channel.factionId,
      tickRate: this.tickRate,
      fixedTick: channel.clock.tick,
      liveTime: channel.liveTime,
      maxAbsResourceDrift: channel.maxAbsResourceDrift,
      strictZeroResourceDrift: channel.initialized && channel.maxAbsResourceDrift <= this.resourceTolerance,
      externalResourceAdjustments: channel.externalResourceAdjustments,
      sampleCount: channel.samples.length,
      latest: channel.samples.length ? structuredCloneSafe(channel.samples[channel.samples.length - 1]) : null
    };
  }

  exportReceipt() {
    const channels = Object.fromEntries(Object.keys(this.channels).map(id => [id, this.channelReport(id)]));
    const measured = Object.values(channels).filter(channel => channel?.initialized);
    return {
      schema: "axm-rts-economy-drift/v1",
      authority: "shadow-only",
      authorityTransferred: false,
      tickRate: this.tickRate,
      resourceTolerance: this.resourceTolerance,
      status: measured.length ? "measured" : "unmeasured",
      strictZeroResourceDrift: measured.length > 0 && measured.every(channel => channel.strictZeroResourceDrift),
      channelNaming: "Current Skirmish evaluates player income before enemy income; first two observed resource objects are labelled player and enemy. Extra streams remain generic.",
      note: "The fixed-step shadow receives the same changing economy snapshots as the live variable-step economy. External spends and rewards between economy ticks are mirrored before comparison so they are not misreported as economy drift.",
      channels
    };
  }
}

function structuredCloneSafe(value) {
  if (typeof structuredClone === "function") return structuredClone(value);
  return JSON.parse(JSON.stringify(value));
}

export function createEconomyDriftProbe(options = {}) {
  return new EconomyDriftProbe(options);
}

export const skirmishEconomyDriftProbe = createEconomyDriftProbe({ tickRate: 20, maxSamples: 600, resourceTolerance: 1e-8 });

registerIncomeTickObserver(event => skirmishEconomyDriftProbe.observeIncomeTick(event));

if (typeof window !== "undefined") {
  Object.defineProperty(window, "__AXM_RTS_ECONOMY_DRIFT__", {
    configurable: true,
    get: () => ({
      version: 1,
      authority: "shadow-only",
      report: () => skirmishEconomyDriftProbe.exportReceipt()
    })
  });
}
