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

test("real Foundation Planet package produces a proposal admitted by the current RTS globe-map schema", () => {
  const descriptor = describeCapability();
  assert.equal(descriptor.id, "axm.foundation-planet.coordinate-sampler");
  assert.equal(descriptor.version, "1.0.0");
  assert.equal(descriptor.status, "EXPERIMENTAL");
  assert.equal(descriptor.runtime.networkRequired, false);
  assert.equal(descriptor.authority.appliesState, false);

  const receipt = createSampleReceipt({
    schema: "axm.foundation-planet.sample-request/v1",
    profile: "temperate",
    coordinates: [
      { id: "equator", lat: 0, lon: 0 },
      { id: "north", lat: 52.1, lon: 5.1 },
      { id: "south", lat: -41.3, lon: 174.8 }
    ]
  });
  const providerCheck = verifySampleReceipt(receipt);
  assert.equal(providerCheck.valid, true);

  const proposal = createFoundationPlanetSurfaceProposal(receipt, verifySampleReceipt);
  assert.equal(proposal.surfacePaint.length, 3);
  assert.equal(proposal.source.receiptDigest, receipt.integrity.digest);
  assert.equal(proposal.provider.head, process.env.PROVIDER_REF);
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
    assert.equal(entry.sourceEvidence.sampleIndex, index);
    assert.match(entry.tags.join(" "), /foundation-biome:/);
    assert.equal(entry.geo.lat, receipt.samples[index].coordinate.lat);
    assert.equal(entry.geo.lon, receipt.samples[index].coordinate.lon);
  }

  assert.equal(baseMap.surfacePaint.length, 0, "explicit application must not mutate caller-owned map state");
});
