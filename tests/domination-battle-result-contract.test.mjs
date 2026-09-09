import test from "node:test";
import assert from "node:assert/strict";

import {
  applyDominationBattleResult,
  createDominationBattleResult,
  validateDominationBattleResult
} from "../src/dominationBattleAdapter.js";

function stagedPacket() {
  return {
    schemaVersion: 1,
    kind: "domination-territory-battle",
    id: "battle:contest:test",
    dominationMatchId: "world-domination-test",
    contestId: "contest:test",
    sourceTerritoryId: "source",
    targetTerritoryId: "target",
    map: { id: "test-map", projection: "flat" },
    attacker: {
      teamId: "azure",
      forces: [
        { id: "a-line", factionId: "northpole", unitId: "line", count: 4, veterancy: 0 },
        { id: "a-heavy", factionId: "northpole", unitId: "heavy", count: 2, veterancy: 1 }
      ]
    },
    defender: {
      teamId: "crimson",
      forces: [
        { id: "d-line", factionId: "clockwork", unitId: "line", count: 3, veterancy: 0 }
      ]
    },
    cityObjectives: [
      { id: "target-city-a", owner: "crimson" },
      { id: "target-city-b", owner: "crimson" }
    ]
  };
}

function validAttackerResult(packet = stagedPacket()) {
  return createDominationBattleResult(packet, {
    winner: "azure",
    attackerSurvivors: [
      { factionId: "northpole", unitId: "line", count: 3, veterancy: 0 },
      { factionId: "northpole", unitId: "heavy", count: 1, veterancy: 1 }
    ],
    defenderSurvivors: [],
    cities: {
      "target-city-a": "azure",
      "target-city-b": "neutral"
    }
  });
}

function errorCodes(validation) {
  return validation.errors.map(error => String(error).split(":", 1)[0]);
}

test("accepts a bounded result that only returns staged forces and known cities", () => {
  const packet = stagedPacket();
  const validation = validateDominationBattleResult(packet, validAttackerResult(packet));
  assert.deepEqual(validation, { valid: true, errors: [] });
});

test("rejects a result for a different domination match", () => {
  const packet = stagedPacket();
  const result = validAttackerResult(packet);
  result.dominationMatchId = "world-domination-other";

  const validation = validateDominationBattleResult(packet, result);
  assert.equal(validation.valid, false);
  assert.ok(errorCodes(validation).includes("RESULT_MATCH_MISMATCH"));
});

test("rejects survivor force identities that were never admitted to the battle", () => {
  const packet = stagedPacket();
  const result = validAttackerResult(packet);
  result.attackerSurvivors = [
    { factionId: "invented-faction", unitId: "god-unit", count: 1, veterancy: 0 }
  ];

  const validation = validateDominationBattleResult(packet, result);
  assert.equal(validation.valid, false);
  assert.ok(errorCodes(validation).includes("RESULT_SURVIVOR_FORCE_UNKNOWN"));
});

test("rejects survivor counts that mint more formations than entered the battle", () => {
  const packet = stagedPacket();
  const result = validAttackerResult(packet);
  result.attackerSurvivors = [
    { factionId: "northpole", unitId: "line", count: 3, veterancy: 0 },
    { factionId: "northpole", unitId: "line", count: 2, veterancy: 0 }
  ];

  const validation = validateDominationBattleResult(packet, result);
  assert.equal(validation.valid, false);
  assert.ok(errorCodes(validation).includes("RESULT_SURVIVOR_COUNT_EXCEEDS_STAGED"));
});

test("rejects fractional or negative survivor counts", () => {
  const packet = stagedPacket();
  for (const count of [1.5, -1]) {
    const result = validAttackerResult(packet);
    result.attackerSurvivors = [
      { factionId: "northpole", unitId: "line", count, veterancy: 0 }
    ];
    const validation = validateDominationBattleResult(packet, result);
    assert.equal(validation.valid, false);
    assert.ok(errorCodes(validation).includes("RESULT_SURVIVOR_COUNT_INVALID"));
  }
});

test("rejects unknown cities and owners outside the staged sides", () => {
  const packet = stagedPacket();
  const result = validAttackerResult(packet);
  result.cities = {
    "target-city-a": "third-party",
    "invented-city": "azure"
  };

  const validation = validateDominationBattleResult(packet, result);
  const codes = errorCodes(validation);
  assert.equal(validation.valid, false);
  assert.ok(codes.includes("RESULT_CITY_OWNER_INVALID"));
  assert.ok(codes.includes("RESULT_CITY_UNKNOWN"));
});

test("invalid result is rejected before canonical saved match is read or mutated", () => {
  const packet = stagedPacket();
  const result = validAttackerResult(packet);
  result.attackerSurvivors = [
    { factionId: "northpole", unitId: "line", count: 999999, veterancy: 0 }
  ];

  let storageReads = 0;
  globalThis.localStorage = {
    getItem() {
      storageReads += 1;
      throw new Error("persistence boundary must not be crossed");
    },
    setItem() {
      throw new Error("persistence boundary must not be crossed");
    },
    removeItem() {
      throw new Error("persistence boundary must not be crossed");
    }
  };

  try {
    const applied = applyDominationBattleResult(packet, result);
    assert.equal(applied.ok, false);
    assert.ok(applied.errors.some(error => error.startsWith("RESULT_SURVIVOR_COUNT_EXCEEDS_STAGED:")));
    assert.equal(storageReads, 0);
  } finally {
    delete globalThis.localStorage;
  }
});
