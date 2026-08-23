export const CORE_UPGRADES = [
  {
    id: "supply",
    name: "Efficient Supply",
    maxLevel: 2,
    ageByLevel: [1, 2],
    costs: [
      { wood: 140, gold: 90 },
      { wood: 220, gold: 150 }
    ],
    descriptions: ["All resource income +7%.", "All resource income +7% again."],
    effect: { incomePerLevel: .07 }
  },
  {
    id: "formations",
    name: "Veteran Formations",
    maxLevel: 2,
    ageByLevel: [1, 2],
    costs: [
      { food: 180, gold: 120 },
      { food: 280, gold: 190 }
    ],
    descriptions: ["All current and future formations +6% health and damage.", "Another +6% health and damage."],
    effect: { formationHealthPerLevel: .06, formationDamagePerLevel: .06 }
  },
  {
    id: "fortifications",
    name: "Fortified Works",
    maxLevel: 2,
    ageByLevel: [1, 2],
    costs: [
      { wood: 150, stone: 130 },
      { wood: 240, stone: 210 }
    ],
    descriptions: ["Buildings +10% health; defense towers +5% damage.", "Another +10% building health and +5% tower damage."],
    effect: { buildingHealthPerLevel: .10, towerDamagePerLevel: .05 }
  }
];

export const SIGNATURE_UPGRADES = {
  ironvale: {
    id: "ironvale-deep-anchors",
    name: "Deep Anchors",
    age: 2,
    cost: { stone: 230, gold: 170 },
    description: "Compact Discipline reaches farther and also grants a small armor bonus.",
    effect: { signature: "ironvale-deep-anchors" }
  },
  greenwake: {
    id: "greenwake-shared-canopy",
    name: "Shared Canopy",
    age: 2,
    cost: { food: 240, wood: 170, gold: 120 },
    description: "Living Supply reaches farther and restores formations faster.",
    effect: { signature: "greenwake-shared-canopy" }
  },
  ashwind: {
    id: "ashwind-long-march",
    name: "Long March",
    age: 2,
    cost: { food: 190, wood: 120, gold: 220 },
    description: "Forward Momentum activates closer to home and gains a little more speed.",
    effect: { signature: "ashwind-long-march" }
  },
  prismkin: {
    id: "prismkin-perfect-cadence",
    name: "Perfect Cadence",
    age: 2,
    cost: { stone: 160, gold: 260 },
    description: "Each Resonance phase becomes slightly stronger without changing its readable 14-second rhythm.",
    effect: { signature: "prismkin-perfect-cadence" }
  }
};

export function upgradeHubBuilding(faction) {
  return faction?.buildings?.find(building => building.upgradeHub) || null;
}

export function livingBuildingIds(buildings = []) {
  return new Set(buildings.filter(building => building?.parent && building.userData?.hp > 0).map(building => building.userData?.id).filter(Boolean));
}

export function upgradeLevel(levels = {}, id) {
  return Math.max(0, Number(levels?.[id] || 0));
}

export function hasUpgradeHub(faction, buildings = []) {
  const hub = upgradeHubBuilding(faction);
  return Boolean(hub && livingBuildingIds(buildings).has(hub.id));
}

export function nextCoreUpgrade(def, levels = {}) {
  const level = upgradeLevel(levels, def.id);
  if (level >= def.maxLevel) return null;
  return {
    ...def,
    currentLevel: level,
    nextLevel: level + 1,
    age: def.ageByLevel[level] ?? 0,
    cost: { ...(def.costs[level] || {}) },
    description: def.descriptions[level] || def.descriptions[def.descriptions.length - 1] || "Upgrade."
  };
}

export function availableUpgradeOptions({ faction, age = 0, buildings = [], levels = {} } = {}) {
  const hub = upgradeHubBuilding(faction);
  const hubReady = hasUpgradeHub(faction, buildings);
  const options = CORE_UPGRADES.map(def => nextCoreUpgrade(def, levels)).filter(Boolean).map(option => ({
    ...option,
    hubId: hub?.id || null,
    ready: hubReady && age >= option.age,
    hubReady,
    ageReady: age >= option.age,
    signature: false
  }));
  const signature = SIGNATURE_UPGRADES[faction?.id];
  if (signature && upgradeLevel(levels, signature.id) < 1) {
    options.push({
      ...signature,
      currentLevel: 0,
      nextLevel: 1,
      maxLevel: 1,
      hubId: hub?.id || null,
      hubReady,
      ageReady: age >= signature.age,
      ready: hubReady && age >= signature.age,
      signature: true
    });
  }
  return options;
}

export function upgradeRequirementText(option, faction) {
  if (!option) return "Complete";
  const requirements = [];
  if (!option.hubReady) requirements.push(`Build ${upgradeHubBuilding(faction)?.name || "upgrade hub"}`);
  if (!option.ageReady) requirements.push(`Reach Age ${Number(option.age || 0) + 1}`);
  return requirements.length ? requirements.join(" • ") : "Ready";
}

export function incomeUpgradeMultiplier(levels = {}) {
  return 1 + upgradeLevel(levels, "supply") * .07;
}

export function formationUpgradeMultiplier(levels = {}) {
  return 1 + upgradeLevel(levels, "formations") * .06;
}

export function buildingHealthUpgradeMultiplier(levels = {}) {
  return 1 + upgradeLevel(levels, "fortifications") * .10;
}

export function towerDamageUpgradeMultiplier(levels = {}) {
  return 1 + upgradeLevel(levels, "fortifications") * .05;
}

export function signatureEnabled(levels = {}, factionId) {
  const def = SIGNATURE_UPGRADES[factionId];
  return Boolean(def && upgradeLevel(levels, def.id) > 0);
}
