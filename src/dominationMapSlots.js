import { normalizeMapDefinition } from "./mapSchema.js";
import { territoryDefinition } from "./dominationWorld.js";

export const DOMINATION_MAP_SLOT_KEY = "axm.manyRaceRts.worldDomination.mapSlots.v1";

export function loadDominationMapSlots() {
  try {
    return JSON.parse(localStorage.getItem(DOMINATION_MAP_SLOT_KEY) || "{}") || {};
  } catch {
    return {};
  }
}

export function saveDominationMapSlots(slots) {
  localStorage.setItem(DOMINATION_MAP_SLOT_KEY, JSON.stringify(slots || {}));
  return slots;
}

export function mapSlotForTerritory(territoryId) {
  const custom = loadDominationMapSlots()[territoryId];
  if (custom) return custom;
  const builtin = territoryDefinition(territoryId)?.mapRef;
  return builtin ? { ...builtin, source: "builtin" } : null;
}

export function attachMapToTerritory(territoryId, input) {
  const map = normalizeMapDefinition(input);
  const slots = loadDominationMapSlots();
  slots[territoryId] = {
    kind: "embedded-map",
    source: "custom",
    id: map.id,
    name: map.name,
    projection: map.projection,
    embedded: map,
    attachedAt: Date.now()
  };
  saveDominationMapSlots(slots);
  return slots[territoryId];
}

export function clearTerritoryMapSlot(territoryId) {
  const slots = loadDominationMapSlots();
  delete slots[territoryId];
  saveDominationMapSlots(slots);
}
