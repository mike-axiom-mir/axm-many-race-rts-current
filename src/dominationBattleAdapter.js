import { normalizeDominationMatch, DOMINATION_STORAGE_KEY, saveDominationMatch } from "./dominationState.js";
import { resolveTerritoryContest } from "./dominationContest.js";
import { withValidatedDominationBattleResult } from "./dominationResultContract.js";

export {
  DOMINATION_BATTLE_RESULT_VERSION,
  createDominationBattleResult,
  validateDominationBattlePacket,
  validateDominationBattleResult
} from "./dominationResultContract.js";

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

export function applyDominationBattleResult(packet, result) {
  return withValidatedDominationBattleResult(packet, result, () => {
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
  });
}

export function runtimeHintForMap(map) {
  if (!map) return { status: "awaiting-map", runtime: null, text: "Attach a map to this territory before a live RTS battle can run." };
  const projection = map.projection || map.embedded?.projection || "flat";
  if (projection === "globe") return { status: "adapter-needed", runtime: "globe.html", text: "Globe terrain is attached. A domination-force injection adapter still needs to feed this packet into Globe Conquest." };
  return { status: "adapter-needed", runtime: "skirmish.html", text: "Flat terrain is attached. A domination-force injection adapter still needs to feed this packet into Skirmish." };
}
