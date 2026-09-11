import assert from "node:assert/strict";
import test from "node:test";

import {
  FOUNDATION_PLANET_PROVIDER,
  FOUNDATION_PLANET_PROVIDER_V1_0,
  FOUNDATION_PLANET_SURFACE_BRIDGE_SCHEMA,
  applyFoundationPlanetSurfaceProposal,
  createFoundationPlanetSurfaceProposal
} from "../src/foundationPlanetSurfaceBridge.js";

function fixtureReceipt(provider = FOUNDATION_PLANET_PROVIDER) {
  return {
    schema: provider.receiptSchema,
    capability: { id: provider.capability, version: provider.version },
    world: { id: provider.worldId, seed: 18470219, modelSchema: "axm.foundation-planet.model/v1" },
    request: {
      schema: provider.requestSchema,
      profile: "temperate",
      coordinates: [
        { id: "forest", lat: 12, lon: 23 },
        { id: "ice", lat: 80, lon: -40 }
      ]
    },
    samples: [
      { coordinate: { id: "forest", lat: 12, lon: 23 }, sample: { biome: "temperate_forest", biomeLabel: "Temperate forest", color: "#275f37", elevationM: 411 } },
      { coordinate: { id: "ice", lat: 80, lon: -40 }, sample: { biome: "ice", biomeLabel: "Permanent ice", color: "#d9edf0", elevationM: 92 } }
    ],
    authority: { appliedState: false, canonical: false, scientificModel: false },
    integrity: { algorithm: "sha256", digest: "a".repeat(64) }
  };
}

function verifier(receipt) {
  const provider = receipt.capability.version === FOUNDATION_PLANET_PROVIDER_V1_0.version
    ? FOUNDATION_PLANET_PROVIDER_V1_0
    : FOUNDATION_PLANET_PROVIDER;
  return {
    schema: provider.verificationSchema,
    valid: true,
    receiptDigest: receipt.integrity.digest,
    sampleCount: receipt.samples.length,
    worldId: provider.worldId,
    appliedState: false,
    canonical: false
  };
}

function globeMap() {
  return {
    schemaVersion: 2,
    id: "bridge-test",
    name: "Bridge Test",
    projection: "globe",
    strategicSites: [],
    resourceZones: [],
    terrainStamps: [],
    decorations: [],
    ruleZones: [],
    surfacePaint: []
  };
}

test("maps verified current provider samples into bounded RTS surface-paint proposals", () => {
  const receipt = fixtureReceipt();
  const proposal = createFoundationPlanetSurfaceProposal(receipt, verifier);
  assert.equal(proposal.schema, FOUNDATION_PLANET_SURFACE_BRIDGE_SCHEMA);
  assert.equal(proposal.status, "PROPOSAL_ONLY");
  assert.equal(proposal.provider.version, "1.1.0");
  assert.equal(proposal.provider.packageVersion, "0.2.0");
  assert.equal(proposal.source.receiptDigest, receipt.integrity.digest);
  assert.equal(proposal.source.coordinateIdentity.longitudeRange, "[-180, 180)");
  assert.equal(proposal.surfacePaint.length, 2);
  assert.equal(proposal.surfacePaint[0].skin, "forest-floor");
  assert.equal(proposal.surfacePaint[1].skin, "ice");
  assert.deepEqual(proposal.surfacePaint[0].geo, { lat: 12, lon: 23, elevation: 0 });
  assert.equal(proposal.surfacePaint[0].sourceEvidence.providerCapabilityVersion, "1.1.0");
  assert.equal(proposal.authority.applied, false);
  assert.equal(proposal.authority.canon, false);
});

test("proposal creation is deterministic and does not mutate provider evidence", () => {
  const receipt = fixtureReceipt();
  const before = structuredClone(receipt);
  assert.deepEqual(createFoundationPlanetSurfaceProposal(receipt, verifier), createFoundationPlanetSurfaceProposal(receipt, verifier));
  assert.deepEqual(receipt, before);
});

test("requires replay verification from the provider boundary", () => {
  const receipt = fixtureReceipt();
  assert.throws(() => createFoundationPlanetSurfaceProposal(receipt, () => ({ ...verifier(receipt), valid: false })), /did not validate/);
  assert.throws(() => createFoundationPlanetSurfaceProposal(receipt, () => ({ ...verifier(receipt), receiptDigest: "b".repeat(64) })), /digest does not match/);
});

