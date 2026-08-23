import { STARTER_FACTIONS } from "./starterFactions.js";

export const RESOURCE_KEYS = ["food", "wood", "stone", "gold"];

export const FACTIONS = {
  ...STARTER_FACTIONS,

  northpole: {
    id: "northpole",
    name: "Northpole Dominion",
    symbol: "❄",
    tagline: "A festive industrial kingdom that turns preparation into overwhelming momentum.",
    founder: "Santa's Brother",
    founderTitle: "Founding Steward",
    color: 0x8edcff,
    accent: 0xeafaff,
    terrainTint: 0xbce7ea,
    traits: ["Food +20%", "Wood +15%", "Defensive structures stronger", "Founder inspires nearby squads"],
    economy: { food: 1.20, wood: 1.15, stone: 1.00, gold: 0.95 },
    military: { cost: 1.00, health: 1.08, damage: 0.96, speed: 0.98, squadSize: 5 },
    building: { cost: 1.00, health: 1.18 },
    starting: { food: 320, wood: 300, stone: 180, gold: 150, workforce: 20 },
    special: "Winter Stores: every completed economy district grants a small one-time food reserve.",
    buildings: [
      { id: "storehouse", name: "Winter Storehouse", role: "economy", cost: { wood: 120, stone: 30 }, income: { food: 0.9 }, description: "+Food capacity & reserve" },
      { id: "workshop", name: "Toyworks", role: "military", cost: { wood: 150, gold: 40 }, unlocks: "guard", description: "Trains Dominion Guard" },
      { id: "watchtower", name: "Frost Watch", role: "defense", cost: { wood: 100, stone: 90 }, defense: 20, description: "Durable defensive outpost" }
    ],
    units: [
      { id: "guard", name: "Dominion Guard", cost: { food: 65, gold: 30 }, hp: 105, damage: 13, speed: 3.1, range: 1.3, description: "Reliable line squad" },
      { id: "sled", name: "Sled Lancers", cost: { food: 90, wood: 35, gold: 45 }, hp: 85, damage: 18, speed: 4.8, range: 1.5, description: "Fast pressure squad" }
    ]
  },

  suitcase: {
    id: "suitcase",
    name: "Suitcase Habitat Collective",
    symbol: "▣",
    tagline: "A compact civilization whose entire doctrine is built around mobility, packing and rapid redeployment.",
    founder: "The First Porter",
    founderTitle: "Habitat Founder",
    color: 0xf5c56c,
    accent: 0xffebbd,
    terrainTint: 0xc8c091,
    traits: ["Buildings 15% cheaper", "Units +12% speed", "Gold +15%", "Expansion favors forward habitats"],
    economy: { food: 0.95, wood: 1.00, stone: 0.90, gold: 1.15 },
    military: { cost: 0.98, health: 0.94, damage: 1.00, speed: 1.12, squadSize: 5 },
    building: { cost: 0.85, health: 0.90 },
    starting: { food: 280, wood: 340, stone: 150, gold: 190, workforce: 20 },
    special: "Packed Empire: construction is cheaper and future builds can support relocation rather than demolition.",
    buildings: [
      { id: "habitat", name: "Foldout Habitat", role: "economy", cost: { wood: 105, stone: 25 }, income: { gold: 0.6 }, description: "+Workforce & gold logistics" },
      { id: "depot", name: "Transit Depot", role: "military", cost: { wood: 135, gold: 50 }, unlocks: "porter", description: "Trains mobile formations" },
      { id: "beacon", name: "Route Beacon", role: "defense", cost: { wood: 80, stone: 65 }, defense: 12, description: "Cheap territorial anchor" }
    ],
    units: [
      { id: "porter", name: "Porter Cohort", cost: { food: 55, gold: 35 }, hp: 82, damage: 12, speed: 3.8, range: 1.2, description: "Fast flexible squad" },
      { id: "trunkrider", name: "Trunk Riders", cost: { food: 75, wood: 25, gold: 55 }, hp: 72, damage: 16, speed: 5.2, range: 1.4, description: "Extreme redeployment speed" }
    ]
  },

  fatfrotz: {
    id: "fatfrotz",
    name: "Fatfrotz Empire",
    symbol: "●",
    tagline: "A loud expansionist empire that solves problems with scale, appetite and extremely large formations.",
    founder: "Grand Frotz",
    founderTitle: "Imperial Founder",
    color: 0xf08d72,
    accent: 0xffd5ca,
    terrainTint: 0xc69d7a,
    traits: ["Larger squads", "Military 12% cheaper", "Food +10%", "Research costs more"],
    economy: { food: 1.10, wood: 1.00, stone: 1.00, gold: 0.95 },
    military: { cost: 0.88, health: 1.03, damage: 1.02, speed: 0.92, squadSize: 7 },
    building: { cost: 1.00, health: 1.04 },
    starting: { food: 360, wood: 270, stone: 180, gold: 145, workforce: 22 },
    special: "Mass Doctrine: every military training action produces more bodies, but age advancement is more expensive.",
    buildings: [
      { id: "feasthall", name: "Great Feast Hall", role: "economy", cost: { wood: 120, stone: 35 }, income: { food: 0.8 }, description: "+Food & workforce growth" },
      { id: "musteryard", name: "Muster Yard", role: "military", cost: { wood: 145, gold: 35 }, unlocks: "frotzling", description: "Mass infantry production" },
      { id: "bigwall", name: "Big Wall", role: "defense", cost: { wood: 75, stone: 105 }, defense: 18, description: "Exactly what the name promises" }
    ],
    units: [
      { id: "frotzling", name: "Frotzling Mob", cost: { food: 60, gold: 24 }, hp: 92, damage: 11, speed: 3.0, range: 1.1, description: "Cheap oversized squad" },
      { id: "bellyram", name: "Belly Ram Crew", cost: { food: 95, wood: 45, gold: 35 }, hp: 145, damage: 22, speed: 2.4, range: 1.2, description: "Slow siege formation" }
    ]
  },

  clockworkOrchard: {
    id: "clockworkOrchard",
    name: "Clockwork Orchard Assembly",
    symbol: "⚙",
    tagline: "Precision growers who treat orchards, workshops and formations as one carefully tuned machine.",
    founder: "The First Gardener",
    founderTitle: "Assembly Founder",
    color: 0xa6d77d,
    accent: 0xf1e39a,
    terrainTint: 0xa9c88b,
    traits: ["Gold +18%", "Wood +8%", "Smaller harder-hitting squads", "Structures cost more but endure"],
    economy: { food: 0.92, wood: 1.08, stone: 0.95, gold: 1.18 },
    military: { cost: 1.06, health: 0.90, damage: 1.14, speed: 1.06, squadSize: 4 },
    building: { cost: 1.08, health: 1.12 },
    starting: { food: 275, wood: 315, stone: 170, gold: 220, workforce: 19 },
    special: "Precision Harvest: the Assembly fields fewer soldiers per formation, but each formation hits harder and moves with deliberate speed.",
    buildings: [
      { id: "gear-orchard", name: "Gear Orchard", role: "economy", cost: { wood: 135, stone: 35 }, income: { wood: 0.55, gold: 0.25 }, description: "Precision harvest & workshop income" },
      { id: "pruning-hall", name: "Pruning Hall", role: "military", cost: { wood: 155, gold: 55 }, unlocks: "pruner", description: "Trains precise Assembly cohorts" },
      { id: "signal-spire", name: "Signal Spire", role: "defense", cost: { wood: 90, stone: 110 }, defense: 22, description: "Expensive but strong territorial watch" }
    ],
    units: [
      { id: "pruner", name: "Gearbound Pruners", cost: { food: 58, gold: 42 }, hp: 84, damage: 17, speed: 3.5, range: 1.35, description: "Small high-damage formation" },
      { id: "orchard-runner", name: "Orchard Runners", cost: { food: 72, wood: 30, gold: 48 }, hp: 68, damage: 19, speed: 4.7, range: 1.55, description: "Fast precision strike formation" }
    ]
  }
};

export const AGE_DATA = [
  { index: 0, name: "Founding Age", multiplier: 1, cost: null },
  { index: 1, name: "Expansion Age", multiplier: 1.28, cost: { food: 420, wood: 260, gold: 180 } },
  { index: 2, name: "Dominion Age", multiplier: 1.62, cost: { food: 720, stone: 360, gold: 420 } },
  { index: 3, name: "Legacy Age", multiplier: 2.05, cost: { food: 1100, stone: 600, gold: 720 } }
];

export function getFactionList() {
  return Object.values(FACTIONS).sort((a, b) => Number(Boolean(b.starter)) - Number(Boolean(a.starter)) || a.name.localeCompare(b.name));
}
