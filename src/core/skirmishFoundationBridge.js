import { RTSWorld } from "../world.js";
import { normalizeSkirmishCommand } from "./commandSchema.js";
import { skirmishEconomyDriftProbe } from "./economyDriftProbe.js";
import { createEconomyObserver } from "./economyObserver.js";
import { createEntityIdAllocator } from "./entityIdentity.js";
import { readPublicSkirmishState } from "./publicSkirmishState.js";
import { createReplayBridge } from "./replayBridge.js";
import { snapshotFingerprint } from "./runtimeSnapshot.js";

const bridges = new WeakMap();
let lastWorld = null;

function queryObservationSeed() {
  if (typeof location === "undefined") return "axm-rts-observation-v1";
  return new URLSearchParams(location.search).get("seed") || "axm-rts-observation-v1";
}

class SkirmishFoundationBridge {
  constructor(world) {
    this.world = world;
    this.observationSeed = queryObservationSeed();
    this.ids = createEntityIdAllocator({ namespace: "flat" });
    this.replay = createReplayBridge({ seed: this.observationSeed, mode: "skirmish", projection: "flat", tickRate: 20, snapshotEveryTicks: 20 });
    this.economy = createEconomyObserver({ maxSamples: 180 });
    this.latestPublicState = null;
    this.matchSerial = 0;
  }

  resetMatch() {
    this.matchSerial += 1;
    this.ids.reset();
    this.replay.reset();
    this.economy.reset();
    skirmishEconomyDriftProbe.reset();
    this.latestPublicState = null;
  }

  ensureIdentity(entity, faction = null) {
    if (!entity?.userData) return entity;
    this.ids.ensure(entity);
    if (faction?.id && !entity.userData.factionId) entity.userData.factionId = faction.id;
    return entity;
  }

  ensureWorldIdentities() {
    this.ids.ensureWorld(this.world);
  }

  recordObservedCommand(command = {}) {
    const normalized = normalizeSkirmishCommand(command);
    this.replay.recordCommand(normalized);
    return normalized;
  }

  observePublicState() {
    const state = readPublicSkirmishState(this.world);
    this.latestPublicState = state;
    this.economy.observe({ tick: this.replay.clock.tick, time: this.replay.clock.simulationTime, state });
    return state;
  }

  snapshot() {
    this.ensureWorldIdentities();
    const worldSnapshot = this.replay.snapshot(this.world);
    const publicState = this.observePublicState();
    const combined = {
      ...worldSnapshot,
      variables: {
        ...(worldSnapshot.variables || {}),
        snapshotCoverage: "world-entities+public-skirmish-state",
        publicStateAuthoritative: false,
        gameplayRandomness: "native-per-run"
      },
      publicState
    };
    delete combined.fingerprint;
    combined.fingerprint = snapshotFingerprint(combined);
    return Object.freeze(combined);
  }

  exportReplayReceipt() {
    this.ensureWorldIdentities();
    const base = this.replay.exportReceipt(this.world);
    const latestSnapshot = this.snapshot();
    return {
      ...base,
      schema: "axm-rts-replay-observation/v3",
      seed: this.observationSeed,
      coverage: "world-entities+observed-commands+public-skirmish-state+economy-drift",
      warning: "Observer receipt only. Normal gameplay keeps its original native per-run randomness and variable-step authority.",
      randomPolicy: {
        gameplay: "native-per-run",
        globalMathRandomOverride: false,
        observationSeedAffectsGameplay: false,
        note: "Seed metadata is reserved for diagnostics and future explicitly opt-in deterministic modes."
      },
      economyObservation: this.economy.exportReceipt(),
      economyDrift: skirmishEconomyDriftProbe.exportReceipt(),
      latestSnapshotFingerprint: latestSnapshot.fingerprint,
      latestSnapshot
    };
  }
}

function ensureBridge(world) {
  let bridge = bridges.get(world);
  if (!bridge) {
    bridge = new SkirmishFoundationBridge(world);
    bridges.set(world, bridge);
  }
  lastWorld = world;
  return bridge;
}

