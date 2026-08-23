export const CURRENT_MAX_SEATS = 4;
export const FUTURE_LOBBY_CAPACITIES = [8, 12];

export const CONTROLLER_TYPES = [
  {
    id: "human",
    name: "Human",
    description: "A normal player seat with the same battlefield information rules as every other seat."
  },
  {
    id: "faction-ai",
    name: "Faction AI",
    description: "Uses the selected faction's native in-game NPC brain and strategic identity."
  },
  {
    id: "connected-ai",
    name: "Connected AI",
    description: "External/local AI occupies a normal player-side seat. It receives player-visible state only; no hidden-info advantage."
  },
  {
    id: "closed",
    name: "Closed",
    description: "Seat is disabled for this match."
  }
];

export function createSeat(index, overrides = {}) {
  const defaults = [
    { controller: "human", label: "Player 1", team: 1 },
    { controller: "faction-ai", label: "Faction AI 2", team: 2 },
    { controller: "faction-ai", label: "Faction AI 3", team: 3 },
    { controller: "faction-ai", label: "Faction AI 4", team: 4 }
  ][index] || { controller: "closed", label: `Seat ${index + 1}`, team: index + 1 };

  return {
    id: `seat-${index + 1}`,
    slot: index + 1,
    controller: defaults.controller,
    label: defaults.label,
    factionId: null,
    team: defaults.team,
    ready: defaults.controller !== "human",
    connectedAI: {
      bridge: "unbound",
      displayName: "Connected AI",
      sessionRef: null,
      sameInformationGate: true
    },
    ...overrides,
    connectedAI: {
      bridge: "unbound",
      displayName: "Connected AI",
      sessionRef: null,
      sameInformationGate: true,
      ...(overrides.connectedAI || {})
    }
  };
}

export function createDefaultLobby() {
  return {
    schemaVersion: 1,
    mode: "skirmish",
    mapId: "founders-crossing",
    projection: "flat",
    maxSeats: CURRENT_MAX_SEATS,
    mapSeatLimit: CURRENT_MAX_SEATS,
    gameSpeed: "normal",
    startingAge: 0,
    revealMap: false,
    sharedTeamVision: true,
    victory: "capital",
    resources: "standard",
    seed: Math.floor(Math.random() * 99999999),
    seats: Array.from({ length: CURRENT_MAX_SEATS }, (_, index) => createSeat(index))
  };
}

export function normalizeLobby(input = {}) {
  const base = createDefaultLobby();
  const seats = Array.from({ length: CURRENT_MAX_SEATS }, (_, index) => createSeat(index, input.seats?.[index] || {}));
  return {
    ...base,
    ...input,
    maxSeats: CURRENT_MAX_SEATS,
    seats
  };
}

export function activeSeats(lobby) {
  return normalizeLobby(lobby).seats.filter(seat => seat.controller !== "closed");
}

export function validateLobby(lobby) {
  const normalized = normalizeLobby(lobby);
  const active = activeSeats(normalized);
  const errors = [];
  const warnings = [];

  if (active.length < 1) errors.push("At least one active seat is required.");
  if (active.length > CURRENT_MAX_SEATS) errors.push(`Current runtime shell supports at most ${CURRENT_MAX_SEATS} seats.`);
  if (active.length === 1) warnings.push("One-seat mode is useful for sandbox/testing, but there is no opposing seat unless the battle map spawns one.");
  if (new Set(active.map(seat => seat.team)).size < 2 && active.length > 1) warnings.push("All active seats are on the same team.");

  for (const seat of active) {
    if (!seat.factionId) warnings.push(`${seat.label || seat.id} has no faction selected yet.`);
    if (seat.controller === "connected-ai" && !seat.connectedAI?.sameInformationGate) {
      errors.push(`${seat.label || seat.id}: Connected AI seats must use the normal player information gate.`);
    }
  }

  return { valid: errors.length === 0, errors, warnings, lobby: normalized };
}

export function saveLobby(lobby) {
  const normalized = normalizeLobby(lobby);
  localStorage.setItem("axm.manyRaceRts.lobby", JSON.stringify(normalized));
  return normalized;
}

export function loadLobby() {
  try {
    const raw = localStorage.getItem("axm.manyRaceRts.lobby");
    return raw ? normalizeLobby(JSON.parse(raw)) : createDefaultLobby();
  } catch {
    return createDefaultLobby();
  }
}
