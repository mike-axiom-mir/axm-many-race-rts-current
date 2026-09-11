export const MATCH_STATS_SCHEMA_VERSION = 1;
export const MATCH_STATS_STORAGE_KEY = "axm.rts.matchStats.v1";
export const MATCH_STATS_MAX_MATCHES = 300;

function finite(value, fallback = 0) {
  const number = Number(value);
  return Number.isFinite(number) ? number : fallback;
}

function optionalFinite(value) {
  if (value === null || value === undefined || value === "") return null;
  const number = Number(value);
  return Number.isFinite(number) ? number : null;
}

function clampInt(value, min = 0, max = Number.MAX_SAFE_INTEGER) {
  return Math.max(min, Math.min(max, Math.round(finite(value, min))));
}

function safeString(value, fallback = "") {
  return String(value ?? fallback).trim().slice(0, 180);
}

function clone(value) {
  return JSON.parse(JSON.stringify(value));
}

function emptyLedger() {
  return { schemaVersion: MATCH_STATS_SCHEMA_VERSION, updatedAt: null, matches: [] };
}

function normalizeParticipant(value = {}) {
  const domination = optionalFinite(value.mapDomination);
  const integrity = optionalFinite(value.workshopIntegrity);
  return {
    seatId: safeString(value.seatId || value.owner || "player", "player"),
    controller: safeString(value.controller || "human", "human"),
    factionId: safeString(value.factionId || "unknown", "unknown"),
    factionName: safeString(value.factionName || value.factionId || "Unknown", "Unknown"),
    result: safeString(value.result || "unknown", "unknown").toLowerCase(),
    damage: Math.max(0, finite(value.damage)),
    kills: clampInt(value.kills),
    formationsFielded: clampInt(value.formationsFielded ?? value.recruited),
    formationsLost: clampInt(value.formationsLost ?? value.lost),
    survivors: clampInt(value.survivors),
    structuresFielded: clampInt(value.structuresFielded),
    structuresLost: clampInt(value.structuresLost),
    orders: clampInt(value.orders),
    mapDomination: domination === null ? null : Math.max(-100, Math.min(100, domination)),
    wavesCleared: clampInt(value.wavesCleared),
    workshopIntegrity: integrity === null ? null : Math.max(0, Math.min(100, integrity))
  };
}

function normalizeMatch(value = {}) {
  const finalDomination = optionalFinite(value.team?.finalMapDomination);
  const integrity = optionalFinite(value.team?.workshopIntegrity);
  return {
    id: safeString(value.id),
    recordedAt: safeString(value.recordedAt || new Date().toISOString()),
    mode: safeString(value.mode || "unknown", "unknown"),
    result: safeString(value.result || "unknown", "unknown").toLowerCase(),
    mapId: safeString(value.mapId || "unknown", "unknown"),
    mapName: safeString(value.mapName || value.mapId || "Unknown", "Unknown"),
    difficulty: safeString(value.difficulty || "", ""),
    durationSeconds: Math.max(0, finite(value.durationSeconds)),
    wavesCleared: clampInt(value.wavesCleared),
    team: {
      damage: Math.max(0, finite(value.team?.damage)),
      kills: clampInt(value.team?.kills),
      passiveSupply: Math.max(0, finite(value.team?.passiveSupply)),
      waveRewards: Math.max(0, finite(value.team?.waveRewards)),
      finalSupply: Math.max(0, finite(value.team?.finalSupply)),
      peakHostiles: clampInt(value.team?.peakHostiles),
      peakTowers: clampInt(value.team?.peakTowers),
      workshopIntegrity: integrity === null ? null : Math.max(0, Math.min(100, integrity)),
      finalMapDomination: finalDomination === null ? null : Math.max(-100, Math.min(100, finalDomination))
    },
    participants: Array.isArray(value.participants) ? value.participants.map(normalizeParticipant) : []
  };
}

function storageAvailable() {
  try {
    if (!globalThis.localStorage) return false;
    const key = "__axm_stats_probe__";
    globalThis.localStorage.setItem(key, "1");
    globalThis.localStorage.removeItem(key);
    return true;
  } catch {
    return false;
  }
}

function publicStorageReceipt(load) {
  return {
    status: load.status,
    reason: load.reason,
    schemaVersion: load.schemaVersion ?? null,
    rawBytes: load.raw == null ? 0 : new TextEncoder().encode(load.raw).byteLength,
    matchCount: load.ledger.matches.length
  };
}

