export const VERIFIED_FORGE_GLB_CONSUMER = "axm.rts.verified-forge-glb-consumer/v0.1";
export const VERIFIED_FORGE_GLB_DELIVERY = "axm.game-assets.verified-glb-delivery/v0.1";
export const VERIFIED_FORGE_GLB_READY = "READY_FOR_EXPLICIT_CONSUMER_LOAD";
export const VERIFIED_FORGE_GLB_ADMITTED = "READY_FOR_EXPLICIT_RENDER_PARSE";
export const VERIFIED_FORGE_GLB_REALIZED = "REALIZED_NOT_INSTALLED";

const REQUEST_CONTRACT = "axm.rts.forge-unit-request/v0.1";
const REQUIRED_AUTHORITY_KEYS = Object.freeze([
  "automatic_consumer_install",
  "automatic_runtime_adoption",
  "canonical_genome_mutation",
  "canon",
  "merge",
  "source_package_mutation",
  "visual_approval"
]);

function assert(condition, message) {
  if (!condition) throw new Error(message);
}

function isPlainObject(value) {
  return value !== null && typeof value === "object" && !Array.isArray(value);
}

function exactKeys(value, expected, label) {
  assert(isPlainObject(value), `${label} must be an object`);
  const actual = Object.keys(value).sort();
  const wanted = [...expected].sort();
  assert(JSON.stringify(actual) === JSON.stringify(wanted), `${label} keys are not the supported contract`);
}

function canonicalize(value) {
  if (value === null || typeof value === "string" || typeof value === "boolean") return value;
  if (typeof value === "number") {
    assert(Number.isFinite(value), "canonical JSON rejects non-finite numbers");
    return value;
  }
  if (Array.isArray(value)) return value.map(canonicalize);
  assert(isPlainObject(value), "canonical JSON accepts only JSON values");
  const result = {};
  for (const key of Object.keys(value).sort()) result[key] = canonicalize(value[key]);
  return result;
}

export function canonicalJson(value) {
  return JSON.stringify(canonicalize(value));
}

function asBytes(value) {
  if (value instanceof Uint8Array) return value;
  if (value instanceof ArrayBuffer) return new Uint8Array(value);
  if (ArrayBuffer.isView(value)) return new Uint8Array(value.buffer, value.byteOffset, value.byteLength);
  throw new Error("GLB bytes must be an ArrayBuffer or byte view");
}

async function sha256Bytes(bytes) {
  assert(globalThis.crypto?.subtle, "Web Crypto SHA-256 is required for verified GLB admission");
  const view = asBytes(bytes);
  const copy = new Uint8Array(view.byteLength);
  copy.set(view);
  const digest = await globalThis.crypto.subtle.digest("SHA-256", copy.buffer);
  return "sha256:" + [...new Uint8Array(digest)].map(value => value.toString(16).padStart(2, "0")).join("");
}

async function sha256Text(text) {
  return sha256Bytes(new TextEncoder().encode(text));
}

function isSha256(value) {
  return typeof value === "string" && /^sha256:[0-9a-f]{64}$/.test(value);
}

function validateRequest(request) {
  assert(isPlainObject(request), "Forge request must be an object");
  assert(request.contract === REQUEST_CONTRACT, `unsupported Forge request contract ${request.contract}`);
  assert(isPlainObject(request.asset), "Forge request asset is required");
  assert(typeof request.asset.id === "string" && request.asset.id.length > 0, "Forge request asset.id is required");
  assert(request.asset.type === "rigid-proxy", "verified rigid GLB consumer accepts only rigid-proxy requests");
  assert(isPlainObject(request.targets), "Forge request targets are required");
  assert(JSON.stringify(request.targets.engines) === JSON.stringify(["threejs"]), "Forge request must target only threejs");
  assert(JSON.stringify(request.targets.delivery) === JSON.stringify(["glb"]), "Forge request must target only glb delivery");
}

function validateProviderAuthority(authority) {
  exactKeys(authority, REQUIRED_AUTHORITY_KEYS, "provider authority");
  for (const key of REQUIRED_AUTHORITY_KEYS) assert(authority[key] === false, `provider authority ${key} must remain false`);
}

