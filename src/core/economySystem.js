import { AGE_DATA, RESOURCE_KEYS } from "../factions.js";
import { incomeUpgradeMultiplier } from "../upgradeSystem.js";

export const BASE_INCOME = Object.freeze({ food: .78, wood: .68, stone: .48, gold: .44 });

function finite(value, fallback = 0) {
  const number = Number(value);
  return Number.isFinite(number) ? number : fallback;
}

export function normalizeAllocation(allocation = {}) {
  const values = Object.fromEntries(RESOURCE_KEYS.map(key => [key, finite(allocation[key], 0)]));
  const total = Object.values(values).reduce((sum, value) => sum + value, 0) || 1;
  return Object.fromEntries(RESOURCE_KEYS.map(key => [key, values[key] / total]));
}

function livingBuildingIncome(faction, buildings, resourceKey) {
  let income = 0;
  for (const building of buildings || []) {
    if (!building?.parent || Number(building.userData?.hp || 0) <= 0) continue;
    const definition = faction?.buildings?.find(item => item.id === building.userData?.id);
    income += finite(definition?.income?.[resourceKey], 0);
  }
  return income;
}

export function calculateIncomeRate({
  faction,
  workforce = 0,
  allocation = {},
  age = 0,
  buildings = [],
  territoryBonus = {},
  upgradeLevels = {}
} = {}) {
  if (!faction) throw new Error("calculateIncomeRate requires a faction.");
  const ageMultiplier = AGE_DATA[age]?.multiplier ?? 1;
  const upgradeMultiplier = incomeUpgradeMultiplier(upgradeLevels);
  const shares = normalizeAllocation(allocation);
  const rate = {};

  for (const key of RESOURCE_KEYS) {
    let gain = finite(workforce, 0) * shares[key] * BASE_INCOME[key] * finite(faction.economy?.[key], 1) * ageMultiplier;
    gain += livingBuildingIncome(faction, buildings, key);
    gain += finite(territoryBonus?.[key], 0) * ageMultiplier;
    rate[key] = gain * upgradeMultiplier;
  }

  return rate;
}

export function applyIncomeTick(resources, rates, dt) {
  const step = Math.max(0, finite(dt, 0));
  for (const key of RESOURCE_KEYS) resources[key] = finite(resources[key], 0) + finite(rates?.[key], 0) * step;
  return resources;
}

export function livingEconomyBuildingCount(buildings = []) {
  return buildings.filter(building => building?.parent && Number(building.userData?.hp || 0) > 0 && building.userData?.role === "economy").length;
}

export function populationGrowthInterval(economyBuildingCount = 0, side = "player") {
  const count = Math.max(0, Math.trunc(finite(economyBuildingCount, 0)));
  return side === "enemy" ? Math.max(27, 49 - count * 5) : Math.max(26, 48 - count * 5);
}

export function advancePopulationClock({ clock = 0, dt = 0, buildings = [], side = "player" } = {}) {
  const economyBuildingCount = livingEconomyBuildingCount(buildings);
  const interval = populationGrowthInterval(economyBuildingCount, side);
  const nextClock = Math.max(0, finite(clock, 0)) + Math.max(0, finite(dt, 0));
  if (nextClock < interval) return { clock: nextClock, growth: 0, interval, economyBuildingCount };
  return { clock: 0, growth: 1, interval, economyBuildingCount };
}