function loadStoredLedger() {
  if (!storageAvailable()) {
    return { status: "UNAVAILABLE", reason: "storage-unavailable", schemaVersion: null, raw: null, ledger: emptyLedger() };
  }

  const raw = globalThis.localStorage.getItem(MATCH_STATS_STORAGE_KEY);
  if (raw === null) {
    return { status: "ABSENT", reason: "no-history", schemaVersion: null, raw: null, ledger: emptyLedger() };
  }

  let parsed;
  try {
    parsed = JSON.parse(raw);
  } catch {
    return { status: "HELD", reason: "malformed-json", schemaVersion: null, raw, ledger: emptyLedger() };
  }

  if (!parsed || typeof parsed !== "object" || Array.isArray(parsed) || !Array.isArray(parsed.matches)) {
    return { status: "HELD", reason: "invalid-ledger-shape", schemaVersion: parsed?.schemaVersion ?? null, raw, ledger: emptyLedger() };
  }

  if (!Number.isInteger(parsed.schemaVersion) || parsed.schemaVersion !== MATCH_STATS_SCHEMA_VERSION) {
    return {
      status: "HELD",
      reason: parsed.schemaVersion > MATCH_STATS_SCHEMA_VERSION ? "future-schema-version" : "unsupported-schema-version",
      schemaVersion: parsed.schemaVersion ?? null,
      raw,
      ledger: emptyLedger()
    };
  }

  const matches = parsed.matches.map(normalizeMatch);
  if (matches.some(match => !match.id)) {
    return { status: "HELD", reason: "match-missing-id", schemaVersion: parsed.schemaVersion, raw, ledger: emptyLedger() };
  }

  const ids = new Set();
  for (const match of matches) {
    if (ids.has(match.id)) {
      return { status: "HELD", reason: "duplicate-match-id", schemaVersion: parsed.schemaVersion, raw, ledger: emptyLedger() };
    }
    ids.add(match.id);
  }

  return {
    status: "VALID",
    reason: "verified-history",
    schemaVersion: parsed.schemaVersion,
    raw,
    ledger: {
      schemaVersion: MATCH_STATS_SCHEMA_VERSION,
      updatedAt: parsed.updatedAt || null,
      matches
    }
  };
}

function loadReadableLedger() {
  return loadStoredLedger().ledger;
}

function saveRaw(ledger) {
  if (!storageAvailable()) return false;
  try {
    globalThis.localStorage.setItem(MATCH_STATS_STORAGE_KEY, JSON.stringify(ledger));
    return true;
  } catch {
    return false;
  }
}

function resultFlags(result) {
  const value = String(result || "").toLowerCase();
  return {
    win: value === "victory" || value === "win" || value === "won",
    loss: value === "defeat" || value === "loss" || value === "lost"
  };
}

function participantMatches(participant, options) {
  if (options.controller && participant.controller !== String(options.controller)) return false;
  if (Array.isArray(options.controllers) && options.controllers.length && !options.controllers.includes(participant.controller)) return false;
  return true;
}

export function makeMatchId(parts = []) {
  const value = parts.map(part => safeString(part)).join("|");
  let hash = 2166136261 >>> 0;
  for (let index = 0; index < value.length; index++) {
    hash ^= value.charCodeAt(index);
    hash = Math.imul(hash, 16777619) >>> 0;
  }
  return `match-${hash.toString(16).padStart(8, "0")}`;
}

export function inspectMatchStatsStorage() {
  return clone(publicStorageReceipt(loadStoredLedger()));
}

export function readMatchStats() {
  return clone(loadReadableLedger());
}

export function recordMatchStats(matchInput) {
  const match = normalizeMatch(matchInput);
  if (!match.id || !match.participants.length) return { stored: false, reason: "invalid-match", match: null };

  const loaded = loadStoredLedger();
  if (loaded.status === "HELD") {
    return { stored: false, reason: "history-held", match: clone(match), storage: publicStorageReceipt(loaded) };
  }
  if (loaded.status === "UNAVAILABLE") {
    return { stored: false, reason: "storage-unavailable", match: clone(match), storage: publicStorageReceipt(loaded) };
  }

  const ledger = loaded.ledger;
  if (ledger.matches.some(existing => existing.id === match.id)) return { stored: false, reason: "duplicate", match: clone(match) };
  ledger.matches.push(match);
  if (ledger.matches.length > MATCH_STATS_MAX_MATCHES) ledger.matches.splice(0, ledger.matches.length - MATCH_STATS_MAX_MATCHES);
  ledger.updatedAt = new Date().toISOString();
  const stored = saveRaw(ledger);
  return { stored, reason: stored ? "stored" : "storage-unavailable", match: clone(match) };
}

