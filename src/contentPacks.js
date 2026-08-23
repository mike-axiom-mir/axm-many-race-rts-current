import { FACTIONS } from "./factions.js";
import { factionNpcFor } from "./factionNpcs.js";
import { applyDefenseRosterExpansion } from "./defenseRosterExpansion.js";

applyDefenseRosterExpansion(FACTIONS);

export const CONTENT_PACK_VERSION = 1;

export function factionPackFrom(factionId) {
  const faction = FACTIONS[factionId];
  if (!faction) return null;
  return {
    schemaVersion: CONTENT_PACK_VERSION,
    kind: "faction-pack",
    id: `faction-pack:${faction.id}`,
    factionId: faction.id,
    name: faction.name,
    symbol: faction.symbol,
    tagline: faction.tagline,
    founder: faction.founder,
    colors: { primary: faction.color, accent: faction.accent, terrain: faction.terrainTint },
    traits: [...faction.traits],
    economy: { ...faction.economy },
    military: { ...faction.military },
    building: { ...faction.building },
    buildings: faction.buildings.map(item => structuredClone(item)),
    units: faction.units.map(item => structuredClone(item)),
    nativeNpc: structuredClone(factionNpcFor(faction.id))
  };
}

export function unitPackFrom(factionId, unitIds = null) {
  const faction = FACTIONS[factionId];
  if (!faction) return null;
  const wanted = unitIds ? new Set(unitIds) : null;
  return {
    schemaVersion: CONTENT_PACK_VERSION,
    kind: "unit-pack",
    id: `unit-pack:${faction.id}:core`,
    name: `${faction.name} Core Units`,
    factionId: faction.id,
    units: faction.units.filter(unit => !wanted || wanted.has(unit.id)).map(unit => structuredClone(unit)),
    source: "builtin-faction"
  };
}

export const BUILTIN_FACTION_PACKS = Object.fromEntries(Object.keys(FACTIONS).map(id => [id, factionPackFrom(id)]));
export const BUILTIN_UNIT_PACKS = Object.fromEntries(Object.keys(FACTIONS).map(id => [id, unitPackFrom(id)]));

export function normalizeUnitPack(input = {}) {
  return {
    schemaVersion: Number(input.schemaVersion || CONTENT_PACK_VERSION),
    kind: "unit-pack",
    id: String(input.id || `unit-pack:custom:${Date.now()}`),
    name: String(input.name || "Custom Unit Pack"),
    factionId: input.factionId || null,
    units: Array.isArray(input.units) ? input.units.map(unit => ({ ...unit })) : [],
    source: input.source || "custom"
  };
}

export function validateUnitPack(input = {}) {
  const pack = normalizeUnitPack(input);
  const errors = [];
  const warnings = [];
  if (!pack.id) errors.push("Unit pack id is required.");
  if (!pack.name) errors.push("Unit pack name is required.");
  if (!pack.units.length) warnings.push("Unit pack contains no units.");
  for (const unit of pack.units) {
    if (!unit.id || !unit.name) warnings.push("Every unit should have an id and name.");
  }
  return { valid: errors.length === 0, errors, warnings, pack };
}
