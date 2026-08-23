export function militaryBuildingForFaction(faction) {
  return faction?.buildings?.find(building => building.role === "military") || null;
}

export function unitUnlockAge(faction, unit) {
  if (Number.isFinite(unit?.unlockAge)) return Math.max(0, Number(unit.unlockAge));
  const index = Math.max(0, faction?.units?.findIndex(candidate => candidate.id === unit?.id) ?? 0);
  return Math.min(3, index);
}

export function unitRequiredBuilding(faction, unit) {
  if (unit?.requiresBuilding) return unit.requiresBuilding;
  return militaryBuildingForFaction(faction)?.id || null;
}

export function activeBuildingIds(buildings = []) {
  return new Set(buildings.filter(building => building?.parent && building.userData?.hp > 0).map(building => building.userData?.id).filter(Boolean));
}

export function buildingUnlockAge(building) {
  return Number.isFinite(building?.unlockAge) ? Math.max(0, Number(building.unlockAge)) : 0;
}

export function buildingAvailability(building, age = 0) {
  const requiredAge = buildingUnlockAge(building);
  const ageReady = Number(age || 0) >= requiredAge;
  return { ready: ageReady, requiredAge, ageReady };
}

export function buildingAvailabilityText(building, age = 0, ageNames = []) {
  const availability = buildingAvailability(building, age);
  return availability.ready ? "Ready" : `Reach ${ageNames[availability.requiredAge] || `Age ${availability.requiredAge + 1}`}`;
}

export function unitAvailability({ faction, unit, age = 0, buildings = [] } = {}) {
  const requiredAge = unitUnlockAge(faction, unit);
  const requiredBuilding = unitRequiredBuilding(faction, unit);
  const buildingIds = activeBuildingIds(buildings);
  const ageReady = Number(age || 0) >= requiredAge;
  const buildingReady = !requiredBuilding || buildingIds.has(requiredBuilding);
  return {
    ready: ageReady && buildingReady,
    requiredAge,
    requiredBuilding,
    ageReady,
    buildingReady
  };
}

export function availabilityText({ faction, unit, age = 0, buildings = [], ageNames = [] } = {}) {
  const availability = unitAvailability({ faction, unit, age, buildings });
  if (availability.ready) return "Ready";
  const requirements = [];
  if (!availability.buildingReady) {
    const building = faction?.buildings?.find(item => item.id === availability.requiredBuilding);
    requirements.push(`Build ${building?.name || availability.requiredBuilding}`);
  }
  if (!availability.ageReady) requirements.push(`Reach ${ageNames[availability.requiredAge] || `Age ${availability.requiredAge + 1}`}`);
  return requirements.join(" • ");
}

export function trainingTimeForUnit(unit, faction) {
  if (Number.isFinite(unit?.trainTime)) return Math.max(2, Number(unit.trainTime));
  const rawCost = Object.values(unit?.cost || {}).reduce((sum, value) => sum + Number(value || 0), 0);
  const squadSize = Number(unit?.squadSize || faction?.military?.squadSize || 5);
  return Math.max(7, Math.min(16, 5.8 + rawCost / 34 + squadSize * .42));
}

export function enemyAllocationForFaction(faction) {
  const economy = faction?.economy || {};
  const raw = {
    food: 1.15 / Math.max(.65, Number(economy.food || 1)),
    wood: 1.02 / Math.max(.65, Number(economy.wood || 1)),
    stone: .76 / Math.max(.65, Number(economy.stone || 1)),
    gold: 1.07 / Math.max(.65, Number(economy.gold || 1))
  };
  const total = Object.values(raw).reduce((sum, value) => sum + value, 0) || 1;
  return Object.fromEntries(Object.entries(raw).map(([key, value]) => [key, value / total]));
}

export function chooseEnemyUnit(faction, age, buildings = []) {
  const allAvailable = (faction?.units || []).filter(unit => unitAvailability({ faction, unit, age, buildings }).ready);
  const combatAvailable = allAvailable.filter(unit => !unit.scout);
  const available = combatAvailable.length ? combatAvailable : allAvailable;
  if (!available.length) return null;
  if (available.length === 1) return available[0];

  // Later roster options should actually appear in armies. Keep a slight bias toward
  // early/core formations without starving support, siege and alternate-role units.
  const weights = available.map((unit, index) => {
    const ageWeight = 1 / (1 + Math.max(0, unitUnlockAge(faction, unit)) * .10);
    const rosterWeight = 1 / (1 + index * .08);
    return ageWeight * rosterWeight;
  });
  const total = weights.reduce((sum, value) => sum + value, 0);
  let roll = Math.random() * total;
  for (let index = 0; index < available.length; index++) {
    roll -= weights[index];
    if (roll <= 0) return available[index];
  }
  return available[available.length - 1];
}

function leastBuiltDefinition(candidates, living) {
  if (!candidates.length) return null;
  const counts = new Map();
  for (const building of living) {
    const id = building.userData?.id;
    if (id) counts.set(id, (counts.get(id) || 0) + 1);
  }
  const min = Math.min(...candidates.map(candidate => counts.get(candidate.id) || 0));
  const least = candidates.filter(candidate => (counts.get(candidate.id) || 0) === min);
  return least[Math.floor(Math.random() * least.length)] || candidates[0];
}

export function chooseEnemyBuilding(faction, existing = [], age = 0) {
  const living = existing.filter(building => building?.parent && building.userData?.hp > 0);
  const roleCounts = living.reduce((counts, building) => {
    const role = building.userData?.role || "economy";
    counts[role] = (counts[role] || 0) + 1;
    return counts;
  }, {});
  const candidates = (faction?.buildings || []).filter(building => buildingAvailability(building, age).ready);
  const hub = candidates.find(building => building.upgradeHub);
  const hubBuilt = hub && living.some(building => building.userData?.id === hub.id);
  const priorities = [
    roleCounts.military < 1 ? "military" : null,
    roleCounts.economy < 2 ? "economy" : null,
    age >= 1 && hub && !hubBuilt ? "upgrade-hub" : null,
    roleCounts.defense < 2 ? "defense" : null,
    roleCounts.support < 2 ? "support" : null,
    roleCounts.economy < 4 ? "economy" : null,
    roleCounts.military < 2 ? "military" : null,
    "defense"
  ].filter(Boolean);
  for (const role of priorities) {
    if (role === "upgrade-hub") return hub;
    const roleCandidates = candidates.filter(building => building.role === role);
    const match = leastBuiltDefinition(roleCandidates, living);
    if (match) return match;
  }
  return candidates.find(building => building.role !== "wall" && building.role !== "gate") || candidates[0] || null;
}
