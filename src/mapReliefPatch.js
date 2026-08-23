import { RTSWorld } from "./world.js";
import { MapDirector } from "./mapDirector.js";
import { DEFAULT_MAP } from "./maps.js";
import { flatHeightAt } from "./mapVisuals.js";

const originalSpawnCapital = RTSWorld.prototype.spawnCapital;
const originalSpawnBuilding = RTSWorld.prototype.spawnBuilding;
const originalSpawnFounder = RTSWorld.prototype.spawnFounder;
const originalSpawnSquad = RTSWorld.prototype.spawnSquad;
const originalUpdateMovement = RTSWorld.prototype.updateMovement;
const originalCreateSite = MapDirector.prototype.createSite;
const originalUnitsInside = MapDirector.prototype.unitsInside;

function groundEntity(entity) {
  if (!entity?.position) return entity;
  entity.position.y = flatHeightAt(DEFAULT_MAP, entity.position.x, entity.position.z);
  return entity;
}

RTSWorld.prototype.spawnCapital = function reliefCapital(faction, pos, enemy = false) {
  return groundEntity(originalSpawnCapital.call(this, faction, pos, enemy));
};

RTSWorld.prototype.spawnBuilding = function reliefBuilding(def, faction, pos, enemy = false) {
  return groundEntity(originalSpawnBuilding.call(this, def, faction, pos, enemy));
};

RTSWorld.prototype.spawnFounder = function reliefFounder(faction, pos, enemy = false) {
  return groundEntity(originalSpawnFounder.call(this, faction, pos, enemy));
};

RTSWorld.prototype.spawnSquad = function reliefSquad(unitDef, faction, pos, enemy = false, countOverride = null) {
  return groundEntity(originalSpawnSquad.call(this, unitDef, faction, pos, enemy, countOverride));
};

RTSWorld.prototype.updateMovement = function reliefMovement(entity, dt, time) {
  const result = originalUpdateMovement.call(this, entity, dt, time);
  if (!entity?.parent || (entity.userData.type !== "squad" && entity.userData.type !== "founder")) return result;
  const bounce = entity.userData.target ? Math.max(0, Math.sin(time * 9 + (entity.userData.phase || 0)) * .045) : 0;
  entity.position.y = flatHeightAt(DEFAULT_MAP, entity.position.x, entity.position.z) + bounce;
  return result;
};

MapDirector.prototype.createSite = function reliefSite(def) {
  const site = originalCreateSite.call(this, def);
  if (Array.isArray(def.position)) site.group.position.y = flatHeightAt(DEFAULT_MAP, def.position[0], def.position[2]);
  return site;
};

MapDirector.prototype.unitsInside = function reliefUnitsInside(owner, site) {
  if (!Array.isArray(site?.def?.position)) return originalUnitsInside.call(this, owner, site);
  const sx = Number(site.def.position[0] || 0);
  const sz = Number(site.def.position[2] || 0);
  return this.world.getLiving(owner).filter(entity => {
    if (entity.userData.type !== "squad" && entity.userData.type !== "founder") return false;
    return Math.hypot(entity.position.x - sx, entity.position.z - sz) <= site.def.radius;
  }).length;
};
