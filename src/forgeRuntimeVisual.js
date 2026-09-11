export const FORGE_RUNTIME_VISUAL_CONTRACT = "axm.rts.forge-runtime-visual/v0.1";
export const FORGE_VISUAL_APPROVAL_BOUND = "EXPLICIT_VISUAL_APPROVAL_BOUND";
export const FORGE_VISUAL_INSTALLED = "REPLACEABLE_VISUAL_INSTALLED";
export const FORGE_VISUAL_ROLLED_BACK = "PROCEDURAL_FALLBACK_RESTORED";

const REQUEST_CONTRACT = "axm.rts.forge-unit-request/v0.1";
const CONSUMER_CONTRACT = "axm.rts.verified-forge-glb-consumer/v0.1";
const REALIZED_STATE = "REALIZED_NOT_INSTALLED";
const installations = new WeakMap();

function assert(condition, message) {
  if (!condition) throw new Error(message);
}

function isPlainObject(value) {
  return value !== null && typeof value === "object" && !Array.isArray(value);
}

function exactKeys(value, keys, label) {
  assert(isPlainObject(value), `${label} must be an object`);
  const actual = Object.keys(value).sort();
  const expected = [...keys].sort();
  assert(JSON.stringify(actual) === JSON.stringify(expected), `${label} keys are not the supported contract`);
}

function canonicalize(value) {
  if (value === null || typeof value === "string" || typeof value === "boolean") return value;
  if (typeof value === "number") {
    assert(Number.isFinite(value), "canonical JSON rejects non-finite numbers");
    return value;
  }
  if (Array.isArray(value)) return value.map(canonicalize);
  assert(isPlainObject(value), "canonical JSON accepts only JSON values");
  const out = {};
  for (const key of Object.keys(value).sort()) out[key] = canonicalize(value[key]);
  return out;
}

function canonicalJson(value) {
  return JSON.stringify(canonicalize(value));
}

async function sha256Text(value) {
  assert(globalThis.crypto?.subtle, "Web Crypto SHA-256 is required for visual-selection receipts");
  const bytes = new TextEncoder().encode(value);
  const digest = await globalThis.crypto.subtle.digest("SHA-256", bytes);
  return "sha256:" + [...new Uint8Array(digest)].map(byte => byte.toString(16).padStart(2, "0")).join("");
}

function isSha256(value) {
  return typeof value === "string" && /^sha256:[0-9a-f]{64}$/.test(value);
}

function requestUnit(request) {
  assert(isPlainObject(request), "Forge request is required");
  assert(request.contract === REQUEST_CONTRACT, `unsupported Forge request contract ${request.contract}`);
  assert(request.asset?.type === "rigid-proxy", "runtime visual selection currently accepts only rigid-proxy requests");
  assert(typeof request.asset?.id === "string" && request.asset.id.length > 0, "Forge request asset id is required");
  const sources = request.sources;
  assert(Array.isArray(sources) && sources.length === 1, "runtime visual selection requires exactly one RTS unit-pack source");
  const source = sources[0];
  assert(source?.kind === "axm-unit-pack-source", "Forge request source is not an RTS unit-pack source");
  assert(typeof source.unit_id === "string" && source.unit_id.length > 0, "Forge request source unit_id is required");
  assert(typeof source.faction_id === "string" && source.faction_id.length > 0, "Forge request source faction_id is required");
  assert(request.asset.id === `rts-${source.faction_id}-${source.unit_id}`, "Forge request asset identity is not derived from its RTS source unit");
  return { unitId: source.unit_id, factionId: source.faction_id, assetId: request.asset.id };
}

function validateRealization(realization, identity) {
  assert(isPlainObject(realization), "verified Forge realization is required");
  assert(realization.state === REALIZED_STATE, `unsupported Forge realization state ${realization.state}`);
  assert(realization.scene?.isObject3D === true, "Forge realization lacks a Three.js Object3D scene");
  const evidence = realization.evidence;
  assert(isPlainObject(evidence), "Forge realization evidence is required");
  assert(evidence.contract === CONSUMER_CONTRACT, "Forge realization consumer contract changed");
  assert(evidence.asset_id === identity.assetId, "Forge realization asset identity differs from the RTS request");
  assert(isSha256(evidence.glb_sha256), "Forge realization GLB identity is missing");
  assert(isSha256(evidence.admission_sha256), "Forge realization admission identity is missing");
  exactKeys(evidence.authority, ["renderer_parse", "render_graph_mutation", "runtime_asset_install", "canonical_game_state_mutation", "gameplay_semantics", "merge", "canon"], "Forge realization authority");
  assert(evidence.authority?.renderer_parse === true, "Forge realization must prove an explicit renderer parse");
  for (const key of ["render_graph_mutation", "runtime_asset_install", "canonical_game_state_mutation", "gameplay_semantics", "merge", "canon"]) {
    assert(evidence.authority?.[key] === false, `Forge realization authority ${key} must remain false before explicit visual selection`);
  }
  return evidence;
}

