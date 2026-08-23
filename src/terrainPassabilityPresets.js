function addUnique(collection, object) {
  if (!Array.isArray(collection) || collection.some(item => item?.id === object.id)) return;
  collection.push(object);
}

export function applyTerrainPassabilityPresets(maps = {}) {
  const crown = Object.values(maps).find(map => map?.id === "shattered-crown");
  if (!crown) return maps;

  crown.terrainStamps ||= [];
  crown.surfacePaint ||= [];

  addUnique(crown.terrainStamps, {
    id: "crown-central-escarpment",
    name: "Central Escarpment",
    kind: "hill",
    position: [0, 0, 0],
    radius: 8.5,
    strength: 2.8,
    enabled: true,
    tags: ["visual-terrain", "steep", "terrain-passability"]
  });

  // Preset rotation uses the same north/south authoring convention as the
  // rest of mapVisualPresets.js. maps.js converts strip rotation once when
  // the registry is constructed, so 90° here becomes an east/west cut.
  addUnique(crown.surfacePaint, {
    id: "crown-central-ramp",
    name: "Broken Crown Ramp",
    skin: "ramp",
    position: [0, 0, 0],
    shape: "strip",
    radius: 5,
    length: 19,
    width: 4.4,
    rotation: 90,
    opacity: .54,
    tint: "#ffffff",
    enabled: true,
    tags: ["movement-passage", "ramp", "terrain-passability"]
  });

  return maps;
}
