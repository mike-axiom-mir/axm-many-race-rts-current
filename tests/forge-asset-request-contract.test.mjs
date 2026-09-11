import assert from "node:assert/strict";
import test from "node:test";
import { buildForgeUnitRequest, requestTruthBoundary } from "../src/forgeAssetRequest.js";

const SHA = "790e8969549321afcd7c2fe76bddc31ab3d8c995";
const PACK = {
  schemaVersion: 1,
  kind: "unit-pack",
  id: "unit-pack:northpole:core",
  name: "Northpole Dominion Core Units",
  factionId: "northpole",
  source: "builtin-faction",
  units: [
    { id: "guard", name: "Dominion Guard", cost: { food: 65, gold: 30 }, hp: 105, damage: 13, speed: 3.1, range: 1.3, description: "Reliable line squad" },
    { id: "sled", name: "Sled Lancers", hp: 85, damage: 18 }
  ]
};

function keysDeep(value, out = new Set()) {
  if (Array.isArray(value)) value.forEach(item => keysDeep(item, out));
  else if (value && typeof value === "object") {
    for (const [key, item] of Object.entries(value)) {
      out.add(key);
      keysDeep(item, out);
    }
  }
  return out;
}

test("exports a deterministic Forge request from a portable RTS unit pack", () => {
  const options = { unitId: "guard", assetType: "character", unitMeters: 1.82, sourceRef: SHA };
  const first = buildForgeUnitRequest(PACK, options);
  const second = buildForgeUnitRequest(PACK, options);
  assert.deepEqual(first, second);
  assert.equal(first.contract, "axm.rts.forge-unit-request/v0.1");
  assert.deepEqual(first.targets, { engines: ["threejs"], delivery: ["glb"] });
  assert.deepEqual(first.quality.pbr_channels, ["base_color", "normal", "roughness", "metallic"]);
  assert.deepEqual(first.budgets.triangles, { lod0: 30000, lod1: 15000, lod2: 7000, lod3: 3000 });
  assert.equal(first.sources[0].ref, SHA);
  assert.equal(first.sources[0].pack_id, PACK.id);
});

test("transfers identity and provenance but not gameplay stats", () => {
  const request = buildForgeUnitRequest(PACK, { unitId: "guard", assetType: "character", unitMeters: 1.82, sourceRef: SHA });
  const keys = keysDeep(request);
  for (const forbidden of ["hp", "damage", "speed", "range", "cost", "health", "attack"]) assert.equal(keys.has(forbidden), false, `unexpected gameplay key ${forbidden}`);
  assert.equal(request.asset.name, "Dominion Guard");
  assert.equal(request.sources[0].unit_id, "guard");
  assert.deepEqual(requestTruthBoundary(request), {
    gameplay_fields_transferred: false,
    inferred_scale: false,
    inferred_asset_type: false,
    provider_execution_authority: false,
    runtime_adoption_authority: false,
    merge_authority: false,
    canon_authority: false,
    request_contract: "axm.rts.forge-unit-request/v0.1"
  });
});

test("requires the caller to choose physical scale and asset type", () => {
  assert.throws(() => buildForgeUnitRequest(PACK, { unitId: "guard", assetType: "character", sourceRef: SHA }), /unit meters/);
  assert.throws(() => buildForgeUnitRequest(PACK, { unitId: "guard", unitMeters: 1.82, sourceRef: SHA }), /asset type/);
  assert.throws(() => buildForgeUnitRequest(PACK, { unitId: "guard", assetType: "character", unitMeters: 0, sourceRef: SHA }), /unit meters/);
});

test("fails closed on missing source identities", () => {
  assert.throws(() => buildForgeUnitRequest(PACK, { unitId: "missing", assetType: "character", unitMeters: 1.82, sourceRef: SHA }), /not present/);
  assert.throws(() => buildForgeUnitRequest(PACK, { unitId: "guard", assetType: "character", unitMeters: 1.82, sourceRef: "main" }), /exact 40-character/);
  assert.throws(() => buildForgeUnitRequest({ ...PACK, kind: "faction-pack" }, { unitId: "guard", assetType: "character", unitMeters: 1.82, sourceRef: SHA }), /kind/);
});

test("does not mutate the source pack", () => {
  const before = structuredClone(PACK);
  const request = buildForgeUnitRequest(PACK, { unitId: "guard", assetType: "character", unitMeters: 1.82, sourceRef: SHA });
  request.sources[0].pack_id = "changed";
  assert.deepEqual(PACK, before);
});
