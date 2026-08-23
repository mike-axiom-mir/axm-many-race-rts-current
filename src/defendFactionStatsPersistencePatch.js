import { FACTIONS } from "./factions.js";
import { makeMatchId, recordMatchStats } from "./matchStatsStore.js";

let timer = null;

function resultFor(state) {
  if (!state?.ended) return "unknown";
  if (state.workshop?.parent && state.targetWaves > 0 && state.wave >= state.targetWaves) return "victory";
  return state.workshop?.parent ? "complete" : "defeat";
}

function workshopIntegrity(state, metrics) {
  const max = Number(state.workshop?.userData?.maxHp || metrics?.workshopMaxHp || 1);
  const hp = state.workshop?.parent ? Math.max(0, Number(state.workshop.userData.hp || 0)) : 0;
  return Math.max(0, Math.min(100, hp / Math.max(1, max) * 100));
}

function persist(api) {
  const { state, metrics } = api || {};
  if (!state?.ended || !metrics || metrics.__axmFactionStatsPersisted) return false;
  const participants = [];
  const result = resultFor(state);
  const wavesCleared = Array.isArray(metrics.waveTimeline) ? metrics.waveTimeline.length : Math.max(0, Number(state.wave || 0) - (state.workshop?.parent ? 0 : 1));
  const integrity = workshopIntegrity(state, metrics);

  for (const seat of state.seats || []) {
    if (!seat || seat.controller === "closed") continue;
    const row = metrics.seats?.get?.(seat.id) || {};
    const faction = FACTIONS[seat.factionId];
    participants.push({
      seatId: seat.id,
      controller: seat.controller || "unknown",
      factionId: seat.factionId || "unknown",
      factionName: faction?.name || seat.factionId || "Unknown",
      result,
      damage: Number(row.damage || 0),
      kills: Number(row.kills || 0),
      formationsFielded: Number(row.recruited || 0),
      formationsLost: Number(row.lost || 0),
      survivors: (api.world?.entities || []).filter(entity => entity?.parent && entity.userData?.hp > 0 && entity.userData?.owner === "player" && entity.userData?.seatId === seat.id && entity.userData.type === "squad").length,
      orders: Number(row.orders || 0),
      wavesCleared,
      workshopIntegrity: integrity
    });
  }

  if (!participants.length) return false;
  metrics.__axmFactionStatsPersisted = true;
  const startedAtKey = Math.round((performance.timeOrigin || Date.now()) / 1000);
  const factionSignature = participants.map(item => `${item.seatId}:${item.factionId}:${item.controller}`).join(",");
  const id = makeMatchId(["defend-workshop", startedAtKey, state.difficultyId, state.targetWaves, factionSignature, Math.round(metrics.elapsed * 10), result]);
  recordMatchStats({
    id,
    recordedAt: new Date().toISOString(),
    mode: "defend-workshop",
    result,
    mapId: "workshop-defense",
    mapName: "Defend the Workshop",
    difficulty: state.difficultyId || "normal",
    durationSeconds: Number(metrics.elapsed || 0),
    wavesCleared,
    team: {
      damage: typeof api.getMatchMetrics === "function" ? Number(api.getMatchMetrics()?.teamDamage || 0) : 0,
      kills: Number(metrics.enemiesDefeated || 0),
      passiveSupply: Number(metrics.passiveEarned || 0),
      waveRewards: Number(metrics.waveRewards || 0),
      finalSupply: Number(state.supply || 0),
      peakHostiles: Number(metrics.peakHostiles || 0),
      peakTowers: Number(metrics.peakTowers || 0),
      workshopIntegrity: integrity
    },
    participants
  });
  return true;
}

function attach() {
  const api = window.__AXM_DEFEND_WORKSHOP__;
  if (!api?.world || !api?.state || !api?.metrics) return false;
  if (api.__factionStatsPersistenceAttached) return true;
  api.__factionStatsPersistenceAttached = true;
  const originalTick = api.world.tick.bind(api.world);
  api.world.tick = function defendFactionStatsPersistenceTick(time, dt) {
    const result = originalTick(time, dt);
    persist(api);
    return result;
  };
  persist(api);
  return true;
}

if (!attach()) {
  timer = setInterval(() => {
    if (attach() && timer) clearInterval(timer);
  }, 150);
}
