export const FOUNDATION_PLANET_SURFACE_BRIDGE_SCHEMA = "axm.rts.foundation-planet-surface-proposal/v1";
export const FOUNDATION_PLANET_PROVIDER = Object.freeze({
  repository: "mike-axiom-mir/foundation-planet-experiments",
  pullRequest: 9,
  head: "8f4e543669141acf93c61d44cf3827b1240e76f0",
  package: "axm-foundation-planet-sampler",
  capability: "axm.foundation-planet.coordinate-sampler",
  version: "1.0.0",
  requestSchema: "axm.foundation-planet.sample-request/v1",
  receiptSchema: "axm.foundation-planet.sample-receipt/v1",
  verificationSchema: "axm.foundation-planet.sample-verification/v1",
  worldId: "world.axm.foundation-planet"
});

const BIOME_TO_RTS_SKIN = Object.freeze({
  deep_ocean: "shallow-water",
  ocean: "shallow-water",
  coast: "sand",
  desert: "sand",
  savanna: "grassland",
  grassland: "grassland",
  temperate_forest: "forest-floor",
  rainforest: "forest-floor",
  taiga: "forest-floor",
  tundra: "snow",
  alpine: "stone",
  ice: "ice"
});

function assert(condition, message) {
  if (!condition) throw new Error(message);
}

function isObject(value) {
  return Boolean(value) && typeof value === "object" && !Array.isArray(value);
}

function clone(value) {
  return structuredClone(value);
}

function finiteRange(value, min, max, label) {
  assert(Number.isFinite(value) && value >= min && value <= max, `${label} must be between ${min} and ${max}`);
  return value;
}

function validateReceipt(receipt) {
  assert(isObject(receipt), "Foundation Planet receipt must be an object");
  assert(receipt.schema === FOUNDATION_PLANET_PROVIDER.receiptSchema, "unexpected Foundation Planet receipt schema");
  assert(receipt.capability?.id === FOUNDATION_PLANET_PROVIDER.capability, "unexpected Foundation Planet capability id");
  assert(receipt.capability?.version === FOUNDATION_PLANET_PROVIDER.version, "unexpected Foundation Planet capability version");
  assert(receipt.world?.id === FOUNDATION_PLANET_PROVIDER.worldId, "unexpected Foundation Planet world id");
  assert(receipt.request?.schema === FOUNDATION_PLANET_PROVIDER.requestSchema, "unexpected Foundation Planet request schema");
  assert(typeof receipt.request?.profile === "string" && receipt.request.profile.length > 0, "Foundation Planet profile is required");
  assert(Array.isArray(receipt.request?.coordinates), "Foundation Planet request coordinates are required");
  assert(Array.isArray(receipt.samples), "Foundation Planet samples are required");
  assert(receipt.samples.length === receipt.request.coordinates.length, "sample count must equal coordinate count");
  assert(receipt.integrity?.algorithm === "sha256", "Foundation Planet receipt must use SHA-256 integrity");
  assert(/^[a-f0-9]{64}$/.test(receipt.integrity?.digest || ""), "Foundation Planet receipt digest must be lowercase SHA-256");
}

function validateVerification(verification, receipt) {
  assert(isObject(verification), "Foundation Planet verifier must return an object");
  assert(verification.schema === FOUNDATION_PLANET_PROVIDER.verificationSchema, "unexpected Foundation Planet verification schema");
  assert(verification.valid === true, "Foundation Planet verifier did not validate the receipt");
  assert(verification.receiptDigest === receipt.integrity.digest, "verification digest does not match the receipt");
  assert(verification.sampleCount === receipt.samples.length, "verification sample count does not match the receipt");
  assert(verification.worldId === FOUNDATION_PLANET_PROVIDER.worldId, "verification world does not match the pinned provider");
  assert(verification.appliedState === false, "provider verification unexpectedly reports applied state");
  assert(verification.canonical === false, "provider verification unexpectedly reports canonical authority");
}

