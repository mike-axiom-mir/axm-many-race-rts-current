export const FOUNDATION_PLANET_SURFACE_BRIDGE_SCHEMA = "axm.rts.foundation-planet-surface-proposal/v1";

export const FOUNDATION_PLANET_PROVIDER_V1_0 = Object.freeze({
  repository: "mike-axiom-mir/foundation-planet-experiments",
  pullRequest: 9,
  head: "8f4e543669141acf93c61d44cf3827b1240e76f0",
  package: "axm-foundation-planet-sampler",
  packageVersion: "0.1.0",
  capability: "axm.foundation-planet.coordinate-sampler",
  version: "1.0.0",
  requestSchema: "axm.foundation-planet.sample-request/v1",
  receiptSchema: "axm.foundation-planet.sample-receipt/v1",
  verificationSchema: "axm.foundation-planet.sample-verification/v1",
  worldId: "world.axm.foundation-planet",
  coordinateIdentity: null
});

export const FOUNDATION_PLANET_PROVIDER_V1_1 = Object.freeze({
  repository: "mike-axiom-mir/foundation-planet-experiments",
  pullRequest: 11,
  head: "d04a47289cdf6ed9f38b65fa989965504eee7e3e",
  package: "axm-foundation-planet-sampler",
  packageVersion: "0.2.0",
  capability: "axm.foundation-planet.coordinate-sampler",
  version: "1.1.0",
  requestSchema: "axm.foundation-planet.sample-request/v1",
  receiptSchema: "axm.foundation-planet.sample-receipt/v1",
  verificationSchema: "axm.foundation-planet.sample-verification/v1",
  worldId: "world.axm.foundation-planet",
  coordinateIdentity: Object.freeze({
    angularUnit: "decimal-degrees",
    latitudeRange: "[-90, 90]",
    longitudeRange: "[-180, 180)",
    antimeridianLongitude: -180,
    poleLongitude: 0,
    signedZero: "positive"
  })
});

