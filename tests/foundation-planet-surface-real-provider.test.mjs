import assert from "node:assert/strict";
import test from "node:test";

import {
  createSampleReceipt,
  describeCapability,
  verifySampleReceipt
} from "axm-foundation-planet-sampler";
import {
  applyFoundationPlanetSurfaceProposal,
  createFoundationPlanetSurfaceProposal
} from "../src/foundationPlanetSurfaceBridge.js";
import { createBlankMap, validateMapDefinition } from "../src/mapSchema.js";

const CANONICAL_IDENTITY = {
  angularUnit: "decimal-degrees",
  latitudeRange: "[-90, 90]",
  longitudeRange: "[-180, 180)",
  antimeridianLongitude: -180,
  poleLongitude: 0,
  signedZero: "positive"
};

test("current Foundation Planet package preserves canonical coordinate identity through RTS map admission", () => {
  const descriptor = describeCapability();
  assert.equal(descriptor.id, "axm.foundation-planet.coordinate-sampler");
  assert.equal(descriptor.version, "1.1.0");
  assert.equal(descriptor.status, "EXPERIMENTAL");
  assert.equal(descriptor.runtime.networkRequired, false);
  assert.equal(descriptor.authority.appliesState, false);
  assert.deepEqual(descriptor.model.coordinateIdentity, CANONICAL_IDENTITY);

  const receipt = createSampleReceipt({
    schema: "axm.foundation-planet.sample-request/v1",
    profile: "temperate",
    coordinates: [
      { id: "date-line", lat: 0, lon: 180 },
      { id: "north-pole", lat: 90, lon: 73 },
      { id: "signed-zero", lat: -0, lon: -0 }
    ]
  });
  const equivalent = createSampleReceipt({
    schema: "axm.foundation-planet.sample-request/v1",
    profile: "temperate",
    coordinates: [
      { id: "date-line", lat: 0, lon: -180 },
      { id: "north-pole", lat: 90, lon: 0 },
      { id: "signed-zero", lat: 0, lon: 0 }
    ]
  });

  assert.equal(verifySampleReceipt(receipt).valid, true);
  assert.equal(verifySampleReceipt(equivalent).valid, true);
  assert.equal(receipt.integrity.digest, equivalent.integrity.digest, "equivalent spherical coordinates must seal to one provider identity");
  assert.deepEqual(receipt.request.coordinates, equivalent.request.coordinates);
  assert.deepEqual(receipt.samples, equivalent.samples);
  assert.equal(receipt.request.coordinates[0].lon, -180);
  assert.equal(receipt.request.coordinates[1].lon, 0);
  assert.equal(Object.is(receipt.request.coordinates[2].lat, -0), false);
  assert.equal(Object.is(receipt.request.coordinates[2].lon, -0), false);

  const proposal = createFoundationPlanetSurfaceProposal(receipt, verifySampleReceipt);
  assert.equal(proposal.surfacePaint.length, 3);
  assert.equal(proposal.source.receiptDigest, receipt.integrity.digest);
  assert.deepEqual(proposal.source.coordinateIdentity, CANONICAL_IDENTITY);
  assert.equal(proposal.provider.head, process.env.PROVIDER_REF);
  assert.equal(proposal.provider.version, "1.1.0");
  assert.equal(proposal.provider.packageVersion, "0.2.0");
  assert.equal(proposal.authority.automaticProviderExecution, false);
  assert.equal(proposal.authority.gameplayAuthority, false);

  const baseMap = createBlankMap("globe");
  baseMap.id = "foundation-planet-admission-proof";
  baseMap.name = "Foundation Planet Admission Proof";
  const applied = applyFoundationPlanetSurfaceProposal(baseMap, proposal);
  const validation = validateMapDefinition(applied);
  assert.equal(validation.valid, true, validation.errors.join("; "));
  assert.equal(validation.map.surfacePaint.length, 3);
  for (let index = 0; index < validation.map.surfacePaint.length; index += 1) {
    const entry = validation.map.surfacePaint[index];
    assert.equal(entry.sourceEvidence.providerReceiptDigest, receipt.integrity.digest);
    assert.equal(entry.sourceEvidence.providerCapabilityVersion, "1.1.0");
    assert.deepEqual(entry.sourceEvidence.coordinateIdentity, CANONICAL_IDENTITY);
    assert.equal(entry.sourceEvidence.sampleIndex, index);
    assert.match(entry.tags.join(" "), /foundation-biome:/);
    assert.equal(entry.geo.lat, receipt.samples[index].coordinate.lat);
    assert.equal(entry.geo.lon, receipt.samples[index].coordinate.lon);
  }

  assert.equal(baseMap.surfacePaint.length, 0, "explicit application must not mutate caller-owned map state");
});
