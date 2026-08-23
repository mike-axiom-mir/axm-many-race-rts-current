import * as THREE from "three";

export const MAP_SCHEMA_VERSION = 2;
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
      ? {
          radius: 24,
          waterLevel: 0,
          atmosphere: true,
          terrainTint: "#75985f",
          oceanTint: "#315f79",
          baseSkin: "grassland",
          skySkin: "clear"
        }
      : {
          width: 100,
          depth: 72,
          terrainTint: "#75985f",
          edgeFalloff: 0.18,
          baseSkin: "grassland",
          skySkin: "clear"
        },
    playerStart: globe ? { lat: 18, lon: -120, elevation: 0 } : [-30, 0, -17],
    enemyStart: globe ? { lat: -18, lon: 60, elevation: 0 } : [30, 0, 17],
    strategicSites: [],
    resourceZones: [],
    terrainStamps: [],
    decorations: [],
    ruleZones: [],
    surfacePaint: [],
    globalRules: [],
    variables: {},
    campaign: {
      enabled: false,
      campaignId: "",
      chapterId: "",
      missionId: "",
      title: "",
      briefing: "",
      victoryText: "",
      defeatText: "",
      nextMapId: "",
      startingAge: 0,
      allowedFactions: [],
      objectives: []
    }
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
    schemaVersion: MAP_SCHEMA_VERSION,
    projection,
    environment: { ...base.environment, ...(input?.environment || {}) },
    strategicSites: normalizeObjectArray(input?.strategicSites),
    resourceZones: normalizeObjectArray(input?.resourceZones),
    terrainStamps: normalizeObjectArray(input?.terrainStamps),
    decorations: normalizeObjectArray(input?.decorations),
    ruleZones: normalizeObjectArray(input?.ruleZones),
    surfacePaint: normalizeObjectArray(input?.surfacePaint),
    globalRules: normalizeRules(input?.globalRules),
    variables: input?.variables && typeof input.variables === "object" && !Array.isArray(input.variables) ? { ...input.variables } : {},
    campaign: normalizeCampaign(input?.campaign, base.campaign)
  };

  if (projection === "flat") {
    map.playerStart = normalizeFlatPoint(input?.playerStart, base.playerStart);
    map.enemyStart = normalizeFlatPoint(input?.enemyStart, base.enemyStart);
    map.strategicSites = map.strategicSites.map(site => normalizePlacedObject(site, "flat", {
      radius: 6.5,
      captureRate: 25,
      bonus: {},
      kind: "monument"
    }));
    map.resourceZones = map.resourceZones.map(zone => normalizePlacedObject(zone, "flat", { radius: 5, richness: 1, resource: "food" }));
    map.terrainStamps = map.terrainStamps.map(stamp => normalizePlacedObject(stamp, "flat", { radius: 7, strength: 1, kind: "hill" }));
    map.decorations = map.decorations.map(object => normalizePlacedObject(object, "flat", { asset: "tree-oak", scale: 1, rotation: 0, skin: "default", tint: "#ffffff", collision: false }));
    map.ruleZones = map.ruleZones.map(zone => normalizePlacedObject(zone, "flat", { radius: 7, shape: "circle", rules: [] }));
    map.surfacePaint = map.surfacePaint.map(paint => normalizePlacedObject(paint, "flat", { radius: 5, skin: "grassland", tint: "#ffffff", opacity: 1, blend: "replace" }));
  } else {
    map.playerStart = normalizeGeoPoint(input?.playerStart, base.playerStart);
    map.enemyStart = normalizeGeoPoint(input?.enemyStart, base.enemyStart);
    map.strategicSites = map.strategicSites.map(site => normalizePlacedObject(site, "globe", {
      radius: 9,
      captureRate: 25,
      bonus: {},
      kind: "monument"
    }));
    map.resourceZones = map.resourceZones.map(zone => normalizePlacedObject(zone, "globe", { radius: 7, richness: 1, resource: "food" }));
    map.terrainStamps = map.terrainStamps.map(stamp => normalizePlacedObject(stamp, "globe", { radius: 9, strength: 1, kind: "hill" }));
    map.decorations = map.decorations.map(object => normalizePlacedObject(object, "globe", { asset: "tree-oak", scale: 1, rotation: 0, skin: "default", tint: "#ffffff", collision: false }));
    map.ruleZones = map.ruleZones.map(zone => normalizePlacedObject(zone, "globe", { radius: 9, shape: "circle", rules: [] }));
    map.surfacePaint = map.surfacePaint.map(paint => normalizePlacedObject(paint, "globe", { radius: 7, skin: "grassland", tint: "#ffffff", opacity: 1, blend: "replace" }));
  }

  map.strategicSites = map.strategicSites.map(withScenarioMetadata);
  map.resourceZones = map.resourceZones.map(withScenarioMetadata);
  map.terrainStamps = map.terrainStamps.map(withScenarioMetadata);
  map.decorations = map.decorations.map(withScenarioMetadata);
  map.ruleZones = map.ruleZones.map(withScenarioMetadata);
  map.surfacePaint = map.surfacePaint.map(withScenarioMetadata);

  return map;
}

