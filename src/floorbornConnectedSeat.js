import { normalizeSkirmishCommand } from "./core/commandSchema.js";

export const FLOORBORN_SEAT_CAPABILITY_SCHEMA = "axm.rts.floorborn-connected-seat-capability/v0.1";
export const FLOORBORN_SEAT_CAPABILITY_ID = "axm.rts.floorborn-connected-seat";
export const FLOORBORN_SEAT_REQUEST_SCHEMA = "axm.rts.floorborn-connected-seat-request/v0.1";
export const FLOORBORN_SEAT_RECEIPT_SCHEMA = "axm.rts.floorborn-connected-seat-receipt/v0.1";
export const FLOORBORN_OBSERVATION_PROTOCOL = "axm.player.rts.v0.1";
export const FLOORBORN_PROCESS_REQUEST_SCHEMA = "axm.floorborn.process-request/v0.1";
export const FLOORBORN_PROCESS_RESPONSE_SCHEMA = "axm.floorborn.process-response/v0.1";
export const FLOORBORN_PROCESS_RECEIPT_SCHEMA = "axm.floorborn.process-receipt/v0.1";
export const FLOORBORN_CAPABILITY_ID = "axm.floorborn.bounded-player-process";

const MAX_LEGAL_COMMANDS = 64;
const OWNER_BY_SEAT = Object.freeze({ "seat-1": "player", "seat-2": "enemy", "seat-3": "seat-3", "seat-4": "seat-4" });
const PROVIDER_AUTHORITY = Object.freeze({
  automaticSelection: false,
  canon: false,
  execution: false,
  gameMutation: false,
  merge: false,
  publication: false
});
const CONSUMER_AUTHORITY = Object.freeze({
  automaticProviderSelection: false,
  canon: false,
  commandExecution: false,
  gameMutation: false,
  merge: false,
  publication: false
});

export function describeFloorbornConnectedSeat() {
  return stableClone({
    schema: FLOORBORN_SEAT_CAPABILITY_SCHEMA,
    id: FLOORBORN_SEAT_CAPABILITY_ID,
    status: "EXPERIMENTAL",
    purpose: "Translate player-visible Many-Race RTS state into one bounded Floorborn decision and return an admitted ordinary-seat command candidate.",
    provider: {
      capabilityId: FLOORBORN_CAPABILITY_ID,
      playerProtocol: FLOORBORN_OBSERVATION_PROTOCOL,
      processRequestSchema: FLOORBORN_PROCESS_REQUEST_SCHEMA,
      processResponseSchema: FLOORBORN_PROCESS_RESPONSE_SCHEMA
    },
    boundary: {
      observation: "CALLER_SUPPLIES_PHASE34_PUBLIC_STATE",
      legalCommands: "CALLER_SUPPLIES_ORDINARY_CONNECTED_SEAT_MOVE_COMMANDS",
      providerResult: "CONTENT_VERIFIED_EXACT_LEGAL_CANDIDATE_ONLY",
      application: "CALLER_MUST_EXPLICITLY_USE_EXISTING_CONNECTED_AI_PLAYER_DOOR"
    },
    runtime: { dependencies: 0, network: false, account: false, aiModel: false },
    authority: CONSUMER_AUTHORITY
  });
}

export function validateFloorbornProviderDescriptor(descriptor) {
  assertPlainObject(descriptor, "provider descriptor");
  if (descriptor.id !== FLOORBORN_CAPABILITY_ID) throw new Error("unexpected Floorborn capability id");
  if (descriptor.schema !== "axm.floorborn.capability/v0.1") throw new Error("unsupported Floorborn capability schema");
  if (!descriptor.playerProtocols?.includes(FLOORBORN_OBSERVATION_PROTOCOL)) {
    throw new Error("Floorborn provider does not declare axm.player.rts.v0.1");
  }
  if (descriptor.process?.requestSchema !== FLOORBORN_PROCESS_REQUEST_SCHEMA ||
      descriptor.process?.responseSchema !== FLOORBORN_PROCESS_RESPONSE_SCHEMA ||
      descriptor.process?.receiptSchema !== FLOORBORN_PROCESS_RECEIPT_SCHEMA) {
    throw new Error("Floorborn provider process schemas are incompatible");
  }
  if (descriptor.runtime?.network !== false || descriptor.runtime?.account !== false || descriptor.runtime?.aiModel !== false) {
    throw new Error("Floorborn provider is not declared local/offline/model-free");
  }
  assertExactBooleanRecord(descriptor.authority, PROVIDER_AUTHORITY, "provider authority");
  return true;
}

