import test from "node:test";
import assert from "node:assert/strict";

import {
  MATCH_STATS_SCHEMA_VERSION,
  MATCH_STATS_STORAGE_KEY,
  inspectMatchStatsStorage,
  readMatchStats,
  recordMatchStats,
  exportMatchStatsSnapshot
} from "../src/matchStatsStore.js";

class MemoryStorage {
  constructor(entries = {}) { this.map = new Map(Object.entries(entries)); }
  getItem(key) { return this.map.has(key) ? this.map.get(key) : null; }
  setItem(key, value) { this.map.set(String(key), String(value)); }
  removeItem(key) { this.map.delete(String(key)); }
}

function installStorage(raw = null) {
  const entries = raw === null ? {} : { [MATCH_STATS_STORAGE_KEY]: raw };
  globalThis.localStorage = new MemoryStorage(entries);
  return globalThis.localStorage;
}

function validLedger(overrides = {}) {
  return {
    schemaVersion: MATCH_STATS_SCHEMA_VERSION,
    updatedAt: "2026-09-09T00:00:00.000Z",
    matches: [{
      id: "match-existing",
      recordedAt: "2026-09-09T00:00:00.000Z",
      mode: "skirmish",
      result: "victory",
      mapId: "founders-crossing",
      participants: [{ seatId: "seat-1", controller: "human", factionId: "northpole", factionName: "Northpole", result: "victory" }]
    }],
    ...overrides
  };
}

function newMatch(id = "match-new") {
  return {
    id,
    recordedAt: "2026-09-09T01:00:00.000Z",
    mode: "skirmish",
    result: "victory",
    mapId: "founders-crossing",
    participants: [{ seatId: "seat-1", controller: "human", factionId: "northpole", factionName: "Northpole", result: "victory" }]
  };
}

test("absent storage remains writable and becomes schema-v1 history", () => {
  const storage = installStorage();
  assert.equal(inspectMatchStatsStorage().status, "ABSENT");
  const result = recordMatchStats(newMatch());
  assert.equal(result.stored, true);
  const persisted = JSON.parse(storage.getItem(MATCH_STATS_STORAGE_KEY));
  assert.equal(persisted.schemaVersion, MATCH_STATS_SCHEMA_VERSION);
  assert.deepEqual(persisted.matches.map(match => match.id), ["match-new"]);
});

test("valid history remains readable and append-only by match id", () => {
  installStorage(JSON.stringify(validLedger()));
  assert.equal(inspectMatchStatsStorage().status, "VALID");
  assert.deepEqual(readMatchStats().matches.map(match => match.id), ["match-existing"]);
  assert.equal(recordMatchStats(newMatch("match-existing")).reason, "duplicate");
});

test("malformed JSON is held and cannot be overwritten by a new result", () => {
  const raw = '{"schemaVersion":1,"matches":[';
  const storage = installStorage(raw);
  const before = storage.getItem(MATCH_STATS_STORAGE_KEY);
  const status = inspectMatchStatsStorage();
  assert.equal(status.status, "HELD");
  assert.equal(status.reason, "malformed-json");
  const result = recordMatchStats(newMatch());
  assert.equal(result.stored, false);
  assert.equal(result.reason, "history-held");
  assert.equal(storage.getItem(MATCH_STATS_STORAGE_KEY), before);
});

test("future schema is held instead of being silently normalized to v1", () => {
  const raw = JSON.stringify(validLedger({ schemaVersion: MATCH_STATS_SCHEMA_VERSION + 1 }));
  const storage = installStorage(raw);
  const status = inspectMatchStatsStorage();
  assert.equal(status.status, "HELD");
  assert.equal(status.reason, "future-schema-version");
  assert.equal(recordMatchStats(newMatch()).reason, "history-held");
  assert.equal(storage.getItem(MATCH_STATS_STORAGE_KEY), raw);
});

test("invalid ledger shape is held instead of becoming empty history", () => {
  const raw = JSON.stringify({ schemaVersion: MATCH_STATS_SCHEMA_VERSION, matches: {} });
  const storage = installStorage(raw);
  assert.deepEqual(inspectMatchStatsStorage(), {
    status: "HELD",
    reason: "invalid-ledger-shape",
    schemaVersion: MATCH_STATS_SCHEMA_VERSION,
    rawBytes: new TextEncoder().encode(raw).byteLength,
    matchCount: 0
  });
  assert.equal(recordMatchStats(newMatch()).reason, "history-held");
  assert.equal(storage.getItem(MATCH_STATS_STORAGE_KEY), raw);
});

test("duplicate durable identities are held before aggregation or append", () => {
  const duplicate = validLedger({ matches: [validLedger().matches[0], validLedger().matches[0]] });
  installStorage(JSON.stringify(duplicate));
  const status = inspectMatchStatsStorage();
  assert.equal(status.status, "HELD");
  assert.equal(status.reason, "duplicate-match-id");
  assert.equal(readMatchStats().matches.length, 0);
});

test("held history export preserves exact rejected bytes for recovery", () => {
  const raw = '{"schemaVersion":99,"matches":[]}';
  installStorage(raw);
  const snapshot = exportMatchStatsSnapshot();
  assert.equal(snapshot.storage.status, "HELD");
  assert.equal(snapshot.rejectedRaw, raw);
  assert.equal(snapshot.ledger.matches.length, 0);
});

test.after(() => { delete globalThis.localStorage; });
