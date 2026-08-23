import * as THREE from "three";
import { RTSWorld } from "./world.js";
import { DEFAULT_MAP, mapPlayerStarts } from "./maps.js";

const previousTick = RTSWorld.prototype.tick;
const FALLBACK_STARTS = [
  [-36, 0, -22],
  [36, 0, 22],
  [-36, 0, 22],
  [36, 0, -22],
  [0, 0, -27],
  [0, 0, 27],
  [-42, 0, 0],
  [42, 0, 0]
];

function runtimeStarts() {
  const starts = mapPlayerStarts(DEFAULT_MAP);
  for (const candidate of FALLBACK_STARTS) {
    if (starts.length >= 4) break;
    const point = new THREE.Vector3(...candidate);
    const tooClose = starts.some(existing => point.distanceTo(new THREE.Vector3(...existing)) < 8);
    if (!tooClose) starts.push([...candidate]);
  }
  return starts;
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
    if (entity.userData.target?.isVector3) entity.userData.target.add(delta);
  }
  return true;
}

function applySelectedStarts(world) {
  const starts = runtimeStarts();
  world.__axmAppliedMapStarts ||= new Set();
  for (let index = 2; index < Math.min(4, starts.length); index++) {
    const owner = `seat-${index + 1}`;
    const key = `${DEFAULT_MAP.id}:${owner}`;
    if (world.__axmAppliedMapStarts.has(key)) continue;
    if (translateOwner(world, owner, starts[index])) world.__axmAppliedMapStarts.add(key);
  }
}

RTSWorld.prototype.tick = function selectedMapSeatTick(time, dt) {
  const result = previousTick.call(this, time, dt);
  applySelectedStarts(this);
  return result;
};
