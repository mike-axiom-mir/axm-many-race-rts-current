import { flatHeightAt } from "./mapVisuals.js";
import { skinById } from "./worldCatalog.js";

export const DEFAULT_MAX_WALK_SLOPE = .58;
export const DEFAULT_ROUTE_GRID = 2.2;
export const MIN_SURFACE_MOVEMENT = .30;
export const MAX_SURFACE_MOVEMENT = 1.30;

function pointOf(value) {
  if (Array.isArray(value)) return { x: Number(value[0] || 0), z: Number(value[2] || 0) };
  if (value?.position) return { x: Number(value.position.x || 0), z: Number(value.position.z || 0) };
  return { x: Number(value?.x || 0), z: Number(value?.z || 0) };
}

function distance2d(a, b) {
  const pa = pointOf(a), pb = pointOf(b);
  return Math.hypot(pa.x - pb.x, pa.z - pb.z);
}

function clamp(value, min, max) {
  return Math.max(min, Math.min(max, value));
}

function boundsFor(map, margin = .7) {
  const width = Math.max(12, Number(map?.environment?.width || 100));
  const depth = Math.max(12, Number(map?.environment?.depth || 72));
  return {
    minX: -width / 2 + margin,
    maxX: width / 2 - margin,
    minZ: -depth / 2 + margin,
    maxZ: depth / 2 - margin
  };
}

function insideBounds(map, x, z, margin = .7) {
  const b = boundsFor(map, margin);
  return x >= b.minX && x <= b.maxX && z >= b.minZ && z <= b.maxZ;
}

function isMovementPassage(paint) {
  if (!paint || paint.enabled === false) return false;
  if (paint.skin === "ramp") return true;
  if (paint.movementPassage === true) return true;
  return Array.isArray(paint.tags) && paint.tags.includes("movement-passage");
}

function paintContains(paint, x, z, margin = .42) {
  if (!Array.isArray(paint?.position)) return false;
  const px = Number(paint.position[0] || 0);
  const pz = Number(paint.position[2] || 0);
  const dx = x - px;
  const dz = z - pz;
  if ((paint.shape || "circle") !== "strip") {
    return Math.hypot(dx, dz) <= Math.max(.4, Number(paint.radius || 5)) + margin;
  }

  // Surface strips are rendered with rotation.y = -rotation, so rotate the
  // world point by +rotation to test it in the strip's local x/z frame.
  const angle = Number(paint.rotation || 0) * Math.PI / 180;
  const c = Math.cos(angle), s = Math.sin(angle);
  const localX = dx * c + dz * s;
  const localZ = -dx * s + dz * c;
  const halfLength = Math.max(.5, Number(paint.length || 16)) / 2 + margin;
  const halfWidth = Math.max(.5, Number(paint.width || 3.5)) / 2 + margin;
  return Math.abs(localX) <= halfLength && Math.abs(localZ) <= halfWidth;
}

export function movementPassageAt(map, x, z) {
  for (const paint of map?.surfacePaint || []) {
    if (isMovementPassage(paint) && paintContains(paint, x, z)) return paint;
  }
  return null;
}

export function movementSurfaceAt(map, x, z) {
  const paints = map?.surfacePaint || [];
  // Later surfaces render over earlier surfaces, so movement follows the same
  // authoring order when multiple painted regions overlap.
  for (let index = paints.length - 1; index >= 0; index--) {
    const paint = paints[index];
    if (paint?.enabled === false || !paintContains(paint, x, z, 0)) continue;
    return paint;
  }
  return null;
}

export function terrainMovementMultiplierAt(map, x, z) {
  const paint = movementSurfaceAt(map, x, z);
  if (!paint) return 1;
  const custom = Number(paint.movementMultiplier);
  if (Number.isFinite(custom) && custom > 0) return clamp(custom, MIN_SURFACE_MOVEMENT, MAX_SURFACE_MOVEMENT);
  const skin = skinById(paint.skin || "grassland");
  return clamp(Number(skin?.movement ?? 1), MIN_SURFACE_MOVEMENT, MAX_SURFACE_MOVEMENT);
}

export function terrainSegmentMovementCost(map, from, to, options = {}) {
  const a = pointOf(from), b = pointOf(to);
  const dx = b.x - a.x, dz = b.z - a.z;
  const distance = Math.hypot(dx, dz);
  if (distance < .001) return 0;
  const spacing = Math.max(.45, Number(options.costSampleSpacing || 1));
  const steps = Math.max(1, Math.ceil(distance / spacing));
  const stepDistance = distance / steps;
  let cost = 0;
  for (let step = 0; step < steps; step++) {
    const t = (step + .5) / steps;
    const x = a.x + dx * t;
    const z = a.z + dz * t;
    cost += stepDistance / terrainMovementMultiplierAt(map, x, z);
  }
  return cost;
}

