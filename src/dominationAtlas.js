import { ATLAS_TYPES, registerAtlasEntries } from "./atlasRegistry.js";
import { DOMINATION_TERRITORIES } from "./dominationWorld.js";

if (!ATLAS_TYPES.some(type => type.id === "territory")) {
  const mapIndex = ATLAS_TYPES.findIndex(type => type.id === "map");
  ATLAS_TYPES.splice(mapIndex < 0 ? ATLAS_TYPES.length : mapIndex, 0, { id: "territory", label: "World territories", icon: "◉" });
}

registerAtlasEntries([
  {
    id: "mode:world-domination",
    type: "mode",
    name: "World Domination",
    icon: "◉",
    subtitle: "Persistent 1v1–4v4 real-time clan territory war",
    summary: "A strategic globe above individual RTS maps. Clans contest neighboring territories using only formations physically stationed on the source map while every other owned territory continues its economy.",
    tags: ["persistent", "territory", "clan", "realtime", "1v1", "4v4", "cities", "economy"],
    stats: { territories: DOMINATION_TERRITORIES.length, "max clan seats": 4, "reserve step": "1 per 4 paid local productions" },
    sections: [
      { title: "Geographic rule", body: "A clan may only contest a territory directly connected to one it already controls. Expedition formations are removed from that source territory when committed." },
      { title: "Economy rule", body: "Each territory owns a local treasury. Automatic formation production pays real faction unit costs. If the local economy cannot afford the unit, production waits. Only genuine operating surplus reaches the clan treasury." },
      { title: "Battle maps", body: "Territories are map slots. Their strategic adjacency, cities and production can exist before a playable RTS map is attached; finished flat or globe maps can be assigned later." }
    ],
    source: "builtin-world-domination"
  },
  ...DOMINATION_TERRITORIES.map(territory => ({
    id: `territory:${territory.id}`,
    type: "territory",
    name: territory.name,
    icon: "◉",
    subtitle: `${territory.cities.length} cities • ${territory.neighbors.length} borders • ${territory.terrainSkin}`,
    summary: `World Domination territory with ${territory.cities.length} city objectives, a local real-time economy and a garrison limit of ${territory.garrisonLimit}.`,
    tags: ["world-domination", territory.terrainSkin, "territory", ...territory.neighbors],
    stats: {
      cities: territory.cities.length,
      borders: territory.neighbors.length,
      "garrison limit": territory.garrisonLimit,
      "production cycle": `${territory.unitProductionSeconds}s`,
      "strategic value": territory.strategicValue.toFixed(2)
    },
    sections: [
      { title: "Neighbors", body: territory.neighbors.join(" • ") },
      { title: "Cities", body: territory.cities.map(city => city.name).join(" • ") },
      { title: "Base income / second", body: Object.entries(territory.resourceRate).map(([key, value]) => `${key} ${value.toFixed(2)}`).join(" • ") },
      { title: "Map slot", body: territory.mapRef ? `Built-in map reference: ${territory.mapRef.id}` : "Open map slot. Attach a finished Map Editor export later." }
    ],
    source: "builtin-world-domination"
  }))
]);