const previousResetDynamic = RTSWorld.prototype.resetDynamic;
const previousSpawnCapital = RTSWorld.prototype.spawnCapital;
const previousSpawnBuilding = RTSWorld.prototype.spawnBuilding;
const previousSpawnFounder = RTSWorld.prototype.spawnFounder;
const previousSpawnSquad = RTSWorld.prototype.spawnSquad;
const previousRemoveEntity = RTSWorld.prototype.removeEntity;
const previousCommand = RTSWorld.prototype.command;
const previousTick = RTSWorld.prototype.tick;

RTSWorld.prototype.resetDynamic = function foundationResetDynamic(...args) {
  const bridge = ensureBridge(this);
  bridge.resetMatch();
  const result = previousResetDynamic.apply(this, args);
  bridge.ensureWorldIdentities();
  return result;
};

RTSWorld.prototype.spawnCapital = function foundationSpawnCapital(faction, ...args) {
  const entity = previousSpawnCapital.call(this, faction, ...args);
  return ensureBridge(this).ensureIdentity(entity, faction);
};

RTSWorld.prototype.spawnBuilding = function foundationSpawnBuilding(def, faction, ...args) {
  const entity = previousSpawnBuilding.call(this, def, faction, ...args);
  return ensureBridge(this).ensureIdentity(entity, faction);
};

RTSWorld.prototype.spawnFounder = function foundationSpawnFounder(faction, ...args) {
  const entity = previousSpawnFounder.call(this, faction, ...args);
  return ensureBridge(this).ensureIdentity(entity, faction);
};

RTSWorld.prototype.spawnSquad = function foundationSpawnSquad(unitDef, faction, ...args) {
  const entity = previousSpawnSquad.call(this, unitDef, faction, ...args);
  return ensureBridge(this).ensureIdentity(entity, faction);
};

RTSWorld.prototype.removeEntity = function foundationRemoveEntity(entity, ...args) {
  ensureBridge(this).ensureIdentity(entity);
  return previousRemoveEntity.call(this, entity, ...args);
};

RTSWorld.prototype.command = function foundationCommand(owner, point, ...args) {
  const bridge = ensureBridge(this);
  bridge.recordObservedCommand({
    type: "formation-order",
    seatId: owner,
    payload: { x: Number(point?.x || 0), y: Number(point?.y || 0), z: Number(point?.z || 0) }
  });
  return previousCommand.call(this, owner, point, ...args);
};

RTSWorld.prototype.tick = function foundationObservedTick(time, dt, ...args) {
  const result = previousTick.call(this, time, dt, ...args);
  const bridge = ensureBridge(this);
  const previousSecond = Math.floor(bridge.replay.clock.tick / bridge.replay.tickRate);
  bridge.ensureWorldIdentities();
  bridge.replay.observeFrame(dt, this);
  const nextSecond = Math.floor(bridge.replay.clock.tick / bridge.replay.tickRate);
  if (nextSecond !== previousSecond) bridge.observePublicState();
  return result;
};

function publicBridge() {
  const bridge = lastWorld ? ensureBridge(lastWorld) : null;
  return {
    version: 3,
    authority: "observer-only",
    randomPolicy: "native-per-run",
    observationSeed: bridge?.observationSeed || queryObservationSeed(),
    world: lastWorld,
    readPublicState: () => bridge?.observePublicState() || null,
    snapshot: () => bridge?.snapshot() || null,
    economyDrift: () => skirmishEconomyDriftProbe.exportReceipt(),
    recordObservedCommand: command => bridge?.recordObservedCommand(command) || null,
    exportReplayReceipt: () => bridge?.exportReplayReceipt() || null,
    diagnostics: () => bridge ? {
      observationSeed: bridge.observationSeed,
      observationSeedAffectsGameplay: false,
      globalMathRandomOverride: false,
      gameplayRandomness: "native-per-run",
      matchSerial: bridge.matchSerial,
      tick: bridge.replay.clock.tick,
      economySamples: bridge.economy.samples.length,
      economyDrift: skirmishEconomyDriftProbe.exportReceipt(),
      entityCount: bridge.world?.entities?.length || 0
    } : null
  };
}

if (typeof window !== "undefined") {
  Object.defineProperty(window, "__AXM_RTS_SKIRMISH_BRIDGE__", { configurable: true, get: publicBridge });
}