function parseGlbStructure(raw) {
  const bytes = asBytes(raw);
  assert(bytes.byteLength >= 28, "GLB is shorter than the required two-chunk boundary");
  const view = new DataView(bytes.buffer, bytes.byteOffset, bytes.byteLength);
  assert(view.getUint32(0, true) === 0x46546c67, "GLB magic is invalid");
  assert(view.getUint32(4, true) === 2, "GLB version 2 is required");
  assert(view.getUint32(8, true) === bytes.byteLength, "GLB declared byte length does not match received bytes");

  const jsonLength = view.getUint32(12, true);
  const jsonType = view.getUint32(16, true);
  assert(jsonType === 0x4e4f534a, "GLB first chunk must be JSON");
  const jsonStart = 20;
  const jsonEnd = jsonStart + jsonLength;
  assert(jsonEnd + 8 <= bytes.byteLength, "GLB JSON chunk exceeds received bytes");

  let document;
  try {
    const text = new TextDecoder("utf-8", { fatal: true }).decode(bytes.subarray(jsonStart, jsonEnd)).replace(/[\u0000\u0020]+$/g, "");
    document = JSON.parse(text);
  } catch (error) {
    throw new Error(`GLB JSON chunk is invalid: ${error.message}`);
  }
  assert(isPlainObject(document), "GLB JSON document must be an object");
  assert(document.asset?.version === "2.0", "embedded glTF asset.version must be 2.0");

  const binLength = view.getUint32(jsonEnd, true);
  const binType = view.getUint32(jsonEnd + 4, true);
  assert(binType === 0x004e4942, "GLB second chunk must be BIN");
  assert(jsonEnd + 8 + binLength === bytes.byteLength, "GLB BIN chunk must end at the received file boundary");

  assert(Array.isArray(document.buffers) && document.buffers.length === 1, "verified GLB must contain exactly one buffer");
  assert(document.buffers[0]?.uri === undefined, "verified GLB buffer must be embedded");
  assert(Array.isArray(document.images) && document.images.length > 0, "verified GLB must contain embedded material images");
  for (const [index, image] of document.images.entries()) {
    assert(isPlainObject(image), `GLB image ${index} must be an object`);
    assert(image.mimeType === "image/png", `GLB image ${index} must be PNG`);
    assert(image.uri === undefined, `GLB image ${index} must not retain a URI`);
    assert(Number.isInteger(image.bufferView) && image.bufferView >= 0, `GLB image ${index} must reference an embedded bufferView`);
  }
  return document;
}

export async function admitVerifiedForgeGlb({ request, deliveryReceipt, glbBytes }) {
  validateRequest(request);
  assert(isPlainObject(deliveryReceipt), "verified GLB delivery receipt is required");
  assert(deliveryReceipt.schema === VERIFIED_FORGE_GLB_DELIVERY, `unsupported delivery schema ${deliveryReceipt.schema}`);
  assert(deliveryReceipt.status === VERIFIED_FORGE_GLB_READY, `unsupported delivery state ${deliveryReceipt.status}`);
  validateProviderAuthority(deliveryReceipt.authority);
  assert(deliveryReceipt.truth?.rigid_snapshot_only === true, "delivery must remain explicitly rigid-snapshot-only");
  assert(deliveryReceipt.truth?.skeleton_or_animation_claim === false, "delivery must not claim skeleton or animation evidence");

  const requestDigest = await sha256Text(canonicalJson(request));
  const binding = deliveryReceipt.consumer_request;
  assert(isPlainObject(binding), "delivery receipt lacks the RTS request binding");
  assert(binding.contract === REQUEST_CONTRACT, "delivery receipt request contract changed");
  assert(binding.sha256 === requestDigest, "delivery receipt is not bound to these exact RTS request bytes");
  assert(binding.asset_id === request.asset.id, "delivery receipt asset identity differs from the RTS request");
  assert(binding.asset_type === "rigid-proxy", "delivery receipt asset type is not rigid-proxy");
  assert(binding.engine === "threejs" && binding.delivery === "glb", "delivery receipt does not bind threejs + glb");

  const bytes = asBytes(glbBytes);
  const glbDigest = await sha256Bytes(bytes);
  const delivery = deliveryReceipt.delivery;
  assert(isPlainObject(delivery), "delivery evidence is required");
  assert(delivery.format === "glb" && delivery.self_contained === true, "delivery must be one self-contained GLB");
  assert(delivery.bytes === bytes.byteLength, "delivery byte count differs from received GLB");
  assert(delivery.sha256 === glbDigest, "delivery SHA-256 differs from received GLB");
  assert(delivery.validation?.status === "pass", "provider did not report structural GLB validation pass");
  assert(delivery.validation?.asset_version === "2.0", "provider did not validate glTF 2.0");

  assert(isSha256(deliveryReceipt.source?.manifest_sha256), "source package manifest identity is missing");
  const document = parseGlbStructure(bytes);
  const embeddedEvidence = document.asset?.extras?.axm_verified_delivery;
  assert(embeddedEvidence?.schema === VERIFIED_FORGE_GLB_DELIVERY, "GLB does not carry the verified-delivery schema marker");
  assert(embeddedEvidence?.source_manifest_sha256 === deliveryReceipt.source.manifest_sha256, "GLB embedded source manifest identity differs from receipt");

  const evidence = {
    contract: VERIFIED_FORGE_GLB_CONSUMER,
    state: VERIFIED_FORGE_GLB_ADMITTED,
    request: {
      contract: REQUEST_CONTRACT,
      sha256: requestDigest,
      asset_id: request.asset.id,
      asset_type: request.asset.type
    },
    provider: {
      delivery_schema: deliveryReceipt.schema,
      source_manifest_sha256: deliveryReceipt.source.manifest_sha256
    },
    glb: {
      sha256: glbDigest,
      bytes: bytes.byteLength,
      asset_version: document.asset.version,
      embedded_images: document.images.length
    },
    authority: {
      renderer_parse: false,
      render_graph_mutation: false,
      runtime_asset_install: false,
      canonical_game_state_mutation: false,
      gameplay_semantics: false,
      merge: false,
      canon: false
    }
  };
  evidence.admission_sha256 = await sha256Text(canonicalJson(evidence));
  return structuredClone(evidence);
}

