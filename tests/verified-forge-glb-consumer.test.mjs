import test from "node:test";
import assert from "node:assert/strict";
import {
  VERIFIED_FORGE_GLB_ADMITTED,
  VERIFIED_FORGE_GLB_REALIZED,
  admitVerifiedForgeGlb,
  canonicalJson,
  realizeAdmittedForgeGlb
} from "../src/verifiedForgeGlbConsumer.js";

const DELIVERY_SCHEMA = "axm.game-assets.verified-glb-delivery/v0.1";
const READY = "READY_FOR_EXPLICIT_CONSUMER_LOAD";
const MANIFEST = "sha256:" + "a".repeat(64);

function request() {
  return {
    contract: "axm.rts.forge-unit-request/v0.1",
    asset: { id: "rts-northpole-guard", name: "Northpole Guard", type: "rigid-proxy", unit_meters: 1.82 },
    targets: { engines: ["threejs"], delivery: ["glb"] },
    budgets: { triangles: { lod0: 30000, lod1: 15000, lod2: 7000, lod3: 3000 } },
    quality: { pbr_channels: ["base_color", "normal", "roughness", "metallic"] },
    variants: [{ id: "rts", changes: ["prioritize distant silhouette readability"] }],
    sources: [{ kind: "axm-unit-pack-source", repository: "mike-axiom-mir/axm-many-race-rts-current", ref: "0".repeat(40), path: "src/contentPacks.js", pack_id: "northpole-units", pack_source: "built-in", faction_id: "northpole", unit_id: "guard" }]
  };
}

function u32(value) {
  const bytes = new Uint8Array(4);
  new DataView(bytes.buffer).setUint32(0, value, true);
  return bytes;
}

function join(...parts) {
  const length = parts.reduce((sum, part) => sum + part.byteLength, 0);
  const result = new Uint8Array(length);
  let offset = 0;
  for (const part of parts) {
    result.set(part, offset);
    offset += part.byteLength;
  }
  return result;
}

function makeGlb({ manifest = MANIFEST, externalBuffer = false, externalImage = false } = {}) {
  const bin = new Uint8Array([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]);
  const document = {
    asset: { version: "2.0", extras: { axm_verified_delivery: { schema: DELIVERY_SCHEMA, source_manifest_sha256: manifest } } },
    buffers: [{ byteLength: bin.byteLength, ...(externalBuffer ? { uri: "mesh.bin" } : {}) }],
    bufferViews: [{ buffer: 0, byteOffset: 0, byteLength: bin.byteLength }],
    images: [externalImage ? { uri: "color.png", mimeType: "image/png" } : { bufferView: 0, mimeType: "image/png" }]
  };
  let json = new TextEncoder().encode(canonicalJson(document));
  if (json.byteLength % 4) {
    const padded = new Uint8Array(json.byteLength + (4 - json.byteLength % 4));
    padded.fill(0x20);
    padded.set(json);
    json = padded;
  }
  const total = 12 + 8 + json.byteLength + 8 + bin.byteLength;
  return join(
    new Uint8Array([0x67, 0x6c, 0x54, 0x46]), u32(2), u32(total),
    u32(json.byteLength), u32(0x4e4f534a), json,
    u32(bin.byteLength), u32(0x004e4942), bin
  );
}

async function sha256(bytes) {
  const digest = await crypto.subtle.digest("SHA-256", bytes instanceof Uint8Array ? bytes : new Uint8Array(bytes));
  return "sha256:" + [...new Uint8Array(digest)].map(value => value.toString(16).padStart(2, "0")).join("");
}

async function receipt(req, glb, { manifest = MANIFEST } = {}) {
  return {
    schema: DELIVERY_SCHEMA,
    status: READY,
    source: { manifest_sha256: manifest },
    asset: { name: req.asset.id },
    consumer_request: {
      contract: req.contract,
      sha256: await sha256(new TextEncoder().encode(canonicalJson(req))),
      asset_id: req.asset.id,
      asset_type: "rigid-proxy",
      engine: "threejs",
      delivery: "glb"
    },
    delivery: {
      format: "glb",
      sha256: await sha256(glb),
      bytes: glb.byteLength,
      self_contained: true,
      validation: { status: "pass", asset_version: "2.0", images_embedded: 1 }
    },
    authority: {
      canonical_genome_mutation: false,
      source_package_mutation: false,
      automatic_consumer_install: false,
      automatic_runtime_adoption: false,
      visual_approval: false,
      merge: false,
      canon: false
    },
    truth: {
      rigid_snapshot_only: true,
      skeleton_or_animation_claim: false,
      consumer_request_binding_is_compatibility_evidence_not_visual_fitness: true
    }
  };
}