export async function bindExplicitVisualApproval({ request, realization, decision }) {
  const identity = requestUnit(request);
  const evidence = validateRealization(realization, identity);
  exactKeys(decision, ["action", "asset_id", "unit_id", "glb_sha256", "admission_sha256"], "visual approval decision");
  assert(decision.action === "APPROVE_RUNTIME_VISUAL_EXPRESSION", "visual approval action must be explicit");
  assert(decision.asset_id === identity.assetId, "visual approval asset identity differs from the request");
  assert(decision.unit_id === identity.unitId, "visual approval unit identity differs from the request");
  assert(decision.glb_sha256 === evidence.glb_sha256, "visual approval GLB identity differs from the verified realization");
  assert(decision.admission_sha256 === evidence.admission_sha256, "visual approval admission identity differs from the verified realization");

  const receipt = {
    contract: FORGE_RUNTIME_VISUAL_CONTRACT,
    state: FORGE_VISUAL_APPROVAL_BOUND,
    selection: {
      asset_id: identity.assetId,
      faction_id: identity.factionId,
      unit_id: identity.unitId,
      glb_sha256: evidence.glb_sha256,
      admission_sha256: evidence.admission_sha256
    },
    approval: {
      mode: "caller-declared-explicit-human-decision",
      action: decision.action,
      authenticated_identity: false
    },
    authority: {
      automatic_visual_approval: false,
      runtime_visual_mutation: false,
      gameplay_state_mutation: false,
      canonical_game_state_mutation: false,
      persistence: false,
      merge: false,
      canon: false
    }
  };
  receipt.approval_sha256 = await sha256Text(canonicalJson(receipt));
  return structuredClone(receipt);
}

async function validateApproval(approval, identity, evidence) {
  assert(isPlainObject(approval), "explicit visual approval receipt is required");
  exactKeys(approval, ["contract", "state", "selection", "approval", "authority", "approval_sha256"], "visual approval receipt");
  assert(approval.contract === FORGE_RUNTIME_VISUAL_CONTRACT, "unsupported runtime visual approval contract");
  assert(approval.state === FORGE_VISUAL_APPROVAL_BOUND, "visual approval receipt is not ready for installation");
  assert(isSha256(approval.approval_sha256), "visual approval identity is missing");
  const sealed = structuredClone(approval);
  delete sealed.approval_sha256;
  assert(await sha256Text(canonicalJson(sealed)) === approval.approval_sha256, "visual approval receipt digest no longer matches its content");
  exactKeys(approval.selection, ["asset_id", "faction_id", "unit_id", "glb_sha256", "admission_sha256"], "visual approval selection");
  exactKeys(approval.approval, ["mode", "action", "authenticated_identity"], "visual approval declaration");
  exactKeys(approval.authority, ["automatic_visual_approval", "runtime_visual_mutation", "gameplay_state_mutation", "canonical_game_state_mutation", "persistence", "merge", "canon"], "visual approval authority");
  assert(approval.selection?.asset_id === identity.assetId, "visual approval asset no longer matches the RTS request");
  assert(approval.selection?.unit_id === identity.unitId, "visual approval unit no longer matches the RTS request");
  assert(approval.selection?.glb_sha256 === evidence.glb_sha256, "visual approval GLB no longer matches the verified realization");
  assert(approval.selection?.admission_sha256 === evidence.admission_sha256, "visual approval admission no longer matches the verified realization");
  assert(approval.approval?.mode === "caller-declared-explicit-human-decision", "visual approval mode changed");
  assert(approval.approval?.action === "APPROVE_RUNTIME_VISUAL_EXPRESSION", "visual approval action changed");
  assert(approval.approval?.authenticated_identity === false, "visual approval must not invent authenticated human identity");
  for (const key of ["automatic_visual_approval", "runtime_visual_mutation", "gameplay_state_mutation", "canonical_game_state_mutation", "persistence", "merge", "canon"]) {
    assert(approval.authority?.[key] === false, `visual approval authority ${key} must remain false before installation`);
  }
}

function copyTransform(from, to) {
  assert(to?.position?.copy && to?.rotation?.copy && to?.scale?.copy, "visual clone lacks Three.js transforms");
  to.position.copy(from.position);
  to.rotation.copy(from.rotation);
  to.scale.copy(from.scale);
}

