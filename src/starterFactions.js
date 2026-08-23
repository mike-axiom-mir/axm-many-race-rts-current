export const STARTER_FACTIONS = {
  ironvale: {
    id: "ironvale",
    starter: true,
    starterRole: "Balanced / defense",
    name: "Ironvale Compact",
    symbol: "⬟",
    tagline: "A disciplined compact built around dependable economies, sturdy settlements and formations that fight best beside infrastructure.",
    founder: "First Warden Mara",
    founderTitle: "Compact Founder",
    color: 0x7896b8,
    accent: 0xd9e4ef,
    terrainTint: 0x819276,
    traits: ["Balanced economy", "Structures +10% health", "Disciplined formations near friendly buildings", "Easy to learn"],
    economy: { food: 1.03, wood: 1.03, stone: 1.04, gold: 1.00 },
    military: { cost: 1.00, health: 1.06, damage: 1.00, speed: 0.98, squadSize: 5 },
    building: { cost: 1.00, health: 1.10 },
    starting: { food: 310, wood: 310, stone: 190, gold: 175, workforce: 20 },
    special: "Compact Discipline: formations operating near friendly structures gain a modest combat bonus, rewarding readable defensive lines without demanding heavy micro.",
    buildings: [
      { id: "ironvale-commons", name: "Compact Commons", role: "economy", cost: { wood: 120, stone: 35 }, income: { food: 0.45, stone: 0.25 }, description: "Stable food and stone support" },
      { id: "ironvale-drillhall", name: "Drill Hall", role: "military", cost: { wood: 145, gold: 45 }, unlocks: "vale-guard", description: "Trains disciplined Compact formations" },
      { id: "ironvale-bastion", name: "Vale Bastion", role: "defense", cost: { wood: 95, stone: 100 }, defense: 21, description: "Reliable defensive tower" }
    ],
    units: [
      { id: "vale-guard", name: "Vale Guard", cost: { food: 62, gold: 30 }, hp: 108, damage: 13, speed: 3.05, range: 1.25, description: "Durable general-purpose line formation" },
      { id: "ridgebows", name: "Ridgebow Cohort", cost: { food: 58, wood: 35, gold: 38 }, hp: 76, damage: 16, speed: 3.25, range: 2.15, description: "Readable ranged support formation" }
    ]
  },

  greenwake: {
    id: "greenwake",
    starter: true,
    starterRole: "Economy / sustain",
    name: "Greenwake Union",
    symbol: "❧",
    tagline: "A cooperative river-and-grove civilization that grows a strong economy, then keeps formations alive around its productive heartland.",
    founder: "Keeper Elian",
    founderTitle: "Union Founder",
    color: 0x74b87c,
    accent: 0xd8f0b8,
    terrainTint: 0x8eaa72,
    traits: ["Food +12%", "Wood +10%", "Economy districts support recovery", "Lower burst damage"],
    economy: { food: 1.12, wood: 1.10, stone: 0.96, gold: 0.98 },
    military: { cost: 0.98, health: 1.04, damage: 0.96, speed: 1.00, squadSize: 5 },
    building: { cost: 0.97, health: 1.03 },
    starting: { food: 335, wood: 325, stone: 165, gold: 160, workforce: 21 },
    special: "Living Supply: damaged formations near Greenwake economy districts slowly recover, making sustained territorial play more forgiving than repeated replacement.",
    buildings: [
      { id: "greenwake-grove", name: "Union Grove", role: "economy", cost: { wood: 110, stone: 25 }, income: { food: 0.72, wood: 0.32 }, description: "Strong renewable economy district" },
      { id: "greenwake-muster", name: "River Muster", role: "military", cost: { wood: 140, gold: 42 }, unlocks: "grove-warden", description: "Trains durable Union formations" },
      { id: "greenwake-watch", name: "Canopy Watch", role: "defense", cost: { wood: 105, stone: 80 }, defense: 17, description: "Affordable defensive lookout" }
    ],
    units: [
      { id: "grove-warden", name: "Grove Wardens", cost: { food: 60, gold: 28 }, hp: 106, damage: 12, speed: 3.15, range: 1.3, description: "Sustainable frontline formation" },
      { id: "river-strider", name: "River Striders", cost: { food: 72, wood: 28, gold: 40 }, hp: 82, damage: 15, speed: 4.15, range: 1.45, description: "Flexible response formation" }
    ]
  },

  ashwind: {
    id: "ashwind",
    starter: true,
    starterRole: "Mobility / aggression",
    name: "Ashwind League",
    symbol: "➤",
    tagline: "A frontier league that accepts a thinner homeland in exchange for armies that become more dangerous the farther they operate from home.",
    founder: "Rook of the First March",
    founderTitle: "League Founder",
    color: 0xc98b63,
    accent: 0xffd29f,
    terrainTint: 0xb79b75,
    traits: ["Units +8% speed", "Gold +8%", "Forward armies gain combat momentum", "Structures slightly weaker"],
    economy: { food: 1.00, wood: 0.98, stone: 0.93, gold: 1.08 },
    military: { cost: 1.00, health: 0.96, damage: 1.04, speed: 1.08, squadSize: 5 },
    building: { cost: 0.96, health: 0.94 },
    starting: { food: 300, wood: 300, stone: 155, gold: 205, workforce: 20 },
    special: "Forward Momentum: formations fighting far from their own capital gain extra damage and speed, rewarding committed pushes instead of passive turtling.",
    buildings: [
      { id: "ashwind-tradepost", name: "Frontier Tradepost", role: "economy", cost: { wood: 115, stone: 20 }, income: { gold: 0.58, food: 0.25 }, description: "Gold-forward frontier economy" },
      { id: "ashwind-yard", name: "March Yard", role: "military", cost: { wood: 135, gold: 50 }, unlocks: "marcher", description: "Trains fast League formations" },
      { id: "ashwind-signal", name: "Signal Tower", role: "defense", cost: { wood: 90, stone: 70 }, defense: 15, description: "Cheap frontier warning tower" }
    ],
    units: [
      { id: "marcher", name: "Ashwind Marchers", cost: { food: 58, gold: 34 }, hp: 88, damage: 14, speed: 3.75, range: 1.25, description: "Fast offensive line formation" },
      { id: "dust-rider", name: "Dust Riders", cost: { food: 78, wood: 25, gold: 52 }, hp: 74, damage: 18, speed: 5.05, range: 1.4, description: "Deep-pressure mobile formation" }
    ]
  }
};
