import { normalizeMapDefinition } from "./mapSchema.js";

export const FIRST_GLOBE_MAP = normalizeMapDefinition({
  schemaVersion: 2,
  id: "crownworld",
  name: "Crownworld",
  description: "A compact spherical battlefield built to prove true around-the-world RTS movement and territorial conquest.",
  projection: "globe",
  seed: 260823,
  environment: {
    radius: 24,
    waterLevel: 0,
    atmosphere: true,
    terrainTint: "#72935e",
    oceanTint: "#315f79",
    baseSkin: "grassland",
    skySkin: "clear"
  },
  playerStart: { lat: 20, lon: -125, elevation: 0 },
  enemyStart: { lat: -18, lon: 55, elevation: 0 },
  strategicSites: [
    { id: "north-crown", name: "North Crown", kind: "monument", geo: { lat: 42, lon: -15, elevation: 0 }, radius: 5.5, captureRate: 23, bonus: { gold: 1.2 }, owner: "neutral", tags: ["crown","trade"], rules: [] },
    { id: "sunwood", name: "Sunwood Belt", kind: "forest", geo: { lat: 8, lon: -55, elevation: 0 }, radius: 5.5, captureRate: 25, bonus: { wood: 1.05 }, owner: "neutral", tags: ["forest"], rules: [] },
    { id: "red-quarry", name: "Red Quarry", kind: "quarry", geo: { lat: -31, lon: -155, elevation: 0 }, radius: 5.5, captureRate: 25, bonus: { stone: .9 }, owner: "neutral", tags: ["quarry"], rules: [] },
    { id: "eastern-gate", name: "Eastern Gate", kind: "monument", geo: { lat: 4, lon: 115, elevation: 0 }, radius: 5.5, captureRate: 23, bonus: { food: 1.05 }, owner: "neutral", tags: ["gate"], rules: [] },
    { id: "south-vault", name: "South Vault", kind: "quarry", geo: { lat: -54, lon: 10, elevation: 0 }, radius: 5.5, captureRate: 22, bonus: { gold: .8, stone: .55 }, owner: "neutral", tags: ["vault"], rules: [] }
  ],
  decorations: [
    { id: "crown-obelisk", name: "Crown Obelisk", asset: "obelisk", geo: { lat: 42, lon: -15, elevation: 0 }, tint: "#8a78a4", scale: 1.3, rotation: 0, collision: true, owner: "world", tags: ["landmark"], rules: [] },
    { id: "sunwood-crystal", name: "Sunwood Crystal", asset: "crystal-blue", geo: { lat: 7, lon: -49, elevation: 0 }, tint: "#69d8e8", scale: .9, rotation: 0, collision: true, owner: "world", tags: ["landmark"], rules: [] }
  ],
  surfacePaint: [
    { id: "snow-cap", name: "Northern Snow", geo: { lat: 63, lon: -20, elevation: 0 }, radius: 11, skin: "snow", tint: "#e4efed", opacity: .75, blend: "replace", owner: "world", tags: ["surface"], rules: [] },
    { id: "red-earth", name: "Red Earth", geo: { lat: -31, lon: -155, elevation: 0 }, radius: 9, skin: "dirt", tint: "#9a6a51", opacity: .7, blend: "replace", owner: "world", tags: ["surface"], rules: [] }
  ],
  globalRules: [
    { id: "welcome", name: "Planetary briefing", enabled: true, once: true, priority: 1, cooldown: 0, event: { type: "map.start" }, conditions: [], actions: [{ type: "message.show", text: "Crownworld: hold territory, grow your macro economy, and break the opposing capital." }] }
  ],
  variables: { planetary_control: 0 },
  campaign: { enabled: false, objectives: [] }
});
