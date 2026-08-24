import { AGE_DATA, FACTIONS, RESOURCE_KEYS } from "../factions.js";
import { incomeUpgradeMultiplier } from "../upgradeSystem.js";
import {
  BASE_INCOME,
  advancePopulationClock,
  applyIncomeTick,
  calculateIncomeRate,
  normalizeAllocation,
  populationGrowthInterval
} from "./economySystem.js";

function legacyIncomeRate({ faction, workforce, allocation, age, buildings = [], territoryBonus = {}, upgradeLevels = {} }) {
  const ageMult = AGE_DATA[age].multiplier;
  const shares = normalizeAllocation(allocation);
  const upgradeMult = incomeUpgradeMultiplier(upgradeLevels);
  const rate = {};
  for (const key of RESOURCE_KEYS) {
    let gain = workforce * shares[key] * BASE_INCOME[key] * (faction.economy[key] || 1) * ageMult;
    for (const building of buildings) {
      if (!building.parent || building.userData.hp <= 0) continue;
      const def = faction.buildings.find(item => item.id === building.userData.id);
      gain += def?.income?.[key] || 0;
    }
    gain += (territoryBonus[key] || 0) * ageMult;
    rate[key] = gain * upgradeMult;
  }
  return rate;
}

function building(id, role = "economy", hp = 500) {
  return { parent: { live: true }, userData: { id, role, hp } };
}

function vectorClose(a, b, tolerance = 1e-10) {
  return RESOURCE_KEYS.every(key => Math.abs(Number(a[key] || 0) - Number(b[key] || 0)) <= tolerance);
}

function rateCase(name, input) {
  const legacy = legacyIncomeRate(input);
  const shared = calculateIncomeRate(input);
  return { name, pass: vectorClose(legacy, shared), legacy, shared };
}

function fixedStepCase() {
  const input = {
    faction: FACTIONS.greenwake,
    workforce: 27,
    allocation: { food: 35, wood: 30, stone: 15, gold: 20 },
    age: 1,
    buildings: [building("greenwake-grove"), building("greenwake-muster", "military")],
    territoryBonus: { food: .18, wood: .12 },
    upgradeLevels: { supply: 1 }
  };
  const rate = calculateIncomeRate(input);
  const fixed = { food: 300, wood: 300, stone: 150, gold: 160 };
  const direct = { ...fixed };
  const dt = 1 / 20;
  for (let tick = 0; tick < 200; tick++) applyIncomeTick(fixed, rate, dt);
  applyIncomeTick(direct, rate, 10);
  return {
    name: "20 Hz accumulation equals same-state 10 second accumulation",
    pass: vectorClose(fixed, direct, 1e-8),
    fixed,
    direct
  };
}

function populationCases() {
  const cases = [];
  for (const side of ["player", "enemy"]) {
    for (const count of [0, 1, 3, 8]) {
      const legacy = side === "enemy" ? Math.max(27, 49 - count * 5) : Math.max(26, 48 - count * 5);
      const shared = populationGrowthInterval(count, side);
      cases.push({ name: `${side} population interval with ${count} economy buildings`, pass: legacy === shared, legacy, shared });
    }
  }
  const growth = advancePopulationClock({ clock: 47.98, dt: .05, buildings: [], side: "player" });
  cases.push({ name: "player population clock keeps legacy reset-on-growth behavior", pass: growth.growth === 1 && growth.clock === 0, growth });
  return cases;
}

export function runEconomyParitySuite() {
  const tests = [
    rateCase("Ironvale founding economy", {
      faction: FACTIONS.ironvale,
      workforce: 20,
      allocation: { food: 30, wood: 30, stone: 20, gold: 20 },
      age: 0,
      buildings: [],
      territoryBonus: {},
      upgradeLevels: {}
    }),
    rateCase("Greenwake age 2 with grove, territory and supply upgrade", {
      faction: FACTIONS.greenwake,
      workforce: 29,
      allocation: { food: .38, wood: .27, stone: .14, gold: .21 },
      age: 1,
      buildings: [building("greenwake-grove"), building("greenwake-muster", "military")],
      territoryBonus: { food: .22, wood: .16, gold: .08 },
      upgradeLevels: { supply: 1 }
    }),
    rateCase("Northpole late economy with multiple districts", {
      faction: FACTIONS.northpole,
      workforce: 35,
      allocation: { food: 45, wood: 25, stone: 15, gold: 15 },
      age: 2,
      buildings: [building("storehouse"), building("storehouse"), building("workshop", "military")],
      territoryBonus: { food: .12, stone: .25, gold: .4 },
      upgradeLevels: { supply: 2 }
    }),
    fixedStepCase(),
    ...populationCases()
  ];
  const failed = tests.filter(test => !test.pass);
  return {
    schema: "axm-rts-economy-parity/v1",
    passed: tests.length - failed.length,
    failed: failed.length,
    total: tests.length,
    ok: failed.length === 0,
    authorityTransferred: false,
    tests
  };
}