function fakeThreeResult() {
  const mesh = { isMesh: true };
  return {
    scene: {
      isObject3D: true,
      traverse(callback) { callback(this); callback(mesh); }
    }
  };
}

test("admits exact verified bytes and requires a separate explicit renderer parse", async () => {
  const req = request();
  const glb = makeGlb();
  const delivery = await receipt(req, glb);
  let parses = 0;
  const admission = await admitVerifiedForgeGlb({ request: req, deliveryReceipt: delivery, glbBytes: glb });
  assert.equal(admission.state, VERIFIED_FORGE_GLB_ADMITTED);
  assert.equal(admission.request.asset_id, req.asset.id);
  assert.equal(admission.glb.sha256, delivery.delivery.sha256);
  assert.equal(admission.authority.renderer_parse, false);
  assert.equal(parses, 0);

  const realized = await realizeAdmittedForgeGlb({
    admission,
    glbBytes: glb,
    parse: async () => { parses += 1; return fakeThreeResult(); }
  });
  assert.equal(parses, 1);
  assert.equal(realized.state, VERIFIED_FORGE_GLB_REALIZED);
  assert.equal(realized.evidence.mesh_count, 1);
  assert.equal(realized.evidence.authority.renderer_parse, true);
  assert.equal(realized.evidence.authority.render_graph_mutation, false);
  assert.equal(realized.evidence.authority.canonical_game_state_mutation, false);
});

test("rejects changed GLB bytes before renderer parsing", async () => {
  const req = request();
  const glb = makeGlb();
  const delivery = await receipt(req, glb);
  const admission = await admitVerifiedForgeGlb({ request: req, deliveryReceipt: delivery, glbBytes: glb });
  const changed = new Uint8Array(glb);
  changed[changed.length - 1] ^= 1;
  let parsed = false;
  await assert.rejects(() => realizeAdmittedForgeGlb({ admission, glbBytes: changed, parse: async () => { parsed = true; return fakeThreeResult(); } }), /no longer matches/);
  assert.equal(parsed, false);
});

test("rejects a delivery whose bytes do not match its receipt", async () => {
  const req = request();
  const glb = makeGlb();
  const delivery = await receipt(req, glb);
  const changed = new Uint8Array(glb);
  changed[changed.length - 1] ^= 1;
  await assert.rejects(() => admitVerifiedForgeGlb({ request: req, deliveryReceipt: delivery, glbBytes: changed }), /SHA-256 differs/);
});

test("rejects request substitution even when the GLB is unchanged", async () => {
  const req = request();
  const glb = makeGlb();
  const delivery = await receipt(req, glb);
  const substituted = structuredClone(req);
  substituted.asset.id = "rts-northpole-founder";
  await assert.rejects(() => admitVerifiedForgeGlb({ request: substituted, deliveryReceipt: delivery, glbBytes: glb }), /exact RTS request bytes/);
});

test("rejects provider authority escalation and unknown authority keys", async () => {
  const req = request();
  const glb = makeGlb();
  const escalated = await receipt(req, glb);
  escalated.authority.automatic_runtime_adoption = true;
  await assert.rejects(() => admitVerifiedForgeGlb({ request: req, deliveryReceipt: escalated, glbBytes: glb }), /automatic_runtime_adoption/);

  const widened = await receipt(req, glb);
  widened.authority.auto_replace_game_mesh = false;
  await assert.rejects(() => admitVerifiedForgeGlb({ request: req, deliveryReceipt: widened, glbBytes: glb }), /keys are not the supported contract/);
});

test("rejects character requests at the rigid realization seam", async () => {
  const req = request();
  req.asset.type = "character";
  const glb = makeGlb();
  const delivery = await receipt(req, glb);
  await assert.rejects(() => admitVerifiedForgeGlb({ request: req, deliveryReceipt: delivery, glbBytes: glb }), /only rigid-proxy/);
});

test("rejects external GLB buffer or image references even under a matching receipt", async () => {
  const req = request();
  for (const glb of [makeGlb({ externalBuffer: true }), makeGlb({ externalImage: true })]) {
    const delivery = await receipt(req, glb);
    await assert.rejects(() => admitVerifiedForgeGlb({ request: req, deliveryReceipt: delivery, glbBytes: glb }), /must be embedded|must not retain a URI/);
  }
});

test("rejects source-package identity substitution between receipt and embedded GLB evidence", async () => {
  const req = request();
  const glb = makeGlb();
  const delivery = await receipt(req, glb, { manifest: "sha256:" + "b".repeat(64) });
  await assert.rejects(() => admitVerifiedForgeGlb({ request: req, deliveryReceipt: delivery, glbBytes: glb }), /source manifest identity differs/);
});
