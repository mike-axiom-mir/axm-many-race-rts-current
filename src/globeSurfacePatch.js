import { GlobeRTSWorld } from "./globeWorld.js";
import { skinById } from "./worldCatalog.js";

const originalMovement = GlobeRTSWorld.prototype.updateMovement;
const originalTick = GlobeRTSWorld.prototype.tick;

function surfaceEffects(world, entity) {
  if (!entity?.userData?.normal) return { movement: 1, hazards: [] };
  let movement = 1;
  const hazards = [];
  for (const paint of world.map?.surfacePaint || []) {
    if (paint.enabled === false || !paint.geo) continue;
    const normal = world.normalFromGeo(paint.geo);
    const distance = entity.userData.normal.angleTo(normal) * world.radius;
    if (distance > Number(paint.radius || 5)) continue;
    const skin = skinById(paint.skin);
    movement *= Number(skin.movement || 1);
    if (skin.hazardous) hazards.push({ paint, skin });
  }
  return { movement: Math.max(.35, Math.min(1.35, movement)), hazards };
}

GlobeRTSWorld.prototype.updateMovement = function surfaceAwareMovement(entity, dt) {
  const data = entity.userData;
  const base = data.speed || 0;
  const effects = surfaceEffects(this, entity);
  data.surfaceMovement = effects.movement;
  data.speed = base * effects.movement;
  originalMovement.call(this, entity, dt);
  data.speed = base;
};

GlobeRTSWorld.prototype.tick = function surfaceAwareTick(time, dt) {
  for (const entity of [...this.entities]) {
    if (!entity.parent || entity.userData.hp <= 0) continue;
    const effects = surfaceEffects(this, entity);
    entity.userData.surfaceSkin = effects.hazards[0]?.paint?.skin || null;
    if (effects.hazards.length && entity.userData.type !== "capital") {
      entity.userData.hp -= 3.5 * effects.hazards.length * dt;
      if (entity.userData.hp <= 0) this.removeEntity(entity);
    }
  }
  return originalTick.call(this, time, dt);
};
