import { normalizeDominationMatch, DOMINATION_STORAGE_KEY, saveDominationMatch } from "./dominationState.js";
import { resolveTerritoryContest } from "./dominationContest.js";

export const DOMINATION_BATTLE_RESULT_VERSION = 1;

function clone(value) {
  return JSON.parse(JSON.stringify(value));
}

export function loadPendingDominationBattle() {
  try {
    const raw = localStorage.getItem("axm.manyRaceRts.pendingDominationBattle");
    return raw ? JSON.parse(raw) : null;
  } catch {
    return null;
  }
}

export function clearPendingDominationBattle() {
  localStorage.removeItem("axm.manyRaceRts.pendingDominationBattle");
}

export function validateDominationBattlePacket(packet) {
  const errors = [];
  const warnings = [];
  if (!packet || packet.kind !== "domination-territory-battle") errors.push("Not a World Domination territory battle packet.");
  if (!packet?.contestId) errors.push("Contest id is required.");
  if (!packet?.sourceTerritoryId || !packet?.targetTerritoryId) errors.push("Source and target territory ids are required.");
  if (!packet?.attacker?.teamId) errors.push("Attacking clan is required.");
  if (!Array.isArray(packet?.attacker?.forces) || !packet.attacker.forces.length) errors.push("Expedition packet contains no attacking formations.");
  if (!packet?.map) warnings.push("Target territory does not have a battle map attached yet.");
  if (!Array.isArray(packet?.cityObjectives) || !packet.cityObjectives.length) warnings.push("Territory has no city objectives.");
  return { valid: errors.length === 0, errors, warnings };
}

export function createDominationBattleResult(packet, overrides = {}) {
  const cities = Object.fromEntries((packet?.cityObjectives || []).map(city => [city.id, overrides.winner || packet?.defender?.teamId || "neutral"]));
  return {
    schemaVersion: DOMINATION_BATTLE_RESULT_VERSION,
    kind: "domination-territory-result",
    dominationMatchId: packet?.dominationMatchId || null,
    contestId: packet?.contestId || null,
    winner: overrides.winner || packet?.defender?.teamId || "neutral",
    attackerSurvivors: Array.isArray(overrides.attackerSurvivors) ? clone(overrides.attackerSurvivors) : [],
    defenderSurvivors: Array.isArray(overrides.defenderSurvivors) ? clone(overrides.defenderSurvivors) : [],
    cities: { ...cities, ...(overrides.cities || {}) },
    battleStats: { durationSeconds: 0, ...(overrides.battleStats || {}) },
    completedAt: Date.now()
  };
}

export function validateDominationBattleResult(packet, result) {
  const errors = [];
  if (!result || result.kind !== "domination-territory-result") errors.push("Not a World Domination result packet.");
  if (result?.contestId !== packet?.contestId) errors.push("Result contest id does not match the staged battle.");
  const allowedWinners = [packet?.attacker?.teamId, packet?.defender?.teamId].filter(Boolean);
  if (!allowedWinners.includes(result?.winner)) errors.push("Result winner is not one of the participating sides.");
  return { valid: errors.length === 0, errors };
}

export function applyDominationBattleResult(packet, result) {
  const validation = validateDominationBattleResult(packet, result);
  if (!validation.valid) return { ok: false, errors: validation.errors };
  let match;
  try {
    const raw = localStorage.getItem(DOMINATION_STORAGE_KEY);
    if (!raw) return { ok: false, errors: ["Saved World Domination match not found."] };
    match = normalizeDominationMatch(JSON.parse(raw));
  } catch (error) {
    return { ok: false, errors: [`Could not load saved match: ${error.message}`] };
  }
  if (packet.dominationMatchId && packet.dominationMatchId !== match.id) return { ok: false, errors: ["Battle belongs to a different World Domination match."] };
  const resolved = resolveTerritoryContest(match, packet.contestId, result);
  if (!resolved.ok) return { ok: false, errors: [resolved.error || "Contest resolution failed."] };
  saveDominationMatch(match);
  clearPendingDominationBattle();
  return { ok: true, match, contest: resolved.contest };
}

export function runtimeHintForMap(map) {
  if (!map) return { status: "awaiting-map", runtime: null, text: "Attach a map to this territory before a live RTS battle can run." };
  const projection = map.projection || map.embedded?.projection || "flat";
  if (projection === "globe") return { status: "adapter-needed", runtime: "globe.html", text: "Globe terrain is attached. A domination-force injection adapter still needs to feed this packet into Globe Conquest." };
  return { status: "adapter-needed", runtime: "skirmish.html", text: "Flat terrain is attached. A domination-force injection adapter still needs to feed this packet into Skirmish." };
}