export async function realizeAdmittedForgeGlb({ admission, glbBytes, parse }) {
  assert(isPlainObject(admission), "GLB admission is required");
  assert(admission.contract === VERIFIED_FORGE_GLB_CONSUMER, "unsupported GLB admission contract");
  assert(admission.state === VERIFIED_FORGE_GLB_ADMITTED, "GLB admission is not ready for explicit parse");
  assert(typeof parse === "function", "explicit renderer parse function is required");
  assert(admission.authority?.renderer_parse === false, "admission already claims renderer authority");
  assert(admission.authority?.render_graph_mutation === false, "admission already claims render-graph mutation authority");
  assert(admission.authority?.runtime_asset_install === false, "admission already claims runtime installation authority");
  assert(admission.authority?.canonical_game_state_mutation === false, "admission already claims canonical game-state authority");
  assert(admission.authority?.gameplay_semantics === false, "admission already claims gameplay authority");
  assert(admission.authority?.merge === false && admission.authority?.canon === false, "admission already claims merge/CANON authority");

  const bytes = asBytes(glbBytes);
  const digest = await sha256Bytes(bytes);
  assert(digest === admission.glb?.sha256, "received GLB no longer matches the admitted content identity");
  assert(bytes.byteLength === admission.glb?.bytes, "received GLB byte count no longer matches admission");

  const copy = new Uint8Array(bytes.byteLength);
  copy.set(bytes);
  const parsed = await parse(copy.buffer);
  assert(parsed?.scene?.isObject3D === true, "renderer parse did not return a Three.js Object3D scene");

  let meshCount = 0;
  parsed.scene.traverse?.(node => {
    if (node?.isMesh === true) meshCount += 1;
  });
  assert(meshCount > 0, "renderer parse returned no mesh realization");

  return {
    state: VERIFIED_FORGE_GLB_REALIZED,
    scene: parsed.scene,
    evidence: {
      contract: VERIFIED_FORGE_GLB_CONSUMER,
      admission_sha256: admission.admission_sha256,
      glb_sha256: digest,
      asset_id: admission.request.asset_id,
      renderer: "threejs",
      mesh_count: meshCount,
      authority: {
        renderer_parse: true,
        render_graph_mutation: false,
        runtime_asset_install: false,
        canonical_game_state_mutation: false,
        gameplay_semantics: false,
        merge: false,
        canon: false
      }
    }
  };
}
