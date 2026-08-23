import * as THREE from "three";
import { RTSWorld } from "./world.js";
import { DEFAULT_MAP } from "./maps.js";
import { currentLiveSeatCount, runtimeMapStarts } from "./runtimeMapStarts.js";
import { flatHeightAt } from "./mapVisuals.js";

const previousTick = RTSWorld.prototype.tick;

function activeStarts() {
  if (Array.isArray(DEFAULT_MAP.runtimeStarts) && DEFAULT_MAP.runtimeStarts.length) {
    return DEFAULT_MAP.runtimeStarts.map(point => [...point]);
  }
  return runtimeMapStarts(DEFAULT_MAP, currentLiveSeatCount());
}

function translateOwner(world, owner, desired) {
  const capital = world.entities.find(entity => entity.parent && entity.userData.owner === owner && entity.userData.type === "capital");
  if (!capital) return false;
  const target = new THREE.Vector3(...desired);
  const delta = target.clone().sub(capital.position);
  if (delta.lengthSq() < .01) return true;
  for (const entity of world.entities) {
    if (!entity.parent || entity.userData.owner !== owner) continue;
    entity.position.add(delta);
    entity.position.y = flatHeightAt(DEFAULT_MAP, entity.position.x, entity.position.z);
    if (entity.userData.target?.isVector3) entity.userData.target.add(delta);
  }
  return true;
}

function applySelectedStarts(world) {
  const starts = activeStarts();
  world.__axmAppliedMapStarts ||= new Set();
  for (let index = 2; index < Math.min(4, starts.length); index++) {
    const owner = `seat-${index + 1}`;
    const key = `${DEFAULT_MAP.id}:${owner}:${starts[index].join(",")}`;
    if (world.__axmAppliedMapStarts.has(key)) continue;
    if (translateOwner(world, owner, starts[index])) world.__axmAppliedMapStarts.add(key);
  }
}

RTSWorld.prototype.tick = function selectedMapSeatTick(time, dt) {
  const result = previousTick.call(this, time, dt);
  applySelectedStarts(this);
  return result;
};
