import assert from "node:assert/strict";
import test from "node:test";

import {
  FOUNDATION_PLANET_PROVIDER,
  FOUNDATION_PLANET_SURFACE_BRIDGE_SCHEMA,
  applyFoundationPlanetSurfaceProposal,
  createFoundationPlanetSurfaceProposal
} from "../src/foundationPlanetSurfaceBridge.js";

function fixtureReceipt() {
  return {
    schema: FOUNDATION_PLANET_PROVIDER.receiptSchema,
    capability: { id: FOUNDATION_PLANET_PROVIDER.capability, version: FOUNDATION_PLANET_PROVIDER.version },
    world: { id: FOUNDATION_PLANET_PROVIDER.worldId, seed: 18470219, modelSchema: "axm.foundation-planet.model/v1" },
    request: {
      schema: FOUNDATION_PLANET_PROVIDER.requestSchema,
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
  return {
    schema: FOUNDATION_PLANET_PROVIDER.verificationSchema,
    valid: true,
    receiptDigest: receipt.integrity.digest,
    sampleCount: receipt.samples.length,
    worldId: FOUNDATION_PLANET_PROVIDER.worldId,
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

test("maps verified provider samples into bounded RTS surface-paint proposals", () => {
  const receipt = fixtureReceipt();
  const proposal = createFoundationPlanetSurfaceProposal(receipt, verifier);
  assert.equal(proposal.schema, FOUNDATION_PLANET_SURFACE_BRIDGE_SCHEMA);
  assert.equal(proposal.status, "PROPOSAL_ONLY");
  assert.equal(proposal.source.receiptDigest, receipt.integrity.digest);
  assert.equal(proposal.surfacePaint.length, 2);
  assert.equal(proposal.surfacePaint[0].skin, "forest-floor");
  assert.equal(proposal.surfacePaint[1].skin, "ice");
  assert.deepEqual(proposal.surfacePaint[0].geo, { lat: 12, lon: 23, elevation: 0 });
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

test("rejects capability identity drift before mapping", () => {
  const receipt = fixtureReceipt();
  receipt.capability.id = "other.capability";
  assert.throws(() => createFoundationPlanetSurfaceProposal(receipt, verifier), /capability id/);
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
