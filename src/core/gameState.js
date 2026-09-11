const RESOURCE_KEYS = ["food", "wood", "stone", "gold"];

function finite(value, fallback = 0) {
  const number = Number(value);
  return Number.isFinite(number) ? number : fallback;
}

function cloneResources(resources = {}) {
  return Object.fromEntries(RESOURCE_KEYS.map(key => [key, finite(resources[key], 0)]));
}

function cloneEntity(entity = {}) {
  return {
    id: String(entity.id || ""),
    type: String(entity.type || "unknown"),
    owner: entity.owner == null ? null : String(entity.owner),
    factionId: entity.factionId == null ? null : String(entity.factionId),
    hp: finite(entity.hp, 0),
    maxHp: finite(entity.maxHp, finite(entity.hp, 0)),
    x: finite(entity.x, 0),
    y: finite(entity.y, 0),
    z: finite(entity.z, 0),
    tags: Array.isArray(entity.tags) ? [...entity.tags].map(String) : []
  };
}

export function createInitialGameState({ seed = "axm-rts", mode = "skirmish", projection = "flat" } = {}) {
  return {
    version: 1,
    seed: String(seed),
    mode: String(mode),
    projection: projection === "globe" ? "globe" : "flat",
    tick: 0,
    time: 0,
    status: "setup",
    winner: null,
    seats: {},
    entities: {},
    objectives: {},
    variables: {},
    commandLog: []
  };
}

export class CanonicalGameState {
  constructor(initial = {}) {
    this.state = { ...createInitialGameState(initial), ...initial };
    this.state.seats = { ...(initial.seats || {}) };
    this.state.entities = { ...(initial.entities || {}) };
    this.state.objectives = { ...(initial.objectives || {}) };
    this.state.variables = { ...(initial.variables || {}) };
    this.state.commandLog = [...(initial.commandLog || [])];
  }

  setClock({ tick, time } = {}) {
    this.state.tick = Math.max(0, Math.trunc(finite(tick, this.state.tick)));
    this.state.time = Math.max(0, finite(time, this.state.time));
  }

  setStatus(status, winner = null) {
    this.state.status = String(status || "running");
    this.state.winner = winner == null ? null : String(winner);
  }

  upsertSeat(seatId, seat = {}) {
    const id = String(seatId);
    const previous = this.state.seats[id] || {};
    this.state.seats[id] = {
      ...previous,
      ...seat,
      id,
      factionId: seat.factionId ?? previous.factionId ?? null,
      controller: seat.controller ?? previous.controller ?? "unknown",
      age: Math.max(0, Math.trunc(finite(seat.age, previous.age || 0))),
      workforce: Math.max(0, Math.trunc(finite(seat.workforce, previous.workforce || 0))),
      resources: cloneResources(seat.resources || previous.resources || {})
    };
    return this.state.seats[id];
  }

  upsertEntity(entity) {
    const normalized = cloneEntity(entity);
    if (!normalized.id) throw new Error("Canonical entities require a stable id.");
    this.state.entities[normalized.id] = { ...(this.state.entities[normalized.id] || {}), ...normalized };
    return this.state.entities[normalized.id];
  }

  removeEntity(entityId) {
    delete this.state.entities[String(entityId)];
  }

  setObjective(objectiveId, objective = {}) {
    const id = String(objectiveId);
    this.state.objectives[id] = { ...(this.state.objectives[id] || {}), ...objective, id };
  }

  setVariable(key, value) {
    this.state.variables[String(key)] = value;
  }

  recordCommand(command = {}) {
    this.state.commandLog.push({
      tick: this.state.tick,
      type: String(command.type || "unknown"),
      seatId: command.seatId == null ? null : String(command.seatId),
      payload: command.payload == null ? null : structuredCloneSafe(command.payload)
    });
  }

  snapshot({ includeCommands = true } = {}) {
    const snapshot = structuredCloneSafe(this.state);
    if (!includeCommands) snapshot.commandLog = [];
    return snapshot;
  }
}

function structuredCloneSafe(value) {
  if (typeof structuredClone === "function") return structuredClone(value);
  return JSON.parse(JSON.stringify(value));
}

export function createCanonicalGameState(initial = {}) {
  return new CanonicalGameState(initial);
}
