import { createSimulationClock } from "./simulationClock.js";
import { createWorldSnapshot } from "./runtimeSnapshot.js";

function clone(value) {
  if (typeof structuredClone === "function") return structuredClone(value);
  return JSON.parse(JSON.stringify(value));
}

export class ReplayBridge {
  constructor({ seed = "axm-rts", mode = "skirmish", projection = "flat", tickRate = 20, snapshotEveryTicks = 20 } = {}) {
    this.seed = String(seed);
    this.mode = String(mode);
    this.projection = projection === "globe" ? "globe" : "flat";
    this.tickRate = Math.max(1, Number(tickRate) || 20);
    this.snapshotEveryTicks = Math.max(1, Math.trunc(Number(snapshotEveryTicks) || this.tickRate));
    this.clock = createSimulationClock({ tickRate: this.tickRate, maxCatchUpTicks: 8 });
    this.reset();
  }

  reset() {
    this.clock.reset();
    this.commands = [];
    this.checkpoints = [];
    this.latestWorld = null;
  }

  recordCommand(command = {}) {
    this.commands.push({
      tick: this.clock.tick,
      time: this.clock.simulationTime,
      type: String(command.type || "command"),
      seatId: command.seatId == null ? null : String(command.seatId),
      payload: command.payload == null ? null : clone(command.payload)
    });
  }

  observeFrame(realDt, world) {
    this.latestWorld = world || this.latestWorld;
    return this.clock.step(realDt, ({ tick, time }) => {
      if (!this.latestWorld || tick % this.snapshotEveryTicks !== 0) return;
      const snapshot = this.snapshot(this.latestWorld, { tick, time });
      this.checkpoints.push({ tick, time, fingerprint: snapshot.fingerprint, entityCount: Object.keys(snapshot.entities || {}).length });
      if (this.checkpoints.length > 120) this.checkpoints.shift();
    });
  }

  snapshot(world = this.latestWorld, override = {}) {
    return createWorldSnapshot(world, {
      seed: this.seed,
      mode: this.mode,
      projection: this.projection,
      tick: override.tick ?? this.clock.tick,
      time: override.time ?? this.clock.simulationTime,
      commands: this.commands
    });
  }

  exportReceipt(world = this.latestWorld) {
    const snapshot = this.snapshot(world);
    return {
      schema: "axm-rts-replay-observation/v1",
      seed: this.seed,
      mode: this.mode,
      projection: this.projection,
      tickRate: this.tickRate,
      tick: this.clock.tick,
      time: this.clock.simulationTime,
      authoritative: false,
      coverage: "world-entities-and-world-commands-only",
      warning: "This is an observation/replay bridge, not an authoritative replay. Economy/UI closure state and variable-step simulation authority have not migrated yet.",
      commandCount: this.commands.length,
      commands: clone(this.commands),
      checkpoints: clone(this.checkpoints),
      latestSnapshotFingerprint: snapshot.fingerprint,
      latestSnapshot: snapshot
    };
  }
}

export function createReplayBridge(options = {}) {
  return new ReplayBridge(options);
}
