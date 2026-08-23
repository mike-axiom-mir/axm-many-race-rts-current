export const WILDCARD_FACTION = {
  prismkin: {
    id: "prismkin",
    wildcard: true,
    starterRole: "Wildcard / rhythm",
    name: "Prismkin Chorus",
    symbol: "◇",
    tagline: "A crystalline people whose formations fight in a shared resonance cycle, changing tactical identity as the battle rhythm turns.",
    founder: "First Refraction",
    founderTitle: "Chorus Origin",
    color: 0x9f8dff,
    accent: 0x7ff0e8,
    terrainTint: 0x9186a8,
    traits: ["Global resonance cycle", "Drift phase favors movement", "Focus phase favors damage and range", "Mend phase restores formations"],
    economy: { food: 0.98, wood: 1.02, stone: 1.00, gold: 1.08 },
    military: { cost: 1.02, health: 0.98, damage: 1.02, speed: 1.03, squadSize: 5 },
    building: { cost: 1.02, health: 1.00 },
    starting: { food: 305, wood: 305, stone: 170, gold: 205, workforce: 20 },
    special: "Resonance Cycle: every 14 seconds the entire Chorus shifts between Drift, Focus and Mend. The cycle is deterministic and visible, rewarding timing instead of randomness.",
    buildings: [
      { id: "prism-reservoir", name: "Resonance Reservoir", role: "economy", cost: { wood: 115, stone: 30 }, income: { gold: 0.42, wood: 0.22 }, description: "Stores and redistributes resonant material" },
      { id: "prism-loom", name: "Chorus Loom", role: "military", cost: { wood: 145, gold: 52 }, unlocks: "facet-guard", description: "Forms Prismkin battle cohorts" },
      { id: "prism-spire", name: "Refraction Spire", role: "defense", cost: { wood: 92, stone: 92 }, defense: 19, description: "Balanced defensive prism tower" }
    ],
    units: [
      { id: "facet-guard", name: "Facet Guard", cost: { food: 60, gold: 35 }, hp: 96, damage: 14, speed: 3.35, range: 1.35, description: "Adaptive line formation tuned to the current resonance phase" },
      { id: "refractor", name: "Refractor Flight", cost: { food: 70, wood: 30, gold: 50 }, hp: 76, damage: 17, speed: 4.25, range: 1.75, description: "Fast ranged formation that becomes dangerous during Focus" }
    ]
  }
};