export function terrainSlopeAt(map, x, z, options = {}) {
  const sample = Math.max(.35, Number(options.sampleDistance || .8));
  const center = flatHeightAt(map, x, z);
  let steepest = 0;
  const offsets = [
    [sample, 0], [-sample, 0], [0, sample], [0, -sample],
    [sample, sample], [sample, -sample], [-sample, sample], [-sample, -sample]
  ];
  for (const [dx, dz] of offsets) {
    const run = Math.hypot(dx, dz);
    const rise = Math.abs(flatHeightAt(map, x + dx, z + dz) - center);
    steepest = Math.max(steepest, rise / Math.max(.001, run));
  }
  return steepest;
}

export function terrainWalkableAt(map, x, z, options = {}) {
  if (!insideBounds(map, x, z, Number(options.edgeMargin ?? .7))) return false;
  if (movementPassageAt(map, x, z)) return true;
  const limit = Math.max(.08, Number(options.maxSlope ?? map?.environment?.maxWalkSlope ?? DEFAULT_MAX_WALK_SLOPE));
  return terrainSlopeAt(map, x, z, options) <= limit;
}

export function terrainSegmentWalkable(map, from, to, options = {}) {
  const a = pointOf(from), b = pointOf(to);
  const dx = b.x - a.x, dz = b.z - a.z;
  const distance = Math.hypot(dx, dz);
  if (distance < .2) return terrainWalkableAt(map, b.x, b.z, options);
  const spacing = Math.max(.35, Number(options.sampleSpacing || .7));
  const steps = Math.max(1, Math.ceil(distance / spacing));
  for (let step = 1; step <= steps; step++) {
    const t = step / steps;
    const x = a.x + dx * t;
    const z = a.z + dz * t;
    if (!terrainWalkableAt(map, x, z, options)) return false;
  }
  return true;
}

class MinHeap {
  constructor() { this.items = []; }
  get size() { return this.items.length; }
  push(item) {
    const items = this.items;
    items.push(item);
    let index = items.length - 1;
    while (index > 0) {
      const parent = (index - 1) >> 1;
      if (items[parent].f <= item.f) break;
      items[index] = items[parent];
      index = parent;
    }
    items[index] = item;
  }
  pop() {
    const items = this.items;
    if (!items.length) return null;
    const root = items[0];
    const tail = items.pop();
    if (!items.length) return root;
    let index = 0;
    while (true) {
      const left = index * 2 + 1;
      const right = left + 1;
      if (left >= items.length) break;
      let child = left;
      if (right < items.length && items[right].f < items[left].f) child = right;
      if (items[child].f >= tail.f) break;
      items[index] = items[child];
      index = child;
    }
    items[index] = tail;
    return root;
  }
}

function simplifyRoute(map, start, points, options) {
  if (!points.length) return [];
  const simplified = [];
  let anchor = pointOf(start);
  let index = 0;
  while (index < points.length) {
    let farthest = index;
    for (let candidate = points.length - 1; candidate >= index; candidate--) {
      if (terrainSegmentWalkable(map, anchor, points[candidate], options)) {
        farthest = candidate;
        break;
      }
    }
    const next = points[farthest];
    simplified.push({ x: next.x, z: next.z });
    anchor = next;
    index = farthest + 1;
  }
  return simplified;
}