function surfacePaintFromSample(entry, index, profile, receiptDigest, radius) {
  assert(isObject(entry), `samples[${index}] must be an object`);
  const coordinate = entry.coordinate;
  const sample = entry.sample;
  assert(isObject(coordinate), `samples[${index}].coordinate must be an object`);
  assert(isObject(sample), `samples[${index}].sample must be an object`);
  const lat = finiteRange(coordinate.lat, -90, 90, `samples[${index}].coordinate.lat`);
  const lon = finiteRange(coordinate.lon, -180, 180, `samples[${index}].coordinate.lon`);
  const biome = String(sample.biome || "");
  const skin = BIOME_TO_RTS_SKIN[biome];
  assert(skin, `unsupported Foundation Planet biome: ${biome || "<missing>"}`);
  const tint = /^#[0-9a-fA-F]{6}$/.test(sample.color || "") ? sample.color : "#ffffff";
  const coordinateId = typeof coordinate.id === "string" && coordinate.id.length > 0 ? coordinate.id : null;

  return {
    id: `foundation-planet-surface-${index + 1}`,
    name: coordinateId ? `Foundation Planet ${coordinateId}` : `Foundation Planet sample ${index + 1}`,
    enabled: true,
    layer: "foundation-planet-proposal",
    owner: "neutral",
    geo: { lat, lon, elevation: 0 },
    radius,
    skin,
    tint,
    opacity: 1,
    blend: "replace",
    tags: [
      "foundation-planet-sample",
      `foundation-biome:${biome}`,
      `foundation-profile:${profile}`
    ],
    rules: [],
    sourceEvidence: {
      providerCapability: FOUNDATION_PLANET_PROVIDER.capability,
      providerReceiptDigest: receiptDigest,
      sampleIndex: index,
      coordinateId,
      biome,
      biomeLabel: typeof sample.biomeLabel === "string" ? sample.biomeLabel : null,
      elevationM: Number.isFinite(sample.elevationM) ? sample.elevationM : null,
      projectionNote: "RTS surface skin is an explicit game projection of provider evidence, not a scientific equivalence claim"
    }
  };
}

export function createFoundationPlanetSurfaceProposal(receipt, verifySampleReceipt, options = {}) {
  validateReceipt(receipt);
  assert(typeof verifySampleReceipt === "function", "a Foundation Planet receipt verifier is required");
  const radius = options.radius == null ? 7 : Number(options.radius);
  finiteRange(radius, 0.5, 30, "surface radius");

  const verification = verifySampleReceipt(clone(receipt));
  validateVerification(verification, receipt);
  const surfacePaint = receipt.samples.map((entry, index) =>
    surfacePaintFromSample(entry, index, receipt.request.profile, receipt.integrity.digest, radius)
  );

  return {
    schema: FOUNDATION_PLANET_SURFACE_BRIDGE_SCHEMA,
    status: "PROPOSAL_ONLY",
    provider: clone(FOUNDATION_PLANET_PROVIDER),
    source: {
      receiptSchema: receipt.schema,
      receiptDigest: receipt.integrity.digest,
      worldId: receipt.world.id,
      profile: receipt.request.profile,
      sampleCount: receipt.samples.length
    },
    target: {
      mapSchemaVersion: 2,
      projection: "globe",
      collection: "surfacePaint"
    },
    surfacePaint,
    authority: {
      applied: false,
      mutatesInput: false,
      automaticProviderExecution: false,
      gameplayAuthority: false,
      canonical: false,
      merge: false,
      canon: false
    }
  };
}

export function applyFoundationPlanetSurfaceProposal(map, proposal) {
  assert(isObject(map), "map must be an object");
  assert(Number(map.schemaVersion) === 2, "RTS map schemaVersion 2 is required");
  assert(map.projection === "globe", "Foundation Planet surface proposals can only be applied to globe maps");
  assert(isObject(proposal) && proposal.schema === FOUNDATION_PLANET_SURFACE_BRIDGE_SCHEMA, "unexpected surface proposal schema");
  assert(proposal.status === "PROPOSAL_ONLY", "surface proposal must remain proposal-only before explicit application");
  assert(proposal.authority?.canonical === false && proposal.authority?.canon === false, "surface proposal cannot carry CANON authority");
  assert(Array.isArray(proposal.surfacePaint), "surface proposal entries are required");

  const existing = new Set([
    ...(Array.isArray(map.strategicSites) ? map.strategicSites : []),
    ...(Array.isArray(map.resourceZones) ? map.resourceZones : []),
    ...(Array.isArray(map.terrainStamps) ? map.terrainStamps : []),
    ...(Array.isArray(map.decorations) ? map.decorations : []),
    ...(Array.isArray(map.ruleZones) ? map.ruleZones : []),
    ...(Array.isArray(map.surfacePaint) ? map.surfacePaint : [])
  ].map(item => item?.id).filter(Boolean));

  for (const entry of proposal.surfacePaint) {
    assert(typeof entry?.id === "string" && entry.id.length > 0, "proposal surface entry id is required");
    assert(!existing.has(entry.id), `map already contains object id ${entry.id}`);
    existing.add(entry.id);
  }

  const next = clone(map);
  next.surfacePaint = [
    ...(Array.isArray(next.surfacePaint) ? next.surfacePaint : []),
    ...clone(proposal.surfacePaint)
  ];
  return next;
}