export function prepareGroundedThreeVisual(THREE, root) {
  assert(THREE?.Box3 && THREE?.Vector3 && THREE?.Group, "Three.js Box3/Vector3/Group are required to ground a visual expression");
  assert(root?.isObject3D === true, "visual root must be a Three.js Object3D");
  const content = new THREE.Group();
  content.name = "AXM_REPLACEABLE_VISUAL_CONTENT";
  const originalChildren = [...root.children];
  assert(originalChildren.length > 0, "visual expression has no children to realize");
  for (const child of originalChildren) content.add(child);
  root.add(content);
  const box = new THREE.Box3().setFromObject(content);
  assert(!box.isEmpty(), "visual expression has no finite render bounds");
  const size = box.getSize(new THREE.Vector3());
  const center = box.getCenter(new THREE.Vector3());
  assert([size.x, size.y, size.z, center.x, center.y, center.z, box.min.y].every(Number.isFinite), "visual expression bounds are not finite");
  content.position.x -= center.x;
  content.position.z -= center.z;
  content.position.y -= box.min.y;
  return { size: [size.x, size.y, size.z] };
}

export async function installApprovedFormationVisual({ formation, request, realization, approval, prepareVisual }) {
  const identity = requestUnit(request);
  const evidence = validateRealization(realization, identity);
  await validateApproval(approval, identity, evidence);
  assert(typeof prepareVisual === "function", "explicit visual preparation function is required");
  assert(formation?.isObject3D === true && typeof formation.add === "function" && typeof formation.remove === "function", "formation must be a Three.js Object3D group");
  assert(formation.userData?.type === "squad", "runtime visual selection accepts only live RTS squad formations");
  assert(formation.userData?.id === identity.unitId, "live formation unit identity differs from the approved Forge request");
  assert(!installations.has(formation), "formation already has a replaceable Forge visual installed");

  const fallbackChildren = [...formation.children];
  assert(fallbackChildren.length > 0, "live formation has no procedural fallback visuals to preserve");
  const gameplayUserData = formation.userData;
  const installedChildren = [];
  const bounds = [];

  try {
    for (const fallback of fallbackChildren) {
      assert(fallback?.position && fallback?.rotation && fallback?.scale, "procedural fallback child lacks a Three.js transform");
      const visual = realization.scene.clone(true);
      assert(visual?.isObject3D === true, "verified realization could not be cloned for a formation slot");
      const prepared = prepareVisual(visual);
      assert(prepared === undefined || isPlainObject(prepared), "visual preparation must return nothing or evidence object");
      copyTransform(fallback, visual);
      visual.userData = {
        ...visual.userData,
        axmReplaceableVisual: {
          contract: FORGE_RUNTIME_VISUAL_CONTRACT,
          asset_id: identity.assetId,
          glb_sha256: evidence.glb_sha256
        }
      };
      installedChildren.push(visual);
      bounds.push(prepared || null);
    }
  } catch (error) {
    for (const visual of installedChildren) visual.parent?.remove?.(visual);
    throw error;
  }

  for (const fallback of fallbackChildren) formation.remove(fallback);
  for (const visual of installedChildren) formation.add(visual);
  assert(formation.userData === gameplayUserData, "runtime visual installation must not replace formation gameplay state");

  const receipt = {
    contract: FORGE_RUNTIME_VISUAL_CONTRACT,
    state: FORGE_VISUAL_INSTALLED,
    selection: structuredClone(approval.selection),
    approval_sha256: approval.approval_sha256,
    formation: {
      type: formation.userData.type,
      unit_id: formation.userData.id,
      visual_slots: installedChildren.length,
      fallback_slots_preserved: fallbackChildren.length
    },
    authority: {
      runtime_visual_mutation: true,
      gameplay_state_mutation: false,
      canonical_game_state_mutation: false,
      persistence: false,
      automatic_reapply_after_reset: false,
      merge: false,
      canon: false
    }
  };
  receipt.installation_sha256 = await sha256Text(canonicalJson(receipt));
  installations.set(formation, { fallbackChildren, installedChildren, gameplayUserData, receipt, bounds });
  return structuredClone(receipt);
}

export async function rollbackFormationVisual({ formation, installation_sha256 }) {
  const active = installations.get(formation);
  assert(active, "formation has no active replaceable Forge visual installation");
  assert(isSha256(installation_sha256), "exact installation identity is required for rollback");
  assert(active.receipt.installation_sha256 === installation_sha256, "rollback installation identity does not match the active visual");
  assert(formation.userData === active.gameplayUserData, "formation gameplay state object changed during visual installation");

  for (const visual of active.installedChildren) formation.remove(visual);
  for (const fallback of active.fallbackChildren) formation.add(fallback);
  installations.delete(formation);

  const receipt = {
    contract: FORGE_RUNTIME_VISUAL_CONTRACT,
    state: FORGE_VISUAL_ROLLED_BACK,
    installation_sha256,
    selection: structuredClone(active.receipt.selection),
    formation: {
      type: formation.userData.type,
      unit_id: formation.userData.id,
      fallback_slots_restored: active.fallbackChildren.length
    },
    authority: {
      runtime_visual_mutation: true,
      gameplay_state_mutation: false,
      canonical_game_state_mutation: false,
      persistence: false,
      merge: false,
      canon: false
    }
  };
  receipt.rollback_sha256 = await sha256Text(canonicalJson(receipt));
  return structuredClone(receipt);
}
