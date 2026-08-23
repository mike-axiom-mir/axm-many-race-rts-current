export const DEFEND_VERSION = 1;

export const DEFEND_DIFFICULTIES = {
  relaxed: { id: "relaxed", name: "Relaxed", enemyHealth: .82, enemyDamage: .78, reward: 1.18, workshopHealth: 1.18 },
  normal: { id: "normal", name: "Standard", enemyHealth: 1, enemyDamage: 1, reward: 1, workshopHealth: 1 },
  hard: { id: "hard", name: "Hard", enemyHealth: 1.2, enemyDamage: 1.17, reward: .94, workshopHealth: .94 },
  absurd: { id: "absurd", name: "Workshop Panic", enemyHealth: 1.45, enemyDamage: 1.35, reward: .90, workshopHealth: .88 }
};

export const DEFEND_UPGRADES = [
  { id: "tower-damage", name: "Overcharged Bolts", icon: "⚡", description: "Workshop towers deal 18% more damage.", effect: { towerDamage: 1.18 } },
  { id: "tower-range", name: "Long Sight", icon: "◎", description: "Workshop towers gain +1.5 range.", effect: { towerRange: 1.5 } },
  { id: "tower-rate", name: "Quick Cycling", icon: "⟳", description: "Workshop towers fire 13% faster.", effect: { towerRate: .87 } },
  { id: "tower-armor", name: "Reinforced Turrets", icon: "▲", description: "Existing and future towers gain 22% maximum health.", effect: { towerHealth: 1.22 } },
  { id: "workshop-armor", name: "Deep Workshop Walls", icon: "▣", description: "Workshop maximum health +650 and immediately repairs 650.", effect: { workshopHp: 650 } },
  { id: "supply-line", name: "Supply Line", icon: "⌁", description: "Passive Workshop Supply gain +0.35 per second.", effect: { passiveSupply: .35 } },
  { id: "salvage", name: "Better Salvage", icon: "◆", description: "Wave-clear supply rewards increase by 25%.", effect: { waveReward: 1.25 } },
  { id: "formation-drill", name: "Formation Drill", icon: "⚔", description: "All allied formations gain 15% damage.", effect: { squadDamage: 1.15 } },
  { id: "formation-armor", name: "Field Armor", icon: "◫", description: "All allied formations gain 18% maximum health and heal the gained amount.", effect: { squadHealth: 1.18 } },
  { id: "repair-rigs", name: "Repair Rigs", icon: "✚", description: "Workshop repair actions restore 220 additional health.", effect: { repairBonus: 220 } },
  { id: "cache", name: "Emergency Cache", icon: "▤", description: "Gain 240 Workshop Supply immediately.", effect: { supply: 240 } },
  { id: "perimeter", name: "Expanded Perimeter", icon: "⬡", description: "Unlock two additional defense-tower sockets.", effect: { towerSockets: 2 } }
];

export function waveSpec(wave, activeSeats = 1, difficultyId = "normal") {
  const difficulty = DEFEND_DIFFICULTIES[difficultyId] || DEFEND_DIFFICULTIES.normal;
  const boss = wave > 0 && wave % 5 === 0;
  const count = Math.max(3, 2 + activeSeats + Math.ceil(wave * .85) + (boss ? 2 : 0));
  const healthScale = (1 + Math.max(0, wave - 1) * .085) * difficulty.enemyHealth;
  const damageScale = (1 + Math.max(0, wave - 1) * .065) * difficulty.enemyDamage;
  const speedScale = 1 + Math.min(.22, Math.max(0, wave - 1) * .012);
  const clearReward = Math.round((72 + wave * 20 + activeSeats * 12 + (boss ? 70 : 0)) * difficulty.reward);
  return {
    wave,
    boss,
    count,
    healthScale,
    damageScale,
    speedScale,
    clearReward,
    passiveIncrease: .12 + Math.min(.10, wave * .008)
  };
}

export function chooseUpgradeChoices(count = 3, owned = []) {
  const ownedCounts = owned.reduce((map, id) => map.set(id, (map.get(id) || 0) + 1), new Map());
  const candidates = DEFEND_UPGRADES.filter(upgrade => upgrade.id !== "perimeter" || (ownedCounts.get("perimeter") || 0) < 2);
  const shuffled = [...candidates].sort(() => Math.random() - .5);
  return shuffled.slice(0, Math.min(count, shuffled.length));
}

export const DEFEND_ATLAS_ENTRIES = [
  {
    id: "structure:workshop-core", type: "structure", name: "The Workshop", icon: "▣", subtitle: "Defend the Workshop objective",
    summary: "Shared co-op objective at the center of survival mode. If it falls, every defending seat loses together.",
    tags: ["defend-workshop", "objective", "coop", "structure"], stats: { role: "shared objective", baseHp: 3600 }
  },
  {
    id: "structure:workshop-guard-tower", type: "structure", name: "Workshop Guard Tower", icon: "▲", subtitle: "Survival defense",
    summary: "A deliberately stronger fixed-perimeter defensive tower bought with shared Workshop Supply. Wave upgrades can improve its damage, range, fire rate and durability.",
    tags: ["defend-workshop", "tower", "defense"], stats: { baseDamage: 44, baseRange: 14, baseFireInterval: .82, baseHp: 980 }
  }
];
