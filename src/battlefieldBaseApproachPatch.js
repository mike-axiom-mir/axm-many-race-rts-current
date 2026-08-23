import { DEFAULT_MAP } from "./maps.js";

function pointKey(point) {
  return `${Math.round(Number(point?.[0] || 0) * 10)}:${Math.round(Number(point?.[2] || 0) * 10)}`;
}

function activeStarts(map) {
  const raw = [
    ...(Array.isArray(map?.runtimeStarts) ? map.runtimeStarts : []),
    ...(Array.isArray(map?.playerStarts) ? map.playerStarts : []),
    map?.playerStart,
    map?.enemyStart
  ].filter(point => Array.isArray(point) && point.length >= 3);
  const seen = new Set();
  const starts = [];
  for (const point of raw) {
    const key = pointKey(point);
    if (seen.has(key)) continue;
    seen.add(key);
    starts.push([Number(point[0] || 0), Number(point[1] || 0), Number(point[2] || 0)]);
  }
  return starts;
}

function strategicCenter(map) {
  const sites = Array.isArray(map?.strategicSites) ? map.strategicSites : [];
  if (!sites.length) return { x: 0, z: 0 };
  let x = 0;
  let z = 0;
  let count = 0;
  for (const site of sites) {
    if (!Array.isArray(site?.position)) continue;
    x += Number(site.position[0] || 0);
    z += Number(site.position[2] || 0);
    count++;
  }
  return count ? { x: x / count, z: z / count } : { x: 0, z: 0 };
}

function uniquePush(list, item) {
  if (!list.some(existing => existing?.id === item.id)) list.push(item);
}

function paint(id, skin, x, z, options = {}) {
  return {
    id,
    name: options.name || id,
    skin,
    position: [x, 0, z],
    shape: options.shape || "circle",
    radius: options.radius ?? 5,
    length: options.length ?? 16,
    width: options.width ?? 3.5,
    rotation: options.rotation ?? 0,
    opacity: options.opacity ?? .45,
    tint: options.tint || "#ffffff",
    movementMultiplier: options.movementMultiplier,
    enabled: true,
    tags: options.tags || ["base-approach"]
  };
}

function deco(id, asset, x, z, options = {}) {
  return {
    id,
    name: options.name || id,
    asset,
    position: [x, 0, z],
    scale: options.scale ?? 1,
    rotation: options.rotation ?? 0,
    tint: options.tint || "#ffffff",
    scatterCount: options.count ?? 1,
    scatterRadius: options.spread ?? 0,
    enabled: true,
    tags: options.tags || ["base-approach"]
  };
}

function enrichBaseApproaches(map) {
  if (!map || map.projection !== "flat") return;
  const starts = activeStarts(map);
  if (!starts.length) return;

  map.surfacePaint ||= [];
  map.decorations ||= [];
  map.baseDefenseSectors ||= [];
  const center = strategicCenter(map);

  starts.forEach((start, index) => {
    const x = start[0];
    const z = start[2];
    let dx = center.x - x;
    let dz = center.z - z;
    const length = Math.hypot(dx, dz) || 1;
    dx /= length;
    dz /= length;
    const px = -dz;
    const pz = dx;
    const roadCenterX = x + dx * 8.2;
    const roadCenterZ = z + dz * 8.2;
    const roadRotation = Math.atan2(dz, dx) * 180 / Math.PI;
    const prefix = `base-approach-${index + 1}`;

    uniquePush(map.surfacePaint, paint(`${prefix}-court`, "grassland", x, z, {
      radius: 8.4,
      opacity: .27,
      tint: "#8c8b72",
      movementMultiplier: 1,
      tags: ["base-court", "battlefield-readability"]
    }));
    uniquePush(map.surfacePaint, paint(`${prefix}-road`, "road", roadCenterX, roadCenterZ, {
      shape: "strip",
      length: 17.5,
      width: 3.4,
      rotation: roadRotation,
      opacity: .56,
      tags: ["base-road", "battlefield-readability"]
    }));

    const flankForward = 2.2;
    const flankSide = 7.1;
    for (const side of [-1, 1]) {
      const bx = x + dx * flankForward + px * flankSide * side;
      const bz = z + dz * flankForward + pz * flankSide * side;
      uniquePush(map.decorations, deco(`${prefix}-beacon-${side < 0 ? "left" : "right"}`, "watch-beacon", bx, bz, {
        scale: .82,
        rotation: roadRotation,
        tint: "#c8b37d"
      }));
    }

    uniquePush(map.decorations, deco(`${prefix}-banner`, "banner-neutral", x + dx * 4.6 + px * 3.3, z + dz * 4.6 + pz * 3.3, {
      scale: .82,
      rotation: roadRotation
    }));
    uniquePush(map.decorations, deco(`${prefix}-campfire`, "campfire", x - dx * 4.6, z - dz * 4.6, {
      scale: .72
    }));

    if (!map.baseDefenseSectors.some(sector => sector?.id === prefix)) {
      map.baseDefenseSectors.push({
        id: prefix,
        startIndex: index,
        center: [x, 0, z],
        radius: 18,
        garrisonRadius: 9.2,
        approachDirection: [dx, 0, dz]
      });
    }
  });
}

enrichBaseApproaches(DEFAULT_MAP);