export function createFloorbornSeatObservation(input) {
  assertPlainObject(input, "connected-seat request");
  assertExactKeys(input, ["schema", "sessionId", "turn", "seatId", "ownerId", "playerId", "lineageId", "publicState", "legalCommands", "playerSnapshot"]);
  if (input.schema !== FLOORBORN_SEAT_REQUEST_SCHEMA) throw new Error("unsupported connected-seat request schema");
  assertNonEmptyString(input.sessionId, "sessionId");
  assertNonEmptyString(input.seatId, "seatId");
  assertNonEmptyString(input.ownerId, "ownerId");
  assertNonEmptyString(input.playerId, "playerId");
  if (OWNER_BY_SEAT[input.seatId] !== input.ownerId) throw new Error("seatId and ownerId do not identify the same RTS player seat");
  if (!Number.isInteger(input.turn) || input.turn < 0) throw new Error("turn must be a non-negative integer");
  validatePublicState(input.publicState, input.ownerId);
  if (!Array.isArray(input.legalCommands) || input.legalCommands.length === 0) {
    throw new Error("legalCommands must be a non-empty array");
  }
  if (input.legalCommands.length > MAX_LEGAL_COMMANDS) throw new Error(`legalCommands exceeds ${MAX_LEGAL_COMMANDS}`);

  const actionIds = new Set();
  const legalActions = input.legalCommands.map(command => {
    const normalized = normalizeConnectedSeatMove(command, input.seatId, input.ownerId);
    if (actionIds.has(normalized.id)) throw new Error(`duplicate legal command id: ${normalized.id}`);
    actionIds.add(normalized.id);
    return {
      id: normalized.id,
      kind: "command",
      target: normalized.target,
      affordanceTags: normalized.affordanceTags,
      command: normalized.command
    };
  });

  return deepFreeze(stableClone({
    protocol: FLOORBORN_OBSERVATION_PROTOCOL,
    sessionId: input.sessionId,
    turn: input.turn,
    self: { playerId: input.playerId, seatId: input.seatId, ownerId: input.ownerId },
    place: { id: `many-race-rts:${input.publicState.status}`, known: true },
    game: {
      id: "axm-many-race-rts-current",
      mode: "skirmish",
      projection: "flat",
      publicState: input.publicState
    },
    legalActions
  }));
}

export function createFloorbornDecideRequest(input, observation = createFloorbornSeatObservation(input)) {
  const request = {
    schema: FLOORBORN_PROCESS_REQUEST_SCHEMA,
    operation: "decide",
    observation
  };
  if (input.playerSnapshot != null) {
    if (input.lineageId != null) throw new Error("continued decide accepts playerSnapshot without lineageId");
    request.playerSnapshot = stableClone(input.playerSnapshot);
  } else {
    assertNonEmptyString(input.lineageId, "lineageId");
    request.player = { playerId: input.playerId, lineageId: input.lineageId };
  }
  return deepFreeze(stableClone(request));
}

export function admitFloorbornDecision({ response, observation, integrityVerified }) {
  if (integrityVerified !== true) throw new Error("Floorborn response integrity must be verified before admission");
  assertPlainObject(response, "Floorborn response");
  assertExactKeys(response, ["schema", "ok", "operation", "action", "decision", "playerSnapshot", "authority", "receipt"]);
  if (response.schema !== FLOORBORN_PROCESS_RESPONSE_SCHEMA || response.ok !== true || response.operation !== "decide") {
    throw new Error("Floorborn response is not a successful decide response");
  }
  assertExactBooleanRecord(response.authority, PROVIDER_AUTHORITY, "provider response authority");
  if (response.receipt?.schema !== FLOORBORN_PROCESS_RECEIPT_SCHEMA ||
      response.receipt?.authority !== "CONTENT_INTEGRITY_ONLY_NO_EXECUTION_NO_MERGE_NO_CANON" ||
      !/^[0-9a-f]{64}$/.test(String(response.receipt?.sha256 || ""))) {
    throw new Error("Floorborn response receipt is incompatible");
  }
  if (response.playerSnapshot?.playerId !== observation.self.playerId) {
    throw new Error("Floorborn snapshot identity does not match the connected seat player");
  }
  if (response.decision?.selectedActionId !== response.action?.id) {
    throw new Error("Floorborn decision evidence does not match the returned action");
  }
  const legal = observation?.legalActions?.find(action => action.id === response.action?.id);
  if (!legal || stableStringify(legal) !== stableStringify(response.action)) {
    throw new Error("Floorborn action is not an exact declared legal action");
  }
  const command = legal.command;
  validateAdmittedCommand(command, observation.self.seatId, observation.self.ownerId);

  return deepFreeze(stableClone({
    schema: FLOORBORN_SEAT_RECEIPT_SCHEMA,
    status: "READY",
    candidate: command,
    playerSnapshot: response.playerSnapshot,
    providerReceipt: response.receipt,
    authority: CONSUMER_AUTHORITY
  }));
}