function normalizeObjectArray(value) {
  return Array.isArray(value) ? value.map(item => ({ ...item })) : [];
}

function normalizePlacedObject(object, projection, defaults) {
  const out = { ...defaults, ...object };
  if (projection === "globe") {
    out.geo = normalizeGeoPoint(object?.geo || object?.position, { lat: 0, lon: 0, elevation: 0 });
    delete out.position;
  } else {
    out.position = normalizeFlatPoint(object?.position, [0, 0, 0]);
    delete out.geo;
  }
  return out;
}

function withScenarioMetadata(object) {
  return {
    enabled: object.enabled !== false,
    layer: object.layer || "default",
    owner: object.owner || "neutral",
    tags: Array.isArray(object.tags) ? [...new Set(object.tags.map(String).filter(Boolean))] : [],
    rules: normalizeRules(object.rules),
    ...object,
    rules: normalizeRules(object.rules)
  };
}

function normalizeRules(rules) {
  return Array.isArray(rules) ? rules.map((rule, index) => ({
    id: rule?.id || `rule-${index + 1}`,
    name: rule?.name || `Rule ${index + 1}`,
    enabled: rule?.enabled !== false,
    once: Boolean(rule?.once),
    priority: Number(rule?.priority) || 0,
    event: rule?.event || { type: "map.start" },
    conditions: Array.isArray(rule?.conditions) ? rule.conditions.map(condition => ({ ...condition })) : [],
    actions: Array.isArray(rule?.actions) ? rule.actions.map(action => ({ ...action })) : [],
    cooldown: Math.max(0, Number(rule?.cooldown) || 0),
    notes: rule?.notes || ""
  })) : [];
}

function normalizeCampaign(input, fallback) {
  const campaign = input && typeof input === "object" ? input : {};
  return {
    ...fallback,
    ...campaign,
    enabled: Boolean(campaign.enabled),
    startingAge: Math.max(0, Number(campaign.startingAge) || 0),
    allowedFactions: Array.isArray(campaign.allowedFactions) ? campaign.allowedFactions.map(String) : [],
    objectives: Array.isArray(campaign.objectives) ? campaign.objectives.map((objective, index) => ({
      id: objective?.id || `objective-${index + 1}`,
      title: objective?.title || `Objective ${index + 1}`,
      description: objective?.description || "",
      required: objective?.required !== false,
      hidden: Boolean(objective?.hidden),
      successWhen: objective?.successWhen || null,
      failureWhen: objective?.failureWhen || null
    })) : []
  };
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
  if (!String(map.id || "").trim()) errors.push("Map id is required.");
  if (!String(map.name || "").trim()) errors.push("Map name is required.");
  if (!MAP_PROJECTIONS.includes(map.projection)) errors.push("Projection must be flat or globe.");
  if (map.playerStart == null || map.enemyStart == null) errors.push("Both player and enemy starts are required.");
  if (map.strategicSites.length === 0) warnings.push("Map has no strategic sites yet.");
  if (map.projection === "globe" && Number(map.environment.radius) < 8) warnings.push("Very small globe radius may make RTS formations hard to read.");

  const ids = new Map();
  const collections = [map.strategicSites, map.resourceZones, map.terrainStamps, map.decorations, map.ruleZones, map.surfacePaint];
  for (const collection of collections) {
    for (const object of collection) {
      if (!object.id) warnings.push(`A ${object.asset || object.kind || "placed object"} has no id.`);
      else if (ids.has(object.id)) errors.push(`Duplicate object id: ${object.id}`);
      else ids.set(object.id, true);
    }
  }

  if (map.campaign.enabled && !map.campaign.missionId) warnings.push("Campaign mode is enabled but missionId is empty.");
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