test("rejects capability identity and unsupported version drift before mapping", () => {
  const receipt = fixtureReceipt();
  receipt.capability.id = "other.capability";
  assert.throws(() => createFoundationPlanetSurfaceProposal(receipt, verifier), /capability id/);

  const future = fixtureReceipt();
  future.capability.version = "9.0.0";
  assert.throws(() => createFoundationPlanetSurfaceProposal(future, verifier), /unsupported Foundation Planet capability version/);
});

test("current provider receipts must already use canonical antimeridian, pole and signed-zero identity", () => {
  const antimeridian = fixtureReceipt();
  antimeridian.request.coordinates[0].lon = 180;
  antimeridian.samples[0].coordinate.lon = 180;
  assert.throws(() => createFoundationPlanetSurfaceProposal(antimeridian, verifier), /canonical range/);

  const pole = fixtureReceipt();
  pole.request.coordinates[0] = { id: "forest", lat: 90, lon: 20 };
  pole.samples[0].coordinate = { id: "forest", lat: 90, lon: 20 };
  assert.throws(() => createFoundationPlanetSurfaceProposal(pole, verifier), /must be 0 at either pole/);

  const signedZero = fixtureReceipt();
  signedZero.request.coordinates[0] = { id: "forest", lat: -0, lon: -0 };
  signedZero.samples[0].coordinate = { id: "forest", lat: -0, lon: -0 };
  assert.throws(() => createFoundationPlanetSurfaceProposal(signedZero, verifier), /positive signed zero/);
});

test("provider sample coordinates must equal the canonical request coordinates", () => {
  const receipt = fixtureReceipt();
  receipt.samples[0].coordinate.lon = 24;
  assert.throws(() => createFoundationPlanetSurfaceProposal(receipt, verifier), /must match the canonical request coordinate/);
});

test("legacy 1.0.0 receipts remain explicitly supported without retroactive reinterpretation", () => {
  const receipt = fixtureReceipt(FOUNDATION_PLANET_PROVIDER_V1_0);
  receipt.request.coordinates[0].lon = 180;
  receipt.samples[0].coordinate.lon = 180;
  const proposal = createFoundationPlanetSurfaceProposal(receipt, verifier);
  assert.equal(proposal.provider.version, "1.0.0");
  assert.equal(proposal.source.coordinateIdentity, null);
  assert.equal(proposal.surfacePaint[0].geo.lon, 180);
  assert.equal(proposal.surfacePaint[0].sourceEvidence.coordinateIdentity, null);
});

test("fails closed on biomes without an explicit RTS projection", () => {
  const receipt = fixtureReceipt();
  receipt.samples[0].sample.biome = "future_unknown_biome";
  assert.throws(() => createFoundationPlanetSurfaceProposal(receipt, verifier), /unsupported Foundation Planet biome/);
});

test("explicit application returns a new globe map and preserves evidence metadata", () => {
  const map = globeMap();
  const proposal = createFoundationPlanetSurfaceProposal(fixtureReceipt(), verifier, { radius: 9 });
  const next = applyFoundationPlanetSurfaceProposal(map, proposal);
  assert.equal(map.surfacePaint.length, 0);
  assert.equal(next.surfacePaint.length, 2);
  assert.equal(next.surfacePaint[0].radius, 9);
  assert.equal(next.surfacePaint[0].sourceEvidence.providerReceiptDigest, "a".repeat(64));
  assert.equal(next.surfacePaint[0].sourceEvidence.coordinateIdentity.antimeridianLongitude, -180);
});

test("application rejects flat maps and existing object-id collisions", () => {
  const proposal = createFoundationPlanetSurfaceProposal(fixtureReceipt(), verifier);
  assert.throws(() => applyFoundationPlanetSurfaceProposal({ ...globeMap(), projection: "flat" }, proposal), /only be applied to globe maps/);
  const map = globeMap();
  map.terrainStamps.push({ id: "foundation-planet-surface-1" });
  assert.throws(() => applyFoundationPlanetSurfaceProposal(map, proposal), /already contains object id/);
});

test("surface radius is bounded instead of silently accepting extreme projections", () => {
  assert.throws(() => createFoundationPlanetSurfaceProposal(fixtureReceipt(), verifier, { radius: 0 }), /surface radius/);
  assert.throws(() => createFoundationPlanetSurfaceProposal(fixtureReceipt(), verifier, { radius: 31 }), /surface radius/);
});
