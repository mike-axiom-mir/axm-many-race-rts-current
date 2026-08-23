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
      { id: "ironvale-commons", name: "Compact Commons", role: "economy", cost: { wood: 120, stone: 35 }, hp: 560, armor: 0.08, income: { food: 0.45, stone: 0.25 }, description: "Stable food and stone support. Tough enough to anchor a defensive district." },
      { id: "ironvale-drillhall", name: "Drill Hall", role: "military", cost: { wood: 145, gold: 45 }, hp: 610, armor: 0.10, unlocks: "vale-guard", description: "Unlocks Compact formations and acts as a durable reinforcement anchor." },
      { id: "ironvale-bastion", name: "Vale Bastion", role: "defense", cost: { wood: 95, stone: 100 }, hp: 820, armor: 0.16, defense: 21, defenseRange: 12.5, fireInterval: 0.98, projectileSpeed: 14, description: "Slow, durable defensive tower with reliable reach." }
    ],
    units: [
      { id: "vale-guard", name: "Vale Guard", unlockAge: 0, requiresBuilding: "ironvale-drillhall", cost: { food: 62, gold: 30 }, hp: 108, damage: 13, speed: 3.05, range: 1.25, combat: { role: "line", armor: 0.11, attackInterval: 0.88 }, description: "Line • durable general-purpose formation that checks mobile pressure." },
      { id: "ridgebows", name: "Ridgebow Cohort", unlockAge: 1, requiresBuilding: "ironvale-drillhall", cost: { food: 58, wood: 35, gold: 38 }, hp: 76, damage: 16, speed: 3.25, range: 2.35, combat: { role: "ranged", armor: 0.02, attackInterval: 1.02 }, description: "Ranged • protected pressure formation, strong into enemy line units." },
      { id: "stonebreakers", name: "Stonebreaker Crew", unlockAge: 2, requiresBuilding: "ironvale-drillhall", squadSize: 3, cost: { food: 82, wood: 58, gold: 48 }, hp: 128, damage: 18, speed: 2.35, range: 1.15, combat: { role: "siege", armor: 0.13, attackInterval: 1.28 }, description: "Siege • small heavy crew built to crack capitals and defensive structures." }
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
      { id: "greenwake-grove", name: "Union Grove", role: "economy", cost: { wood: 110, stone: 25 }, hp: 520, armor: 0.05, income: { food: 0.72, wood: 0.32 }, description: "High-output renewable economy district and the center of Living Supply recovery." },
      { id: "greenwake-muster", name: "River Muster", role: "military", cost: { wood: 140, gold: 42 }, hp: 500, armor: 0.05, unlocks: "grove-warden", description: "Affordable military district for sustained reinforcement rather than burst armies." },
      { id: "greenwake-watch", name: "Canopy Watch", role: "defense", cost: { wood: 105, stone: 80 }, hp: 620, armor: 0.08, defense: 17, defenseRange: 13.5, fireInterval: 0.82, projectileSpeed: 15, description: "Lighter tower with good reach and a faster firing rhythm." }
    ],
    units: [
      { id: "grove-warden", name: "Grove Wardens", unlockAge: 0, requiresBuilding: "greenwake-muster", cost: { food: 60, gold: 28 }, hp: 106, damage: 12, speed: 3.15, range: 1.3, combat: { role: "line", armor: 0.09, attackInterval: 0.9 }, description: "Line • sustainable frontline formation that protects Greenwake's productive heartland." },
      { id: "river-strider", name: "River Striders", unlockAge: 1, requiresBuilding: "greenwake-muster", cost: { food: 72, wood: 28, gold: 40 }, hp: 82, damage: 15, speed: 4.15, range: 1.45, combat: { role: "mobile", armor: 0.03, attackInterval: 0.78 }, description: "Mobile • fast response formation for hunting exposed ranged units and retaking sites." },
      { id: "canopy-slingers", name: "Canopy Slingers", unlockAge: 2, requiresBuilding: "greenwake-muster", cost: { food: 68, wood: 42, gold: 44 }, hp: 74, damage: 15, speed: 3.05, range: 2.45, combat: { role: "ranged", armor: 0.02, attackInterval: 1.0 }, description: "Ranged • efficient late-game support that rewards a protected, sustained battle line." }
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
      { id: "ashwind-tradepost", name: "Frontier Tradepost", role: "economy", cost: { wood: 115, stone: 20 }, hp: 450, armor: 0.03, income: { gold: 0.58, food: 0.25 }, description: "Cheap gold-forward economy district built to support expansion." },
      { id: "ashwind-yard", name: "March Yard", role: "military", cost: { wood: 135, gold: 50 }, hp: 455, armor: 0.03, unlocks: "marcher", description: "Lean military yard that turns resources into mobile pressure quickly." },
      { id: "ashwind-signal", name: "Signal Tower", role: "defense", cost: { wood: 90, stone: 70 }, hp: 540, armor: 0.04, defense: 15, defenseRange: 15.0, fireInterval: 1.08, projectileSpeed: 18, description: "Fragile long-range frontier tower designed to warn and soften incoming armies." }
    ],
    units: [
      { id: "marcher", name: "Ashwind Marchers", unlockAge: 0, requiresBuilding: "ashwind-yard", cost: { food: 58, gold: 34 }, hp: 88, damage: 14, speed: 3.75, range: 1.25, combat: { role: "line", armor: 0.06, attackInterval: 0.82 }, description: "Line • aggressive frontline formation that trades durability for tempo." },
      { id: "dust-rider", name: "Dust Riders", unlockAge: 1, requiresBuilding: "ashwind-yard", squadSize: 4, cost: { food: 78, wood: 25, gold: 52 }, hp: 82, damage: 19, speed: 5.05, range: 1.4, combat: { role: "mobile", armor: 0.03, attackInterval: 0.72 }, description: "Mobile • high-speed flanking formation built to punish exposed ranged armies." },
      { id: "dune-arbalests", name: "Dune Arbalests", unlockAge: 2, requiresBuilding: "ashwind-yard", squadSize: 4, cost: { food: 66, wood: 46, gold: 58 }, hp: 68, damage: 20, speed: 3.55, range: 2.7, combat: { role: "ranged", armor: 0.01, attackInterval: 1.12 }, description: "Ranged • fragile long-range pressure formation for an army already operating forward." }
    ]
  }
};
