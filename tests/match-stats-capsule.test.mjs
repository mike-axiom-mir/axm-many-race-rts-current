import test from "node:test";
import assert from "node:assert/strict";

import {
  MATCH_STATS_SCHEMA_VERSION,
  MATCH_STATS_STORAGE_KEY,
  exportMatchStatsSnapshot
} from "../src/matchStatsStore.js";
import {
  MATCH_STATS_CAPSULE_SCHEMA,
  canonicalMatchStatsJson,
  createMatchStatsCapsule,
  verifyMatchStatsCapsule
} from "../src/matchStatsCapsule.js";

class MemoryStorage {
  constructor(entries = {}) { this.map = new Map(Object.entries(entries)); }
  getItem(key) { return this.map.has(key) ? this.map.get(key) : null; }
  setItem(key, value) { this.map.set(String(key), String(value)); }
  removeItem(key) { this.map.delete(String(key)); }
}

function installStorage(raw = null) {
  globalThis.localStorage = new MemoryStorage(raw === null ? {} : { [MATCH_STATS_STORAGE_KEY]: raw });
}

function ledger(result = "victory") {
  return {
    schemaVersion: MATCH_STATS_SCHEMA_VERSION,
    updatedAt: "2026-09-09T00:00:00.000Z",
    matches: [{
      id: "match-capsule-1",
      recordedAt: "2026-09-09T00:00:00.000Z",
      mode: "skirmish",
      result,
      mapId: "founders-crossing",
      mapName: "Founders Crossing",
      difficulty: "",
      durationSeconds: 180,
      wavesCleared: 0,
      team: {
        damage: 120,
        kills: 4,
        passiveSupply: 0,
        waveRewards: 0,
        finalSupply: 80,
        peakHostiles: 0,
        peakTowers: 0,
        workshopIntegrity: null,
        finalMapDomination: 25
      },
      participants: [{
        seatId: "seat-1",
        controller: "human",
        factionId: "northpole",
        factionName: "Northpole",
        result,
        damage: 120,
        kills: 4,
        formationsFielded: 8,
        formationsLost: 2,
        survivors: 6,
        structuresFielded: 3,
        structuresLost: 1,
        orders: 12,
        mapDomination: 25,
        wavesCleared: 0,
        workshopIntegrity: null
      }]
    }]
  };
}

function validRaw(result = "victory") {
  return JSON.stringify(ledger(result));
}

function clone(value) {
  return JSON.parse(JSON.stringify(value));
}

test("capsule creation binds one admitted ledger to deterministic SHA-256 identity", async () => {
  installStorage(validRaw());
  const snapshot = exportMatchStatsSnapshot();
  const first = await createMatchStatsCapsule(snapshot);
  const second = await createMatchStatsCapsule(snapshot);

  assert.equal(first.status, "PASS");
  assert.equal(first.capsule.schema, MATCH_STATS_CAPSULE_SCHEMA);
  assert.equal(first.capsule.source.storageStatus, "VALID");
  assert.equal(first.capsule.source.storageKey, MATCH_STATS_STORAGE_KEY);
  assert.match(first.capsule.capsuleId, /^sha256:[0-9a-f]{64}$/);
  assert.match(first.capsule.ledgerSha256, /^[0-9a-f]{64}$/);
  assert.equal(second.capsuleId, first.capsuleId);
  assert.equal(second.capsule.ledgerSha256, first.capsule.ledgerSha256);
  assert.deepEqual(first.capsule.authority, {
    storageAuthority: false,
    importAuthority: false,
    mergeAuthority: false,
    canonAuthority: false
  });

  const verified = await verifyMatchStatsCapsule(first.capsule, { expectedCapsuleId: first.capsuleId });
  assert.equal(verified.status, "PASS");
  assert.equal(verified.matchCount, 1);
});

test("history mutation under the retained ledger digest is rejected", async () => {
  installStorage(validRaw());
  const created = await createMatchStatsCapsule();
  const tampered = clone(created.capsule);
  tampered.ledger.matches[0].participants[0].result = "defeat";

  const verified = await verifyMatchStatsCapsule(tampered);
  assert.equal(verified.status, "HOLD");
  assert.equal(verified.reason, "ledger-digest-mismatch");
});

test("whole-capsule mutation under the retained capsule id is rejected", async () => {
  installStorage(validRaw());
  const created = await createMatchStatsCapsule();
  const tampered = clone(created.capsule);
  tampered.source.storageStatus = "ABSENT";

  const verified = await verifyMatchStatsCapsule(tampered);
  assert.equal(verified.status, "HOLD");
  assert.equal(verified.reason, "capsule-id-mismatch");
});

test("a different internally valid capsule is rejected when the caller pins the expected id", async () => {
  installStorage(validRaw("victory"));
  const original = await createMatchStatsCapsule();

  installStorage(validRaw("defeat"));
  const substitute = await createMatchStatsCapsule();
  assert.equal((await verifyMatchStatsCapsule(substitute.capsule)).status, "PASS");

  const pinned = await verifyMatchStatsCapsule(substitute.capsule, { expectedCapsuleId: original.capsuleId });
  assert.equal(pinned.status, "HOLD");
  assert.equal(pinned.reason, "expected-capsule-mismatch");
});

test("authority escalation is rejected even when other capsule fields remain intact", async () => {
  installStorage(validRaw());
  const created = await createMatchStatsCapsule();
  const escalated = clone(created.capsule);
  escalated.authority.importAuthority = true;

  const verified = await verifyMatchStatsCapsule(escalated);
  assert.equal(verified.status, "HOLD");
  assert.equal(verified.reason, "authority-escalation");
});

test("held local history cannot be wrapped as a clean portable capsule", async () => {
  installStorage('{"schemaVersion":1,"matches":[');
  const created = await createMatchStatsCapsule();
  assert.deepEqual(created, {
    status: "HOLD",
    reason: "history-held",
    authority: {
      storageAuthority: false,
      importAuthority: false,
      mergeAuthority: false,
      canonAuthority: false
    },
    storageStatus: "HELD",
    capsule: null
  });
});

test("canonical JSON is key-order stable and rejects non-portable numeric state", () => {
  assert.equal(
    canonicalMatchStatsJson({ z: 2, a: { y: 1, x: true } }),
    canonicalMatchStatsJson({ a: { x: true, y: 1 }, z: 2 })
  );
  assert.throws(() => canonicalMatchStatsJson({ score: Number.NaN }), /non-finite number/);
});

test("capsule verifier rejects unsupported envelope claims instead of ignoring them", async () => {
  installStorage(validRaw());
  const created = await createMatchStatsCapsule();
  const extended = clone(created.capsule);
  extended.approvedForCanon = true;

  const verified = await verifyMatchStatsCapsule(extended);
  assert.equal(verified.status, "HOLD");
  assert.equal(verified.reason, "unsupported-capsule-envelope");
});

test.after(() => { delete globalThis.localStorage; });
