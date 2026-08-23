import { DEFAULT_MAP } from "./maps.js";
import { makeMatchId, recordMatchStats } from "./matchStatsStore.js";

let timer = null;

function factionFor(world, owner) {
  return world?.__axmFactionByOwner?.[owner] || null;
}

function living(world, owner, type) {
  return (world?.entities || []).filter(entity => entity?.parent && entity.userData?.hp > 0 && entity.userData?.owner === owner && (!type || entity.userData.type === type));
}

function persist(world, metrics) {
  if (!world || !metrics?.result || metrics.__axmFactionStatsPersisted) return false;
  const faction = factionFor(world, "player");
  if (!faction?.id) return false;
  metrics.__axmFactionStatsPersisted = true;
  const player = metrics.owners?.get?.("player") || {};
  const result = String(metrics.result).toLowerCase();
  const domination = Number(world.__axmMapDominationMomentum?.byOwner?.player?.score || 0);
  const startedAtKey = Math.round((performance.timeOrigin || Date.now()) / 1000);
  const id = makeMatchId(["skirmish", startedAtKey, DEFAULT_MAP?.id, faction.id, Math.round(metrics.elapsed * 10), result]);

  recordMatchStats({
    id,
    recordedAt: new Date().toISOString(),
    mode: "skirmish",
    result,
    mapId: DEFAULT_MAP?.id || "unknown",
    mapName: DEFAULT_MAP?.name || DEFAULT_MAP?.id || "Skirmish",
    durationSeconds: metrics.elapsed,
    team: {
      damage: Number(player.damage || 0),
      kills: Number(player.kills || 0),
      finalMapDomination: domination
    },
    participants: [{
      seatId: "player",
      controller: "human",
      factionId: faction.id,
      factionName: faction.name || faction.id,
      result,
      damage: Number(player.damage || 0),
      kills: Number(player.kills || 0),
      formationsFielded: Number(player.formationsFielded || 0),
      formationsLost: Number(player.formationsLost || 0),
      survivors: living(world, "player", "squad").length,
      structuresFielded: Number(player.structuresFielded || 0),
      structuresLost: Number(player.structuresLost || 0) + Number(player.capitalsLost || 0),
      orders: Number(player.orders || 0),
      mapDomination: domination
    }]
  });
  return true;
}

function attach() {
  const world = window.__AXM_RTS_WORLD__;
  const metrics = world?.__axmSkirmishMetrics;
  if (!world || !metrics) return false;
  if (world.__axmFactionStatsPersistenceAttached) return true;
  world.__axmFactionStatsPersistenceAttached = true;
  const previousTick = world.tick.bind(world);
  world.tick = function factionStatsPersistenceTick(time, dt) {
    const result = previousTick(time, dt);
    persist(world, world.__axmSkirmishMetrics);
    return result;
  };
  persist(world, metrics);
  return true;
}

if (!attach()) {
  timer = setInterval(() => {
    if (attach() && timer) clearInterval(timer);
  }, 150);
}
