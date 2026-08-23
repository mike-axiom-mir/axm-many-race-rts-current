import { DEFAULT_MAP } from "./maps.js";
import { flatHeightAt } from "./mapVisuals.js";
import { firstLineOfSightBlocker as firstFortificationBlocker } from "./fortificationLineOfSight.js";

function positionOf(value) {
  if (!value) return { x: 0, y: 0, z: 0 };
  if (value.position) return { x: Number(value.position.x || 0), y: Number(value.position.y || 0), z: Number(value.position.z || 0) };
  return { x: Number(value.x || 0), y: Number(value.y || 0), z: Number(value.z || 0) };
}

export function lineOfSightHeight(value) {
  const data = value?.userData || {};
  if (Number.isFinite(Number(data.lineOfSightHeight))) return Math.max(.35, Number(data.lineOfSightHeight));
  if (data.type === "capital") return 5.4;
  if (data.type === "building") {
    if (data.role === "defense") return 4.25;
    if (data.role === "wall" || data.role === "gate") return 1.65;
    return 2.7;
  }
  if (data.type === "founder") return 1.85;
  if (data.type === "squad") return data.combatRole === "siege" ? 1.55 : 1.35;
  return .75;
}

function endpoint(value, fallbackHeight = .75) {
  const point = positionOf(value);
  const ground = flatHeightAt(DEFAULT_MAP, point.x, point.z);
  const height = value?.userData ? lineOfSightHeight(value) : Math.max(.35, Number(fallbackHeight || .75));
  return { x: point.x, z: point.z, ground, y: ground + height };
}

export function firstTerrainLineOfSightBlocker(from, to, options = {}) {
  const start = endpoint(from, options.fromHeight);
  const end = endpoint(to, options.toHeight);
  const dx = end.x - start.x;
  const dz = end.z - start.z;
  const distance = Math.hypot(dx, dz);
  if (distance < 1.2) return null;

  const sampleSpacing = Math.max(.35, Number(options.sampleSpacing || .7));
  const steps = Math.max(3, Math.ceil(distance / sampleSpacing));
  const endpointSkip = Math.min(.14, Math.max(.035, 1.0 / steps));
  const clearance = Math.max(.04, Number(options.clearance ?? .12));

  for (let step = 1; step < steps; step++) {
    const t = step / steps;
    if (t <= endpointSkip || t >= 1 - endpointSkip) continue;
    const x = start.x + dx * t;
    const z = start.z + dz * t;
    const lineY = start.y + (end.y - start.y) * t;
    const terrainY = flatHeightAt(DEFAULT_MAP, x, z);
    if (terrainY + clearance >= lineY) return { kind: "terrain", x, z, terrainY, lineY, t };
  }
  return null;
}

export function firstBattlefieldLineOfSightBlocker(world, from, to, options = {}) {
  const fortification = firstFortificationBlocker(world, from, to, options);
  const terrain = firstTerrainLineOfSightBlocker(from, to, options);
  if (!fortification) return terrain;
  if (!terrain) return { kind: "fortification", entity: fortification };

  const start = positionOf(from);
  const fortDistance = Math.hypot(fortification.position.x - start.x, fortification.position.z - start.z);
  const end = positionOf(to);
  const totalDistance = Math.max(.001, Math.hypot(end.x - start.x, end.z - start.z));
  const terrainDistance = totalDistance * terrain.t;
  return terrainDistance < fortDistance ? terrain : { kind: "fortification", entity: fortification };
}

export function hasBattlefieldLineOfSight(world, from, to, options = {}) {
  return !firstBattlefieldLineOfSightBlocker(world, from, to, options);
}