function normalizeConnectedSeatMove(value, seatId, ownerId) {
  assertPlainObject(value, "legal command");
  assertExactKeys(value, ["id", "type", "point", "target", "affordanceTags"]);
  assertNonEmptyString(value.id, "legal command id");
  if (value.type !== "move") throw new Error("only ordinary connected-seat move commands are supported in v0.1");
  if (!Array.isArray(value.point) || value.point.length !== 3 || value.point.some(item => !Number.isFinite(item))) {
    throw new Error("move command point must contain three finite numbers");
  }
  const tags = value.affordanceTags ?? [];
  if (!Array.isArray(tags) || tags.some(tag => typeof tag !== "string" || !tag.trim())) {
    throw new Error("affordanceTags must contain non-empty strings");
  }
  if (new Set(tags).size !== tags.length) throw new Error("affordanceTags must be unique");
  const point = value.point.map(Number);
  const observedCommand = normalizeSkirmishCommand({
    type: "formation-order",
    seatId: ownerId,
    payload: { x: point[0], y: point[1], z: point[2] }
  });
  return {
    id: value.id,
    target: String(value.target || `${point[0]},${point[1]},${point[2]}`),
    affordanceTags: [...tags],
    command: {
      schema: "axm-rts-connected-seat-command/v1",
      seatId,
      type: "move",
      point,
      observedCommand
    }
  };
}

function validatePublicState(value, ownerId) {
  assertPlainObject(value, "publicState");
  if (value.schema !== "axm-rts-public-skirmish-state/v1") throw new Error("unsupported public Skirmish state schema");
  if (value.authoritative !== false || value.source !== "public-runtime-readback") {
    throw new Error("publicState must come from the Phase 34 public runtime readback");
  }
  if (value.status !== "running") throw new Error("publicState must describe a running Skirmish");
  if (!value.seats || typeof value.seats !== "object" || !value.seats[ownerId]) {
    throw new Error(`publicState does not contain owner ${ownerId}`);
  }
  if (value.seats[ownerId].id !== ownerId) throw new Error("publicState seat identity does not match ownerId");
}

function validateAdmittedCommand(command, seatId, ownerId) {
  assertPlainObject(command, "admitted command");
  if (command.schema !== "axm-rts-connected-seat-command/v1" || command.seatId !== seatId || command.type !== "move") {
    throw new Error("Floorborn command does not target the declared ordinary player seat");
  }
  if (!Array.isArray(command.point) || command.point.length !== 3 || command.point.some(item => !Number.isFinite(item))) {
    throw new Error("admitted move point is invalid");
  }
  const expected = normalizeSkirmishCommand({
    type: "formation-order",
    seatId: ownerId,
    payload: { x: command.point[0], y: command.point[1], z: command.point[2] }
  });
  if (stableStringify(expected) !== stableStringify(command.observedCommand)) {
    throw new Error("admitted command does not match the Phase 34 command contract");
  }
}

function assertExactBooleanRecord(actual, expected, label) {
  assertPlainObject(actual, label);
  if (stableStringify(actual) !== stableStringify(expected)) throw new Error(`${label} is incompatible`);
}

function assertPlainObject(value, label) {
  if (!value || typeof value !== "object" || Array.isArray(value)) throw new TypeError(`${label} must be an object`);
}

function assertNonEmptyString(value, label) {
  if (typeof value !== "string" || !value.trim()) throw new Error(`${label} must be a non-empty string`);
}

function assertExactKeys(value, allowedKeys) {
  const allowed = new Set(allowedKeys);
  for (const key of Object.keys(value)) if (!allowed.has(key)) throw new Error(`unexpected field: ${key}`);
}

export function stableClone(value) {
  if (Array.isArray(value)) return value.map(stableClone);
  if (value && typeof value === "object") {
    return Object.fromEntries(Object.keys(value).sort().map(key => [key, stableClone(value[key])]));
  }
  return value;
}

export function stableStringify(value) {
  return JSON.stringify(stableClone(value));
}

function deepFreeze(value) {
  if (!value || typeof value !== "object" || Object.isFrozen(value)) return value;
  Object.freeze(value);
  for (const child of Object.values(value)) deepFreeze(child);
  return value;
}
