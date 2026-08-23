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
  const available = (faction?.units || []).filter(unit => unitAvailability({ faction, unit, age, buildings }).ready);
  if (!available.length) return null;
  if (available.length === 1) return available[0];

  // Keep the army readable and mixed: core formations remain common while later
  // specialist formations appear often enough to matter without replacing the roster.
  const weights = available.map((unit, index) => {
    if (index === 0) return .46;
    if (index === 1) return .34;
    return .20 / Math.max(1, available.length - 2);
  });
  const total = weights.reduce((sum, value) => sum + value, 0);
  let roll = Math.random() * total;
  for (let index = 0; index < available.length; index++) {
    roll -= weights[index];
    if (roll <= 0) return available[index];
  }
  return available[available.length - 1];
}

export function chooseEnemyBuilding(faction, existing = []) {
  const living = existing.filter(building => building?.parent && building.userData?.hp > 0);
  const roleCounts = living.reduce((counts, building) => {
    const role = building.userData?.role || "economy";
    counts[role] = (counts[role] || 0) + 1;
    return counts;
  }, {});
  const candidates = faction?.buildings || [];
  const priorities = [
    roleCounts.military < 1 ? "military" : null,
    roleCounts.economy < 2 ? "economy" : null,
    roleCounts.defense < 2 ? "defense" : null,
    roleCounts.economy < 4 ? "economy" : null,
    roleCounts.military < 2 ? "military" : null,
    "defense"
  ].filter(Boolean);
  for (const role of priorities) {
    const match = candidates.find(building => building.role === role);
    if (match) return match;
  }
  return candidates[0] || null;
}
