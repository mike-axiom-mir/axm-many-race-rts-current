function pointOf(value) {
  if (!value) return { x: 0, z: 0 };
  if (value.position) return { x: Number(value.position.x || 0), z: Number(value.position.z || 0) };
  return { x: Number(value.x || 0), z: Number(value.z || 0) };
}

function localPoint(fort, point) {
  const dx = point.x - fort.position.x;
  const dz = point.z - fort.position.z;
  const c = Math.cos(-fort.rotation.y);
  const s = Math.sin(-fort.rotation.y);
  return { x: dx * c - dz * s, z: dx * s + dz * c };
}

function segmentRectEntry(a, b, halfWidth, halfDepth) {
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

export function firstLineOfSightBlocker(world, from, to, options = {}) {
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
    const halfWidth = Math.max(.3, Number(cfg.width || 5.4) / 2);
    const halfDepth = Math.max(.2, Number(cfg.depth || .85) / 2);
    const entryT = segmentRectEntry(a, b, halfWidth, halfDepth);
    if (entryT == null || entryT >= bestT) continue;
    best = fort;
    bestT = entryT;
  }
  return best;
}

export function hasFortificationLineOfSight(world, from, to, options = {}) {
  return !firstLineOfSightBlocker(world, from, to, options);
}
