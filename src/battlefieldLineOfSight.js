import { DEFAULT_MAP } from "./maps.js";
import { flatHeightAt } from "./mapVisuals.js";

function pointOf(value) {
  if (!value) return { x: 0, y: null, z: 0 };
  if (value.position) return {
    x: Number(value.position.x || 0),
    y: Number.isFinite(Number(value.position.y)) ? Number(value.position.y) : null,
    z: Number(value.position.z || 0)
  };
  return {
    x: Number(value.x || 0),
    y: Number.isFinite(Number(value.y)) ? Number(value.y) : null,
    z: Number(value.z || 0)
  };
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

function sightPoint(value, fallbackHeight = .75) {
  const point = pointOf(value);
  const ground = flatHeightAt(DEFAULT_MAP, point.x, point.z);
  let y;
  if (value?.userData) y = ground + lineOfSightHeight(value);
  else if (point.y != null) y = point.y;
  else y = ground + Math.max(.35, Number(fallbackHeight || .75));
  return { x: point.x, y, z: point.z, ground };
}

function localPoint(fort, point) {
  const dx = point.x - fort.position.x;
  const dz = point.z - fort.position.z;
  const c = Math.cos(-fort.rotation.y);
  const s = Math.sin(-fort.rotation.y);
  return { x: dx * c - dz * s, z: dx * s + dz * c };
}

function segmentRectHitT(a, b, halfWidth, halfDepth) {
  const dx = b.x - a.x;
  const dz = b.z - a.z;
  let tMin = 0;
  let tMax = 1;
  for (const [start, delta, half] of [[a.x, dx, halfWidth], [a.z, dz, halfDepth]]) {
    if (Math.abs(delta) < 1e-6) {
      if (start < -half || start > half) return null;
      continue;
    }
    let t1 = (-half - start) / delta;
    let t2 = (half - start) / delta;
    if (t1 > t2) [t1, t2] = [t2, t1];
    tMin = Math.max(tMin, t1);
    tMax = Math.min(tMax, t2);
    if (tMin > tMax) return null;
  }
  if (tMax < 0 || tMin > 1) return null;
  return Math.max(0, tMin);
}

export function fortificationBlocksLineOfSight(fort) {
  if (!fort?.parent || fort.userData?.hp <= 0 || !fort.userData?.fortification) return false;
  if (fort.userData?.role === "gate" && fort.userData?.gateOpen) return false;
  return true;
}

function firstFortificationBlocker(world, from, to, options = {}) {
  const start = pointOf(from);
  const end = pointOf(to);
  const ignore = new Set(options.ignore || []);
  let best = null;
  let bestT = Infinity;
  for (const fort of world?.entities || []) {
    if (ignore.has(fort) || !fortificationBlocksLineOfSight(fort)) continue;
    const cfg = fort.userData.fortification;
    const a = localPoint(fort, start);
    const b = localPoint(fort, end);
    const t = segmentRectHitT(a, b, Math.max(.3, Number(cfg.width || 5.4) / 2), Math.max(.2, Number(cfg.depth || .85) / 2));
    if (t == null || t >= bestT) continue;
    best = fort;
    bestT = t;
  }
  return best ? { kind: "fortification", entity: best, t: bestT } : null;
}

export function firstTerrainLineOfSightBlocker(from, to, options = {}) {
  const start = sightPoint(from, options.fromHeight);
  const end = sightPoint(to, options.toHeight);
  const dx = end.x - start.x;
  const dz = end.z - start.z;
  const distance = Math.hypot(dx, dz);
  if (distance < 1.2) return null;

  const spacing = Math.max(.3, Number(options.sampleSpacing || .65));
  const steps = Math.max(4, Math.ceil(distance / spacing));
  const endpointSkip = Math.min(.12, Math.max(.035, 1.2 / steps));
  const clearance = Math.max(.03, Number(options.clearance ?? .10));

  for (let step = 1; step < steps; step++) {
    const t = step / steps;
    if (t <= endpointSkip || t >= 1 - endpointSkip) continue;
    const x = start.x + dx * t;
    const z = start.z + dz * t;
    const lineY = start.y + (end.y - start.y) * t;
    const terrainY = flatHeightAt(DEFAULT_MAP, x, z);
    if (terrainY + clearance < lineY) continue;
    return {
      kind: "terrain",
      t,
      position: { x, y: terrainY, z },
      terrainY,
      lineY,
      userData: {
        terrainBlocker: true,
        hp: Number.MAX_SAFE_INTEGER,
        radius: .35,
        fortification: { depth: .55 }
      }
    };
  }
  return null;
}

export function firstBattlefieldLineOfSightBlocker(world, from, to, options = {}) {
  const fortification = firstFortificationBlocker(world, from, to, options);
  const terrain = firstTerrainLineOfSightBlocker(from, to, options);
  if (!fortification) return terrain;
  if (!terrain) return fortification;
  return terrain.t < fortification.t ? terrain : fortification;
}

export function firstLineOfSightBlocker(world, from, to, options = {}) {
  const blocker = firstBattlefieldLineOfSightBlocker(world, from, to, options);
  return blocker?.kind === "fortification" ? blocker.entity : blocker;
}

export function hasBattlefieldLineOfSight(world, from, to, options = {}) {
  return !firstBattlefieldLineOfSightBlocker(world, from, to, options);
}