export function factionStats(options = {}) {
  const ledger = loadReadableLedger();
  const modeFilter = options.mode ? String(options.mode) : null;
  const output = new Map();

  for (const match of ledger.matches) {
    if (modeFilter && match.mode !== modeFilter) continue;
    for (const participant of match.participants) {
      if (!participantMatches(participant, options)) continue;
      const key = participant.factionId || "unknown";
      if (!output.has(key)) {
        output.set(key, {
          factionId: key, factionName: participant.factionName || key,
          matches: 0, wins: 0, losses: 0, timeSeconds: 0, damage: 0, kills: 0,
          formationsFielded: 0, formationsLost: 0, survivors: 0,
          structuresFielded: 0, structuresLost: 0, orders: 0,
          wavesCleared: 0, bestWavesCleared: 0,
          dominationSum: 0, dominationSamples: 0,
          workshopIntegritySum: 0, workshopIntegritySamples: 0,
          modes: {}
        });
      }
      const row = output.get(key);
      const flags = resultFlags(participant.result || match.result);
      row.matches++;
      row.wins += flags.win ? 1 : 0;
      row.losses += flags.loss ? 1 : 0;
      row.timeSeconds += match.durationSeconds;
      row.damage += participant.damage;
      row.kills += participant.kills;
      row.formationsFielded += participant.formationsFielded;
      row.formationsLost += participant.formationsLost;
      row.survivors += participant.survivors;
      row.structuresFielded += participant.structuresFielded;
      row.structuresLost += participant.structuresLost;
      row.orders += participant.orders;
      row.wavesCleared += participant.wavesCleared;
      row.bestWavesCleared = Math.max(row.bestWavesCleared, participant.wavesCleared);
      if (participant.mapDomination !== null) {
        row.dominationSum += participant.mapDomination;
        row.dominationSamples++;
      }
      if (participant.workshopIntegrity !== null) {
        row.workshopIntegritySum += participant.workshopIntegrity;
        row.workshopIntegritySamples++;
      }
      row.modes[match.mode] = (row.modes[match.mode] || 0) + 1;
    }
  }

  return [...output.values()].map(row => ({
    ...row,
    winRate: row.matches ? row.wins / row.matches : 0,
    averageDamage: row.matches ? row.damage / row.matches : 0,
    averageMapDomination: row.dominationSamples ? row.dominationSum / row.dominationSamples : null,
    averageWorkshopIntegrity: row.workshopIntegritySamples ? row.workshopIntegritySum / row.workshopIntegritySamples : null
  })).sort((a, b) => b.matches - a.matches || b.wins - a.wins || a.factionName.localeCompare(b.factionName));
}

export function statsOverview(options = {}) {
  const ledger = loadReadableLedger();
  const modeFilter = options.mode ? String(options.mode) : null;
  const matches = ledger.matches.filter(match => {
    if (modeFilter && match.mode !== modeFilter) return false;
    return match.participants.some(participant => participantMatches(participant, options));
  });
  const factions = factionStats(options);
  const favorite = factions[0] || null;
  return {
    matches: matches.length,
    factionsPlayed: factions.length,
    favoriteFaction: favorite ? { factionId: favorite.factionId, factionName: favorite.factionName, matches: favorite.matches } : null,
    factions
  };
}

export function exportMatchStatsSnapshot() {
  const loaded = loadStoredLedger();
  return {
    exportedAt: new Date().toISOString(),
    storageKey: MATCH_STATS_STORAGE_KEY,
    storage: publicStorageReceipt(loaded),
    rejectedRaw: loaded.status === "HELD" ? loaded.raw : null,
    ledger: clone(loaded.ledger),
    overview: statsOverview({ controller: "human" })
  };
}

export const MatchStatsStore = {
  schemaVersion: MATCH_STATS_SCHEMA_VERSION,
  storageKey: MATCH_STATS_STORAGE_KEY,
  maxMatches: MATCH_STATS_MAX_MATCHES,
  read: readMatchStats,
  record: recordMatchStats,
  factions: factionStats,
  overview: statsOverview,
  inspectStorage: inspectMatchStatsStorage,
  exportSnapshot: exportMatchStatsSnapshot,
  storageAvailable
};

if (typeof window !== "undefined") window.AXMMatchStats = MatchStatsStore;
