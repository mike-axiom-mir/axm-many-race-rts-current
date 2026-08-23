import { SKIRMISH_MAP_PACK } from "./skirmishMapPack.js";
import { applyMapVisualPresets } from "./mapVisualPresets.js";

export const MAPS = {
  foundersCrossing: {
    id: "founders-crossing",
    name: "Founder's Crossing",
    description: "A broad green crossing where three old strategic sites turn map control into economic momentum.",
    projection: "flat",
    seed: 20260623,
    recommendedPlayers: 2,
    minPlayers: 2,
    maxPlayers: 2,
    tags: ["2-player", "balanced", "classic", "territory"],
    playerStarts: [[-30, 0, -17], [30, 0, 17]],
    playerStart: [-30, 0, -17],
    enemyStart: [30, 0, 17],
    strategicSites: [
      {
        id: "crossing",
        name: "Founder Stone",
        kind: "monument",
        position: [0, 0, 0],
        radius: 7,
        captureRate: 23,
        bonus: { gold: 1.35 },
        description: "The central crossing. Holding it feeds trade and prestige into the treasury."
      },
      {
        id: "timber-crown",
        name: "Timber Crown",
        kind: "forest",
        position: [-9, 0, 13],
        radius: 6.5,
        captureRate: 25,
        bonus: { wood: 1.15 },
        description: "An old managed grove with prepared timber lanes."
      },
      {
        id: "old-quarry",
        name: "Old Quarry",
        kind: "quarry",
        position: [11, 0, -12],
        radius: 6.5,
        captureRate: 25,
        bonus: { stone: 0.95 },
        description: "Abandoned cuts and stockpiles make stone extraction far easier."
      }
    ]
  },
  ...SKIRMISH_MAP_PACK
};

applyMapVisualPresets(MAPS);

// Preset authoring treats 0° as north/south. Plane strips are x-axis native,
// so convert the built-in preset data once when the registry is constructed.
for (const map of Object.values(MAPS)) {
  for (const paint of map.surfacePaint || []) {
    if (paint.shape === "strip") paint.rotation = Number(paint.rotation || 0) + 90;
  }
}

export const DEFAULT_MAP = MAPS.foundersCrossing;

export function getMapList() {
  return Object.values(MAPS).sort((a, b) =>
    Number(a.recommendedPlayers || 2) - Number(b.recommendedPlayers || 2) || a.name.localeCompare(b.name)
  );
}

export function getMapById(id) {
  return Object.values(MAPS).find(map => map.id === id) || null;
}

export function mapPlayerStarts(map) {
  if (Array.isArray(map?.playerStarts) && map.playerStarts.length) return map.playerStarts.map(point => [...point]);
  const starts = [];
  if (Array.isArray(map?.playerStart)) starts.push([...map.playerStart]);
  if (Array.isArray(map?.enemyStart)) starts.push([...map.enemyStart]);
  return starts;
}
