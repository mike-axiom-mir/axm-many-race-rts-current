import { RTSWorld } from "../world.js";
import { createEntityIdAllocator } from "./entityIdentity.js";
import { createReplayBridge } from "./replayBridge.js";
import { createSeededRng } from "./seededRng.js";

const originalMathRandom = Math.random.bind(Math);
const bridges = new WeakMap();
let activeBridge = null;
let lastWorld = null;

function querySeed() {
  if (typeof location === "undefined") return "axm-rts-skirmish-v1";
  return new URLSearchParams(location.search).get("seed") || "axm-rts-skirmish-v1";
}

class SkirmishFoundationBridge {
  constructor(world) {
    this.world = world;
    this.seed = querySeed();
    this.ids = createEntityIdAllocator({ namespace: "flat" });
    this.legacyRng = createSeededRng(this.seed, "legacy-math-random");
    this.replay = createReplayBridge({ seed: this.seed, mode: "skirmish", projection: "flat", tickRate: 20, snapshotEveryTicks: 20 });
    this.legacyRandomCalls = 0;
    this.matchSerial = 0;
  }

  resetMatch() {
    this.matchSerial += 1;
    this.ids.reset();
    this.legacyRng.reset(this.seed, "legacy-math-random");
    this.legacyRandomCalls = 0;
    this.replay.reset();
    this.installLegacyRandomBridge();
  }

  installLegacyRandomBridge() {
    activeBridge = this;
    Math.random = () => {
      const bridge = activeBridge;
      if (!bridge) return originalMathRandom();
      bridge.legacyRandomCalls += 1;
      return bridge.legacyRng.next();
    };
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

  snapshot() {
    this.ensureWorldIdentities();
    return this.replay.snapshot(this.world);
  }

  exportReplayReceipt() {
    this.ensureWorldIdentities();
    return {
      ...this.replay.exportReceipt(this.world),
      migration: {
        legacyMathRandomShim: true,
        legacyRandomCalls: this.legacyRandomCalls,
        note: "Math.random is seeded only as a temporary compatibility bridge. Gameplay call sites still need explicit stream migration before deterministic authority is claimed."
      }
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
  activeBridge = bridge;
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
  bridge.replay.recordCommand({
    type: "formation-order",
    seatId: owner,
    payload: { x: Number(point?.x || 0), y: Number(point?.y || 0), z: Number(point?.z || 0) }
  });
  return previousCommand.call(this, owner, point, ...args);
};

RTSWorld.prototype.tick = function foundationObservedTick(time, dt, ...args) {
  const result = previousTick.call(this, time, dt, ...args);
  const bridge = ensureBridge(this);
  bridge.ensureWorldIdentities();
  bridge.replay.observeFrame(dt, this);
  return result;
};

function publicBridge() {
  const bridge = lastWorld ? ensureBridge(lastWorld) : null;
  return {
    version: 1,
    authority: "observer-only",
    seed: bridge?.seed || querySeed(),
    world: lastWorld,
    snapshot: () => bridge?.snapshot() || null,
    exportReplayReceipt: () => bridge?.exportReplayReceipt() || null,
    diagnostics: () => bridge ? {
      seed: bridge.seed,
      matchSerial: bridge.matchSerial,
      tick: bridge.replay.clock.tick,
      legacyRandomCalls: bridge.legacyRandomCalls,
      entityCount: bridge.world?.entities?.length || 0
    } : null
  };
}

if (typeof window !== "undefined") {
  Object.defineProperty(window, "__AXM_RTS_SKIRMISH_BRIDGE__", { configurable: true, get: publicBridge });
  window.addEventListener("beforeunload", () => {
    activeBridge = null;
    Math.random = originalMathRandom;
  }, { once: true });
}
