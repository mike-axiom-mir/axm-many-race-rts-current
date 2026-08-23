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
      { id: "prism-reservoir", name: "Resonance Reservoir", role: "economy", cost: { wood: 115, stone: 30 }, hp: 500, armor: 0.06, income: { gold: 0.42, wood: 0.22 }, description: "Balanced resonant economy node that keeps Gold and Wood flowing." },
      { id: "prism-loom", name: "Chorus Loom", role: "military", cost: { wood: 145, gold: 52 }, hp: 505, armor: 0.06, unlocks: "facet-guard", description: "Forms Chorus battle cohorts and anchors the faction's small flexible roster." },
      { id: "prism-spire", name: "Refraction Spire", role: "defense", cost: { wood: 92, stone: 92 }, hp: 650, armor: 0.09, defense: 19, defenseRange: 13.2, fireInterval: 0.92, projectileSpeed: 16, description: "Balanced prism tower whose stable stats contrast with the army's shifting rhythm." }
    ],
    units: [
      { id: "facet-guard", name: "Facet Guard", unlockAge: 0, requiresBuilding: "prism-loom", cost: { food: 60, gold: 35 }, hp: 96, damage: 14, speed: 3.35, range: 1.35, combat: { role: "line", armor: 0.08, attackInterval: 0.88 }, description: "Line • adaptive frontline formation whose job changes subtly with the current resonance phase." },
      { id: "refractor", name: "Refractor Flight", unlockAge: 1, requiresBuilding: "prism-loom", squadSize: 4, cost: { food: 70, wood: 30, gold: 50 }, hp: 80, damage: 17, speed: 4.25, range: 2.05, combat: { role: "ranged", armor: 0.02, attackInterval: 1.0 }, description: "Ranged • mobile-feeling pressure formation that spikes during Focus and repositions during Drift." },
      { id: "shard-runners", name: "Shard Runners", unlockAge: 2, requiresBuilding: "prism-loom", squadSize: 4, cost: { food: 74, wood: 26, gold: 54 }, hp: 74, damage: 18, speed: 4.65, range: 1.3, combat: { role: "mobile", armor: 0.03, attackInterval: 0.74 }, description: "Mobile • late-game flanking formation that turns Drift windows into sudden positional swings." }
    ]
  }
};
