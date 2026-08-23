export const MATCH_STATS_SCHEMA_VERSION = 1;
export const MATCH_STATS_STORAGE_KEY = "axm.rts.matchStats.v1";
export const MATCH_STATS_MAX_MATCHES = 300;

function finite(value, fallback = 0) {
  const number = Number(value);
  return Number.isFinite(number) ? number : fallback;
}

function clampInt(value, min = 0, max = Number.MAX_SAFE_INTEGER) {
  return Math.max(min, Math.min(max, Math.round(finite(value, min))));
}

function safeString(value, fallback = "") {
  const text = String(value ?? fallback).trim();
  return text.slice(0, 180);
}

function clone(value) {
  return JSON.parse(JSON.stringify(value));
}

function emptyLedger() {
  return {
    schemaVersion: MATCH_STATS_SCHEMA_VERSION,
    updatedAt: null,
    matches: []
  };
}

function normalizeParticipant(value = {}) {
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
    mapDomination: Math.max(-100, Math.min(100, finite(value.mapDomination))),
    wavesCleared: clampInt(value.wavesCleared),
    workshopIntegrity: Math.max(0, Math.min(100, finite(value.workshopIntegrity)))
  };
}

function normalizeMatch(value = {}) {
  const participants = Array.isArray(value.participants) ? value.participants.map(normalizeParticipant) : [];
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
      workshopIntegrity: Math.max(0, Math.min(100, finite(value.team?.workshopIntegrity))),
      finalMapDomination: Math.max(-100, Math.min(100, finite(value.team?.finalMapDomination)))
    },
    participants
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

function loadRaw() {
  if (!storageAvailable()) return emptyLedger();
  try {
    const parsed = JSON.parse(globalThis.localStorage.getItem(MATCH_STATS_STORAGE_KEY) || "null");
    if (!parsed || !Array.isArray(parsed.matches)) return emptyLedger();
    return {
      schemaVersion: MATCH_STATS_SCHEMA_VERSION,
      updatedAt: parsed.updatedAt || null,
      matches: parsed.matches.map(normalizeMatch).filter(match => match.id)
    };
  } catch {
    return emptyLedger();
  }
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

function factionKey(participant) {
  return participant?.factionId || "unknown";
}

function resultFlags(result) {
  const value = String(result || "").toLowerCase();
  return {
    win: value === "victory" || value === "win" || value === "won",
    loss: value === "defeat" || value === "loss" || value === "lost"
  };
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

export function readMatchStats() {
  return clone(loadRaw());
}

export function recordMatchStats(matchInput) {
  const match = normalizeMatch(matchInput);
  if (!match.id || !match.participants.length) return { stored: false, reason: "invalid-match", match: null };
  const ledger = loadRaw();
  if (ledger.matches.some(existing => existing.id === match.id)) return { stored: false, reason: "duplicate", match: clone(match) };
  ledger.matches.push(match);
  if (ledger.matches.length > MATCH_STATS_MAX_MATCHES) ledger.matches.splice(0, ledger.matches.length - MATCH_STATS_MAX_MATCHES);
  ledger.updatedAt = new Date().toISOString();
  const stored = saveRaw(ledger);
  return { stored, reason: stored ? "stored" : "storage-unavailable", match: clone(match) };
}

export function factionStats(options = {}) {
  const ledger = loadRaw();
  const controllerFilter = options.controller ? String(options.controller) : null;
  const modeFilter = options.mode ? String(options.mode) : null;
  const output = new Map();

  for (const match of ledger.matches) {
    if (modeFilter && match.mode !== modeFilter) continue;
    for (const participant of match.participants) {
      if (controllerFilter && participant.controller !== controllerFilter) continue;
      const key = factionKey(participant);
      if (!output.has(key)) {
        output.set(key, {
          factionId: key,
          factionName: participant.factionName || key,
          matches: 0,
          wins: 0,
          losses: 0,
          timeSeconds: 0,
          damage: 0,
          kills: 0,
          formationsFielded: 0,
          formationsLost: 0,
          survivors: 0,
          structuresFielded: 0,
          structuresLost: 0,
          orders: 0,
          wavesCleared: 0,
          bestWavesCleared: 0,
          dominationSum: 0,
          dominationSamples: 0,
          workshopIntegritySum: 0,
          workshopIntegritySamples: 0,
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
      if (Number.isFinite(participant.mapDomination)) {
        row.dominationSum += participant.mapDomination;
        row.dominationSamples++;
      }
      if (participant.workshopIntegrity > 0 || match.mode === "defend-workshop") {
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
    averageMapDomination: row.dominationSamples ? row.dominationSum / row.dominationSamples : 0,
    averageWorkshopIntegrity: row.workshopIntegritySamples ? row.workshopIntegritySum / row.workshopIntegritySamples : 0
  })).sort((a, b) => b.matches - a.matches || b.wins - a.wins || a.factionName.localeCompare(b.factionName));
}

export function statsOverview(options = {}) {
  const matches = loadRaw().matches.filter(match => !options.mode || match.mode === options.mode);
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
  return {
    exportedAt: new Date().toISOString(),
    storageKey: MATCH_STATS_STORAGE_KEY,
    ledger: readMatchStats(),
    overview: statsOverview()
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
  exportSnapshot: exportMatchStatsSnapshot,
  storageAvailable
};

if (typeof window !== "undefined") window.AXMMatchStats = MatchStatsStore;
