import { RESOURCE_KEYS } from "../factions.js";
import { applyIncomeTick, calculateIncomeRate, livingEconomyBuildingCount, populationGrowthInterval } from "./economySystem.js";
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

function maxAbsVector(vector = {}) {
  return Math.max(0, ...RESOURCE_KEYS.map(key => Math.abs(finite(vector[key], 0))));
}

function summarizeInput(input = {}) {
  return {
    factionId: input.faction?.id || null,
    age: finite(input.age, 0),
    allocation: Object.fromEntries(RESOURCE_KEYS.map(key => [key, finite(input.allocation?.[key], 0)])),
    territoryBonus: Object.fromEntries(RESOURCE_KEYS.map(key => [key, finite(input.territoryBonus?.[key], 0)])),
    upgradeLevels: { ...(input.upgradeLevels || {}) },
    livingBuildings: (input.buildings || []).filter(building => building?.parent && finite(building.userData?.hp, 0) > 0).length,
    economyBuildings: livingEconomyBuildingCount(input.buildings || [])
  };
}

function projectedResources(side, input) {
  const projected = cloneResources(side.resources);
  if (side.clock.accumulator <= 0) return projected;
  const rate = calculateIncomeRate({ ...input, workforce: side.workforce });
  return applyIncomeTick(projected, rate, side.clock.accumulator);
}

function freshSide(tickRate) {
  return {
    clock: createSimulationClock({ tickRate, maxCatchUpTicks: 8 }),
    initialized: false,
    resources: null,
    workforce: 0,
    populationClock: 0,
    liveTime: 0,
    lastLiveAfterResources: null,
    lastLiveAfterWorkforce: null,
    lastLiveAfterPopulationClock: null,
    samples: [],
    maxAbsResourceDrift: 0,
    maxAbsWorkforceDrift: 0,
    maxAbsPopulationClockDrift: 0,
    externalResourceAdjustments: 0,
    externalWorkforceAdjustments: 0
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
    this.sides = {
      player: freshSide(this.tickRate),
      enemy: freshSide(this.tickRate)
    };
  }

  ensureSide(sideId) {
    const id = String(sideId || "player");
    if (!this.sides[id]) this.sides[id] = freshSide(this.tickRate);
    return this.sides[id];
  }

  observeLiveStep({
    side = "player",
    dt = 0,
    beforeResources = {},
    afterResources = {},
    beforeWorkforce = 0,
    afterWorkforce = 0,
    beforePopulationClock = 0,
    afterPopulationClock = 0,
    input = {}
  } = {}) {
    const state = this.ensureSide(side);
    const step = Math.max(0, finite(dt, 0));
    if (!state.initialized) {
      state.initialized = true;
      state.resources = cloneResources(beforeResources);
      state.workforce = finite(beforeWorkforce, 0);
      state.populationClock = Math.max(0, finite(beforePopulationClock, 0));
    } else {
      const resourceAdjustment = resourceDelta(beforeResources, state.lastLiveAfterResources || beforeResources);
      if (maxAbsVector(resourceAdjustment) > 1e-10) {
        addResources(state.resources, resourceAdjustment);
        state.externalResourceAdjustments += 1;
      }
      const workforceAdjustment = finite(beforeWorkforce, 0) - finite(state.lastLiveAfterWorkforce, beforeWorkforce);
      if (Math.abs(workforceAdjustment) > 1e-10) {
        state.workforce += workforceAdjustment;
        state.externalWorkforceAdjustments += 1;
      }
    }

    state.liveTime += step;
    state.clock.step(step, ({ dt: fixedDt }) => {
      const rate = calculateIncomeRate({ ...input, workforce: state.workforce });
      applyIncomeTick(state.resources, rate, fixedDt);
      state.populationClock += fixedDt;
      const interval = populationGrowthInterval(livingEconomyBuildingCount(input.buildings || []), side);
      if (state.populationClock + 1e-10 >= interval) {
        state.populationClock = 0;
        state.workforce += 1;
      }
    });

    const projected = projectedResources(state, input);
    const drift = resourceDelta(projected, afterResources);
    const workforceDrift = state.workforce - finite(afterWorkforce, 0);
    const projectedPopulationClock = state.populationClock + state.clock.accumulator;
    const populationClockDrift = projectedPopulationClock - Math.max(0, finite(afterPopulationClock, 0));
    const maxResourceDrift = maxAbsVector(drift);

    state.maxAbsResourceDrift = Math.max(state.maxAbsResourceDrift, maxResourceDrift);
    state.maxAbsWorkforceDrift = Math.max(state.maxAbsWorkforceDrift, Math.abs(workforceDrift));
    state.maxAbsPopulationClockDrift = Math.max(state.maxAbsPopulationClockDrift, Math.abs(populationClockDrift));

    const sample = {
      side: String(side),
      liveTime: state.liveTime,
      fixedTick: state.clock.tick,
      fixedTime: state.clock.simulationTime,
      accumulator: state.clock.accumulator,
      liveResources: cloneResources(afterResources),
      shadowProjectedResources: projected,
      resourceDrift: drift,
      maxAbsResourceDrift: maxResourceDrift,
      liveWorkforce: finite(afterWorkforce, 0),
      shadowWorkforce: state.workforce,
      workforceDrift,
      livePopulationClock: Math.max(0, finite(afterPopulationClock, 0)),
      shadowProjectedPopulationClock: projectedPopulationClock,
      populationClockDrift,
      input: summarizeInput(input)
    };

    state.samples.push(sample);
    while (state.samples.length > this.maxSamples) state.samples.shift();
    state.lastLiveAfterResources = cloneResources(afterResources);
    state.lastLiveAfterWorkforce = finite(afterWorkforce, 0);
    state.lastLiveAfterPopulationClock = Math.max(0, finite(afterPopulationClock, 0));
    return sample;
  }

  sideReport(sideId) {
    const state = this.ensureSide(sideId);
    return {
      initialized: state.initialized,
      tickRate: this.tickRate,
      fixedTick: state.clock.tick,
      liveTime: state.liveTime,
      maxAbsResourceDrift: state.maxAbsResourceDrift,
      maxAbsWorkforceDrift: state.maxAbsWorkforceDrift,
      maxAbsPopulationClockDrift: state.maxAbsPopulationClockDrift,
      strictZeroResourceDrift: state.initialized && state.maxAbsResourceDrift <= this.resourceTolerance,
      externalResourceAdjustments: state.externalResourceAdjustments,
      externalWorkforceAdjustments: state.externalWorkforceAdjustments,
      sampleCount: state.samples.length,
      latest: state.samples.length ? structuredCloneSafe(state.samples[state.samples.length - 1]) : null
    };
  }

  exportReceipt() {
    const sides = Object.fromEntries(Object.keys(this.sides).map(side => [side, this.sideReport(side)]));
    const initialized = Object.values(sides).filter(side => side.initialized);
    return {
      schema: "axm-rts-economy-drift/v1",
      authority: "shadow-only",
      authorityTransferred: false,
      tickRate: this.tickRate,
      resourceTolerance: this.resourceTolerance,
      status: initialized.length ? "measured" : "unmeasured",
      strictZeroResourceDrift: initialized.length > 0 && initialized.every(side => side.strictZeroResourceDrift),
      note: "The shadow runs the shared economy at fixed 20 Hz while the live game remains variable-step. External spends/rewards are mirrored before drift comparison so the receipt isolates economy timing/integration differences rather than player purchases.",
      sides
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