export function findTerrainRoute(map, from, to, options = {}) {
  const start = pointOf(from), goal = pointOf(to);
  if (terrainSegmentWalkable(map, start, goal, options)) {
    return { waypoints: [goal], reachesGoal: true, direct: true, expanded: 0 };
  }

  const grid = Math.max(1.2, Number(options.gridSize || DEFAULT_ROUTE_GRID));
  const bounds = boundsFor(map, Number(options.edgeMargin ?? .7));
  const cols = Math.max(2, Math.floor((bounds.maxX - bounds.minX) / grid) + 1);
  const rows = Math.max(2, Math.floor((bounds.maxZ - bounds.minZ) / grid) + 1);
  const maxExpanded = Math.max(300, Number(options.maxExpanded || 4200));
  const walkableCache = new Map();

  const clampIndex = (value, max) => Math.max(0, Math.min(max - 1, value));
  const ixFor = x => clampIndex(Math.round((x - bounds.minX) / grid), cols);
  const izFor = z => clampIndex(Math.round((z - bounds.minZ) / grid), rows);
  const keyOf = (ix, iz) => `${ix},${iz}`;
  const pointFor = (ix, iz) => ({ x: bounds.minX + ix * grid, z: bounds.minZ + iz * grid });
  const walkableNode = (ix, iz) => {
    const key = keyOf(ix, iz);
    if (!walkableCache.has(key)) {
      const p = pointFor(ix, iz);
      walkableCache.set(key, terrainWalkableAt(map, p.x, p.z, options));
    }
    return walkableCache.get(key);
  };

  function nearestReachableStart() {
    const sx = ixFor(start.x), sz = izFor(start.z);
    let best = null;
    for (let radius = 0; radius <= 3; radius++) {
      for (let dz = -radius; dz <= radius; dz++) for (let dx = -radius; dx <= radius; dx++) {
        if (radius && Math.max(Math.abs(dx), Math.abs(dz)) !== radius) continue;
        const ix = sx + dx, iz = sz + dz;
        if (ix < 0 || iz < 0 || ix >= cols || iz >= rows || !walkableNode(ix, iz)) continue;
        const point = pointFor(ix, iz);
        if (!terrainSegmentWalkable(map, start, point, options)) continue;
        const score = distance2d(start, point);
        if (!best || score < best.score) best = { ix, iz, point, score };
      }
      if (best) return best;
    }
    return null;
  }

  const startNode = nearestReachableStart();
  if (!startNode) return { waypoints: [], reachesGoal: false, direct: false, expanded: 0 };

  const open = new MinHeap();
  const gScore = new Map();
  const cameFrom = new Map();
  const startKey = keyOf(startNode.ix, startNode.iz);
  const startH = distance2d(startNode.point, goal) / MAX_SURFACE_MOVEMENT;
  const startCost = terrainSegmentMovementCost(map, start, startNode.point, options);
  gScore.set(startKey, startCost);
  open.push({ key: startKey, ix: startNode.ix, iz: startNode.iz, g: startCost, f: startCost + startH });

  const neighborSteps = [
    [1, 0], [-1, 0], [0, 1], [0, -1],
    [1, 1], [1, -1], [-1, 1], [-1, -1]
  ];
  let expanded = 0;
  let endKey = null;
  let bestKey = startKey;
  let bestPoint = startNode.point;
  let bestH = distance2d(startNode.point, goal);

  while (open.size && expanded < maxExpanded) {
    const current = open.pop();
    if (!current || current.g !== gScore.get(current.key)) continue;
    expanded++;
    const currentPoint = pointFor(current.ix, current.iz);
    const h = distance2d(currentPoint, goal);
    if (h < bestH) {
      bestH = h;
      bestKey = current.key;
      bestPoint = currentPoint;
    }
    if (terrainSegmentWalkable(map, currentPoint, goal, options)) {
      endKey = current.key;
      break;
    }

    for (const [dx, dz] of neighborSteps) {
      const ix = current.ix + dx, iz = current.iz + dz;
      if (ix < 0 || iz < 0 || ix >= cols || iz >= rows || !walkableNode(ix, iz)) continue;
      const nextPoint = pointFor(ix, iz);
      if (!terrainSegmentWalkable(map, currentPoint, nextPoint, options)) continue;
      const key = keyOf(ix, iz);
      const edgeCost = terrainSegmentMovementCost(map, currentPoint, nextPoint, options);
      const tentative = current.g + edgeCost;
      if (tentative >= (gScore.get(key) ?? Infinity)) continue;
      cameFrom.set(key, current.key);
      gScore.set(key, tentative);
      const heuristic = distance2d(nextPoint, goal) / MAX_SURFACE_MOVEMENT;
      open.push({ key, ix, iz, g: tentative, f: tentative + heuristic });
    }
  }

  const routeEnd = endKey || bestKey;
  if (!routeEnd || routeEnd === startKey && !endKey) {
    return { waypoints: [], reachesGoal: false, direct: false, expanded };
  }

  const keys = [];
  let cursor = routeEnd;
  while (cursor && cursor !== startKey) {
    keys.push(cursor);
    cursor = cameFrom.get(cursor);
  }
  keys.reverse();
  const points = [
    startNode.point,
    ...keys.map(key => {
      const [ix, iz] = key.split(",").map(Number);
      return pointFor(ix, iz);
    })
  ];
  const reachesGoal = Boolean(endKey);
  if (reachesGoal) points.push(goal);
  else if (bestPoint && distance2d(points[points.length - 1], bestPoint) > .1) points.push(bestPoint);

  return {
    waypoints: simplifyRoute(map, start, points, options),
    reachesGoal,
    direct: false,
    expanded
  };
}
