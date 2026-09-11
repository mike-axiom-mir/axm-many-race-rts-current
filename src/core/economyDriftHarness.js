import { FACTIONS, RESOURCE_KEYS } from "../factions.js";
import { createEconomyDriftProbe } from "./economyDriftProbe.js";
import { calculateIncomeRate } from "./economySystem.js";

function cloneResources(resources) {
  return Object.fromEntries(RESOURCE_KEYS.map(key => [key, Number(resources[key] || 0)]));
}

function integrate(resources, rates, dt) {
  for (const key of RESOURCE_KEYS) resources[key] += Number(rates[key] || 0) * dt;
}

function step(probe, resourceRef, live, input, dt) {
  const before = cloneResources(live);
  const rates = calculateIncomeRate(input);
  integrate(live, rates, dt);
  return probe.observeIncomeTick({
    resources: resourceRef,
    beforeResources: before,
    afterResources: cloneResources(live),
    rates,
    dt,
    input
  });
}

function baseInput() {
  return {
    faction: FACTIONS.ironvale,
    workforce: 20,
    allocation: { food: .30, wood: .30, stone: .20, gold: .20 },
    age: 0,
    buildings: [],
    territoryBonus: {},
    upgradeLevels: {}
  };
}

function constantStateCase() {
  const probe = createEconomyDriftProbe({ tickRate: 20, resourceTolerance: 1e-9 });
  const resourceRef = {};
  const live = { food: 300, wood: 300, stone: 180, gold: 170 };
  const input = baseInput();
  const dts = [.016, .017, .014, .031, .022, .019, .011, .028];
  for (let cycle = 0; cycle < 80; cycle++) for (const dt of dts) step(probe, resourceRef, live, input, dt);
  const report = probe.exportReceipt();
  const channel = report.channels.player;
  return {
    name: "constant changing-frame cadence remains zero-drift",
    pass: Boolean(channel?.strictZeroResourceDrift),
    maxAbsResourceDrift: channel?.maxAbsResourceDrift ?? null
  };
}

function externalSpendCase() {
  const probe = createEconomyDriftProbe({ tickRate: 20, resourceTolerance: 1e-9 });
  const resourceRef = {};
  const live = { food: 350, wood: 310, stone: 180, gold: 190 };
  const input = baseInput();
  for (let i = 0; i < 40; i++) step(probe, resourceRef, live, input, .017);
  live.food -= 65;
  live.gold -= 30;
  for (let i = 0; i < 40; i++) step(probe, resourceRef, live, input, .017);
  const channel = probe.exportReceipt().channels.player;
  return {
    name: "external spending is mirrored instead of reported as economy drift",
    pass: Boolean(channel?.strictZeroResourceDrift) && channel.externalResourceAdjustments >= 1,
    maxAbsResourceDrift: channel?.maxAbsResourceDrift ?? null,
    externalResourceAdjustments: channel?.externalResourceAdjustments ?? 0
  };
}

function changingSnapshotCase() {
  const probe = createEconomyDriftProbe({ tickRate: 20, resourceTolerance: 1e-12 });
  const resourceRef = {};
  const live = { food: 300, wood: 300, stone: 180, gold: 170 };
  const before = baseInput();
  const after = { ...baseInput(), workforce: 34, allocation: { food: .55, wood: .15, stone: .15, gold: .15 }, age: 1 };
  step(probe, resourceRef, live, before, .03);
  step(probe, resourceRef, live, after, .03);
  const report = probe.exportReceipt();
  const channel = report.channels.player;
  return {
    name: "mid-tick economy change is detected as fixed-step timing drift",
    pass: Boolean(channel && channel.maxAbsResourceDrift > 1e-8 && report.authorityTransferred === false),
    detectedDrift: channel?.maxAbsResourceDrift ?? 0,
    authorityTransferred: report.authorityTransferred
  };
}

export function runEconomyDriftHarness() {
  const tests = [constantStateCase(), externalSpendCase(), changingSnapshotCase()];
  const failed = tests.filter(test => !test.pass);
  return {
    schema: "axm-rts-economy-drift-harness/v1",
    ok: failed.length === 0,
    passed: tests.length - failed.length,
    failed: failed.length,
    total: tests.length,
    authorityTransferred: false,
    meaning: "This validates the shadow probe itself. It does not claim a real match has zero drift; real-match evidence comes from window.__AXM_RTS_ECONOMY_DRIFT__.report().",
    tests
  };
}
