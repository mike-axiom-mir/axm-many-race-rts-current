import * as THREE from "three";

export const MAP_SCHEMA_VERSION = 1;
export const MAP_PROJECTIONS = ["flat", "globe"];

export function createBlankMap(projection = "flat") {
  const globe = projection === "globe";
  return {
    schemaVersion: MAP_SCHEMA_VERSION,
    id: globe ? "new-globe-world" : "new-flat-world",
    name: globe ? "New Globe World" : "New Flat World",
    description: "Created with the AXM Many-Race RTS Map Builder.",
    projection,
    seed: Math.floor(Math.random() * 99999999),
    environment: globe
      ? { radius: 24, waterLevel: 0, atmosphere: true, terrainTint: "#75985f", oceanTint: "#315f79" }
      : { width: 100, depth: 72, terrainTint: "#75985f", edgeFalloff: 0.18 },
    playerStart: globe ? { lat: 18, lon: -120, elevation: 0 } : [-30, 0, -17],
    enemyStart: globe ? { lat: -18, lon: 60, elevation: 0 } : [30, 0, 17],
    strategicSites: [],
    resourceZones: [],
    terrainStamps: []
  };
}

export function isGlobeMap(map) {
  return map?.projection === "globe";
}

export function normalizeMapDefinition(input) {
  const projection = input?.projection === "globe" ? "globe" : "flat";
  const base = createBlankMap(projection);
  const map = {
    ...base,
    ...input,
    schemaVersion: Number(input?.schemaVersion || MAP_SCHEMA_VERSION),
    projection,
    environment: { ...base.environment, ...(input?.environment || {}) },
    strategicSites: Array.isArray(input?.strategicSites) ? input.strategicSites.map(site => ({ ...site })) : [],
    resourceZones: Array.isArray(input?.resourceZones) ? input.resourceZones.map(zone => ({ ...zone })) : [],
    terrainStamps: Array.isArray(input?.terrainStamps) ? input.terrainStamps.map(stamp => ({ ...stamp })) : []
  };

  if (projection === "flat") {
    map.playerStart = normalizeFlatPoint(input?.playerStart, base.playerStart);
    map.enemyStart = normalizeFlatPoint(input?.enemyStart, base.enemyStart);
    map.strategicSites = map.strategicSites.map(site => ({
      radius: 6.5,
      captureRate: 25,
      bonus: {},
      kind: "monument",
      ...site,
      position: normalizeFlatPoint(site.position, [0, 0, 0])
    }));
  } else {
    map.playerStart = normalizeGeoPoint(input?.playerStart, base.playerStart);
    map.enemyStart = normalizeGeoPoint(input?.enemyStart, base.enemyStart);
    map.strategicSites = map.strategicSites.map(site => ({
      radius: 9,
      captureRate: 25,
      bonus: {},
      kind: "monument",
      ...site,
      geo: normalizeGeoPoint(site.geo || site.position, { lat: 0, lon: 0, elevation: 0 })
    }));
  }

  return map;
}

export function normalizeFlatPoint(point, fallback = [0, 0, 0]) {
  if (!Array.isArray(point)) return [...fallback];
  return [Number(point[0]) || 0, Number(point[1]) || 0, Number(point[2]) || 0];
}

export function normalizeGeoPoint(point, fallback = { lat: 0, lon: 0, elevation: 0 }) {
  if (Array.isArray(point)) return { lat: Number(point[0]) || 0, lon: Number(point[1]) || 0, elevation: Number(point[2]) || 0 };
  return {
    lat: clamp(Number(point?.lat ?? fallback.lat) || 0, -90, 90),
    lon: wrapLongitude(Number(point?.lon ?? fallback.lon) || 0),
    elevation: Number(point?.elevation ?? fallback.elevation) || 0
  };
}

export function geoToCartesian(geo, radius = 24) {
  const p = normalizeGeoPoint(geo);
  const lat = THREE.MathUtils.degToRad(p.lat);
  const lon = THREE.MathUtils.degToRad(p.lon);
  const r = radius + p.elevation;
  return new THREE.Vector3(
    r * Math.cos(lat) * Math.sin(lon),
    r * Math.sin(lat),
    r * Math.cos(lat) * Math.cos(lon)
  );
}

export function cartesianToGeo(vector, radius = 24) {
  const r = Math.max(0.0001, vector.length());
  const lat = THREE.MathUtils.radToDeg(Math.asin(vector.y / r));
  const lon = THREE.MathUtils.radToDeg(Math.atan2(vector.x, vector.z));
  return { lat, lon: wrapLongitude(lon), elevation: r - radius };
}

export function mapPointToWorld(map, point) {
  if (isGlobeMap(map)) return geoToCartesian(point, Number(map.environment?.radius) || 24);
  const p = normalizeFlatPoint(point);
  return new THREE.Vector3(p[0], p[1], p[2]);
}

export function validateMapDefinition(input) {
  const map = normalizeMapDefinition(input);
  const errors = [];
  const warnings = [];
  if (!map.id.trim()) errors.push("Map id is required.");
  if (!map.name.trim()) errors.push("Map name is required.");
  if (!MAP_PROJECTIONS.includes(map.projection)) errors.push("Projection must be flat or globe.");
  if (map.playerStart == null || map.enemyStart == null) errors.push("Both player and enemy starts are required.");
  if (map.strategicSites.length === 0) warnings.push("Map has no strategic sites yet.");
  if (map.projection === "globe" && Number(map.environment.radius) < 8) warnings.push("Very small globe radius may make RTS formations hard to read.");
  return { valid: errors.length === 0, errors, warnings, map };
}

export function exportMapJSON(map) {
  return JSON.stringify(normalizeMapDefinition(map), null, 2);
}

export function toLegacyFlatMap(map) {
  const normalized = normalizeMapDefinition(map);
  if (normalized.projection !== "flat") throw new Error("Only flat maps can be converted to the current legacy skirmish map format.");
  return {
    id: normalized.id,
    name: normalized.name,
    description: normalized.description,
    seed: normalized.seed,
    playerStart: normalized.playerStart,
    enemyStart: normalized.enemyStart,
    strategicSites: normalized.strategicSites.map(site => ({
      id: site.id,
      name: site.name,
      kind: site.kind,
      position: site.position,
      radius: site.radius,
      captureRate: site.captureRate,
      bonus: site.bonus,
      description: site.description || ""
    }))
  };
}

function clamp(value, min, max) {
  return Math.max(min, Math.min(max, value));
}

function wrapLongitude(value) {
  let result = value;
  while (result > 180) result -= 360;
  while (result < -180) result += 360;
  return result;
}
