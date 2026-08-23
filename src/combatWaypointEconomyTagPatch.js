import { RTSWorld } from "./world.js";

const previousSpawnSquad = RTSWorld.prototype.spawnSquad;
const ECONOMY_ROLES = new Set(["economy", "economic", "worker", "civilian", "villager", "gatherer", "trader", "merchant", "laborer", "labourer"]);

RTSWorld.prototype.spawnSquad = function combatWaypointTaggedSpawn(def, faction, pos, enemy = false, countOverride = null) {
  const entity = previousSpawnSquad.call(this, def, faction, pos, enemy, countOverride);
  if (!entity?.userData || !def) return entity;

  const role = String(def.strategicRole || def.unitRole || def.role || "").toLowerCase();
  entity.userData.unitRole = role || entity.userData.unitRole || null;
  if (
    def.economyUnit === true || def.isEconomyUnit === true || def.worker === true || def.civilian === true ||
    ECONOMY_ROLES.has(role)
  ) {
    entity.userData.economyUnit = true;
  }
  return entity;
};
