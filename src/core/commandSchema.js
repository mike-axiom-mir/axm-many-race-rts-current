const KNOWN_TYPES = new Set([
  "formation-order",
  "economy-allocation",
  "build-intent",
  "train-intent",
  "research-intent",
  "advance-age-intent"
]);

function finite(value, fallback = 0) {
  const number = Number(value);
  return Number.isFinite(number) ? number : fallback;
}

function text(value, fallback = "") {
  const result = String(value ?? fallback).trim();
  return result || fallback;
}

function pointPayload(payload = {}) {
  return {
    x: finite(payload.x, 0),
    y: finite(payload.y, 0),
    z: finite(payload.z, 0)
  };
}

function allocationPayload(payload = {}) {
  const values = {};
  const source = payload.values || payload.allocation || {};
  for (const key of ["food", "wood", "stone", "gold"]) {
    values[key] = Math.max(0, finite(source[key], 0));
  }
  const total = Object.values(values).reduce((sum, value) => sum + value, 0) || 1;
  return {
    values,
    shares: Object.fromEntries(Object.entries(values).map(([key, value]) => [key, value / total]))
  };
}

export const SKIRMISH_COMMAND_TYPES = Object.freeze([...KNOWN_TYPES]);

export function normalizeSkirmishCommand(command = {}) {
  const type = text(command.type, "unknown");
  if (!KNOWN_TYPES.has(type)) throw new Error(`Unsupported observed Skirmish command: ${type}`);

  const seatId = command.seatId == null ? "player" : text(command.seatId, "player");
  const payload = command.payload || {};
  let normalizedPayload;

  switch (type) {
    case "formation-order":
      normalizedPayload = pointPayload(payload);
      break;
    case "economy-allocation":
      normalizedPayload = allocationPayload(payload);
      break;
    case "build-intent":
      normalizedPayload = { buildingId: text(payload.buildingId, "unknown") };
      break;
    case "train-intent":
      normalizedPayload = { unitId: text(payload.unitId, "unknown") };
      break;
    case "research-intent":
      normalizedPayload = {
        upgradeId: text(payload.upgradeId, "unknown"),
        nextLevel: Math.max(1, Math.trunc(finite(payload.nextLevel, 1)))
      };
      break;
    case "advance-age-intent":
      normalizedPayload = {
        targetAge: Math.max(0, Math.trunc(finite(payload.targetAge, 0))),
        ageName: text(payload.ageName, "")
      };
      break;
    default:
      normalizedPayload = {};
  }

  return Object.freeze({
    schema: "axm-rts-observed-command/v1",
    type,
    seatId,
    payload: Object.freeze(normalizedPayload)
  });
}

export function isKnownSkirmishCommandType(type) {
  return KNOWN_TYPES.has(String(type || ""));
}
