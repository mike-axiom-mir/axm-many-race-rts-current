import { createDefaultLobby, normalizeLobby } from "./seatControllers.js";

export const BATTLE_MAP_VERSION = 1;

export function createBlankBattleMap() {
  const lobby = createDefaultLobby();
  return {
    schemaVersion: BATTLE_MAP_VERSION,
    kind: "battle-map",
    id: "new-battle-map",
    name: "New Battle Map",
    subtitle: "Premade battle challenge",
    description: "A handcrafted battle situation built on top of a reusable map.",
    author: "",
    tags: [],
    difficulty: "normal",
    map: {
      source: "builtin",
      mapId: "founders-crossing",
      projection: "flat",
      embedded: null
    },
    lobby: {
      ...lobby,
      mode: "battle-map"
    },
    contentPacks: {
      factionPacks: [],
      unitPacks: []
    },
    scene: {
      timeOfDay: "day",
      weather: "clear",
      ambience: "default",
      cameraFocus: null,
      introText: "",
      victoryText: "",
      defeatText: ""
    },
    startingForces: [],
    objectives: [
      { id: "primary-1", type: "primary", text: "Defeat the opposing force.", complete: false, hidden: false }
    ],
    rules: [],
    modifiers: {
      buildMode: "normal",
      economyMode: "normal",
      ageLock: null,
      fogMode: "normal",
      reinforcements: "normal"
    },
    campaignMeta: {
      collectionId: null,
      order: 0,
      nextBattleMapId: null,
      unlocks: []
    }
  };
}

export function normalizeBattleMap(input = {}) {
  const base = createBlankBattleMap();
  return {
    ...base,
    ...input,
    schemaVersion: Number(input.schemaVersion || BATTLE_MAP_VERSION),
    kind: "battle-map",
    tags: Array.isArray(input.tags) ? [...new Set(input.tags.map(String).filter(Boolean))] : [],
    map: { ...base.map, ...(input.map || {}) },
    lobby: normalizeLobby({ ...base.lobby, ...(input.lobby || {}), mode: "battle-map" }),
    contentPacks: {
      factionPacks: Array.isArray(input.contentPacks?.factionPacks) ? input.contentPacks.factionPacks.map(item => structuredClone(item)) : [],
      unitPacks: Array.isArray(input.contentPacks?.unitPacks) ? input.contentPacks.unitPacks.map(item => structuredClone(item)) : []
    },
    scene: { ...base.scene, ...(input.scene || {}) },
    startingForces: Array.isArray(input.startingForces) ? input.startingForces.map(force => ({ ...force })) : [],
    objectives: Array.isArray(input.objectives) ? input.objectives.map(objective => ({ ...objective })) : [],
    rules: Array.isArray(input.rules) ? input.rules.map(rule => structuredClone(rule)) : [],
    modifiers: { ...base.modifiers, ...(input.modifiers || {}) },
    campaignMeta: { ...base.campaignMeta, ...(input.campaignMeta || {}) }
  };
}

export function validateBattleMap(input = {}) {
  const battle = normalizeBattleMap(input);
  const errors = [];
  const warnings = [];
  if (!battle.id.trim()) errors.push("Battle Map id is required.");
  if (!battle.name.trim()) errors.push("Battle Map name is required.");
  if (!battle.map.mapId && !battle.map.embedded) errors.push("Battle Map must reference or embed a world map.");
  const activeSeats = battle.lobby.seats.filter(seat => seat.controller !== "closed");
  if (!activeSeats.length) errors.push("At least one active seat is required.");
  if (!battle.objectives.length) warnings.push("Battle Map has no authored objectives.");
  if (!battle.startingForces.length) warnings.push("No explicit starting forces are staged; runtime defaults will be used.");
  if (battle.map.projection === "globe" && battle.map.source === "builtin" && battle.map.mapId !== "crownworld") warnings.push("Unknown built-in globe map reference.");
  return { valid: errors.length === 0, errors, warnings, battle };
}

export function exportBattleMapJSON(input) {
  return JSON.stringify(normalizeBattleMap(input), null, 2);
}