export const FOUNDATION_PLANET_PROVIDER = FOUNDATION_PLANET_PROVIDER_V1_1;
export const FOUNDATION_PLANET_SUPPORTED_PROVIDERS = Object.freeze({
  [FOUNDATION_PLANET_PROVIDER_V1_0.version]: FOUNDATION_PLANET_PROVIDER_V1_0,
  [FOUNDATION_PLANET_PROVIDER_V1_1.version]: FOUNDATION_PLANET_PROVIDER_V1_1
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

function providerForReceipt(receipt) {
  const version = receipt?.capability?.version;
  const provider = FOUNDATION_PLANET_SUPPORTED_PROVIDERS[version];
  assert(provider, `unsupported Foundation Planet capability version: ${version || "<missing>"}`);
  return provider;
}

function validateCanonicalCoordinate(coordinate, label) {
  assert(isObject(coordinate), `${label} must be an object`);
  const lat = coordinate.lat;
  const lon = coordinate.lon;
  assert(Number.isFinite(lat) && lat >= -90 && lat <= 90, `${label}.lat must be between -90 and 90`);
  assert(Number.isFinite(lon) && lon >= -180 && lon < 180, `${label}.lon must use canonical range [-180, 180)`);
  assert(!Object.is(lat, -0), `${label}.lat must use positive signed zero`);
  assert(!Object.is(lon, -0), `${label}.lon must use positive signed zero`);
  if (Math.abs(lat) === 90) {
    assert(lon === 0, `${label}.lon must be 0 at either pole`);
  }
}

function validateCanonicalCoordinateIdentity(receipt) {
  for (let index = 0; index < receipt.request.coordinates.length; index += 1) {
    const requested = receipt.request.coordinates[index];
    const sampled = receipt.samples[index]?.coordinate;
    validateCanonicalCoordinate(requested, `request.coordinates[${index}]`);
    validateCanonicalCoordinate(sampled, `samples[${index}].coordinate`);
    assert(sampled.lat === requested.lat && sampled.lon === requested.lon, `samples[${index}].coordinate must match the canonical request coordinate`);
    if (requested.id != null || sampled.id != null) {
      assert(sampled.id === requested.id, `samples[${index}].coordinate.id must match the request coordinate id`);
    }
  }
}

function validateReceipt(receipt) {
  assert(isObject(receipt), "Foundation Planet receipt must be an object");
  assert(receipt.capability?.id === FOUNDATION_PLANET_PROVIDER.capability, "unexpected Foundation Planet capability id");
  const provider = providerForReceipt(receipt);
  assert(receipt.schema === provider.receiptSchema, "unexpected Foundation Planet receipt schema");
  assert(receipt.world?.id === provider.worldId, "unexpected Foundation Planet world id");
  assert(receipt.request?.schema === provider.requestSchema, "unexpected Foundation Planet request schema");
  assert(typeof receipt.request?.profile === "string" && receipt.request.profile.length > 0, "Foundation Planet profile is required");
  assert(Array.isArray(receipt.request?.coordinates), "Foundation Planet request coordinates are required");
  assert(Array.isArray(receipt.samples), "Foundation Planet samples are required");
  assert(receipt.samples.length === receipt.request.coordinates.length, "sample count must equal coordinate count");
  assert(receipt.integrity?.algorithm === "sha256", "Foundation Planet receipt must use SHA-256 integrity");
  assert(/^[a-f0-9]{64}$/.test(receipt.integrity?.digest || ""), "Foundation Planet receipt digest must be lowercase SHA-256");
  if (provider.coordinateIdentity) validateCanonicalCoordinateIdentity(receipt);
  return provider;
}

function validateVerification(verification, receipt, provider) {
  assert(isObject(verification), "Foundation Planet verifier must return an object");
  assert(verification.schema === provider.verificationSchema, "unexpected Foundation Planet verification schema");
  assert(verification.valid === true, "Foundation Planet verifier did not validate the receipt");
  assert(verification.receiptDigest === receipt.integrity.digest, "verification digest does not match the receipt");
  assert(verification.sampleCount === receipt.samples.length, "verification sample count does not match the receipt");
  assert(verification.worldId === provider.worldId, "verification world does not match the pinned provider");
  assert(verification.appliedState === false, "provider verification unexpectedly reports applied state");
  assert(verification.canonical === false, "provider verification unexpectedly reports canonical authority");
}

function surfacePaintFromSample(entry, index, profile, receiptDigest, radius, provider) {
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
      providerCapability: provider.capability,
      providerCapabilityVersion: provider.version,
      providerReceiptDigest: receiptDigest,
      sampleIndex: index,
      coordinateId,
      coordinateIdentity: provider.coordinateIdentity ? clone(provider.coordinateIdentity) : null,
      biome,
      biomeLabel: typeof sample.biomeLabel === "string" ? sample.biomeLabel : null,
      elevationM: Number.isFinite(sample.elevationM) ? sample.elevationM : null,
      projectionNote: "RTS surface skin is an explicit game projection of provider evidence, not a scientific equivalence claim"
    }
  };
}

export function createFoundationPlanetSurfaceProposal(receipt, verifySampleReceipt, options = {}) {
  const provider = validateReceipt(receipt);
  assert(typeof verifySampleReceipt === "function", "a Foundation Planet receipt verifier is required");
  const radius = options.radius == null ? 7 : Number(options.radius);
  finiteRange(radius, 0.5, 30, "surface radius");

  const verification = verifySampleReceipt(clone(receipt));
  validateVerification(verification, receipt, provider);
  const surfacePaint = receipt.samples.map((entry, index) =>
    surfacePaintFromSample(entry, index, receipt.request.profile, receipt.integrity.digest, radius, provider)
  );

  return {
    schema: FOUNDATION_PLANET_SURFACE_BRIDGE_SCHEMA,
    status: "PROPOSAL_ONLY",
    provider: clone(provider),
    source: {
      receiptSchema: receipt.schema,
      receiptDigest: receipt.integrity.digest,
      worldId: receipt.world.id,
      profile: receipt.request.profile,
      sampleCount: receipt.samples.length,
      coordinateIdentity: provider.coordinateIdentity ? clone(provider.coordinateIdentity) : null
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
