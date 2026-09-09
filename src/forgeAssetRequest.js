export const FORGE_REQUEST_CONTRACT = "axm.rts.forge-unit-request/v0.1";
export const FORGE_PROVIDER_REPOSITORY = "mike-axiom-mir/Axm-game-assets";
export const FORGE_PROVIDER_GENOME_VERSION = "0.1.0";

const DEFAULT_TRIANGLE_BUDGETS = Object.freeze({ lod0: 30000, lod1: 15000, lod2: 7000, lod3: 3000 });
const CORE_PBR_CHANNELS = Object.freeze(["base_color", "normal", "roughness", "metallic"]);

function assert(condition, message) {
  if (!condition) throw new Error(message);
}

function clone(value) {
  return structuredClone(value);
}

function isCommitSha(value) {
  return typeof value === "string" && /^[0-9a-f]{40}$/i.test(value);
}

function safeToken(value, label) {
  const token = String(value || "").trim();
  assert(token.length > 0, `${label} is required`);
  assert(/^[A-Za-z0-9._:-]+$/.test(token), `${label} contains unsupported characters`);
  return token;
}

function validateUnitPack(unitPack) {
  assert(unitPack && typeof unitPack === "object" && !Array.isArray(unitPack), "unit pack must be an object");
  assert(Number(unitPack.schemaVersion) === 1, "unit pack schemaVersion 1 is required");
  assert(unitPack.kind === "unit-pack", "unit pack kind must be unit-pack");
  assert(typeof unitPack.id === "string" && unitPack.id.length > 0, "unit pack id is required");
  assert(typeof unitPack.factionId === "string" && unitPack.factionId.length > 0, "unit pack factionId is required");
  assert(Array.isArray(unitPack.units), "unit pack units must be an array");
}

export function buildForgeUnitRequest(unitPack, options = {}) {
  validateUnitPack(unitPack);

  const unitId = safeToken(options.unitId, "unit id");
  const unit = unitPack.units.find(candidate => candidate?.id === unitId);
  assert(unit, `unit ${unitId} is not present in ${unitPack.id}`);
  assert(typeof unit.name === "string" && unit.name.trim().length > 0, `unit ${unitId} has no name`);

  const sourceRef = String(options.sourceRef || "").toLowerCase();
  assert(isCommitSha(sourceRef), "source ref must be an exact 40-character Git commit SHA");

  const unitMeters = Number(options.unitMeters);
  assert(Number.isFinite(unitMeters) && unitMeters > 0, "unit meters must be an explicit positive number");

  const assetType = safeToken(options.assetType, "asset type");
  const assetId = `rts-${safeToken(unitPack.factionId, "faction id")}-${unitId}`;

  const request = {
    contract: FORGE_REQUEST_CONTRACT,
    asset: {
      id: assetId,
      name: unit.name.trim(),
      type: assetType,
      unit_meters: unitMeters
    },
    targets: {
      engines: ["threejs"],
      delivery: ["glb"]
    },
    budgets: {
      triangles: clone(DEFAULT_TRIANGLE_BUDGETS)
    },
    quality: {
      pbr_channels: [...CORE_PBR_CHANNELS]
    },
    variants: [
      {
        id: "rts",
        changes: [
          "prioritize distant silhouette readability",
          "keep geometry and animation inside the consumer-owned RTS budget"
        ]
      }
    ],
    sources: [
      {
        kind: "axm-unit-pack-source",
        repository: "mike-axiom-mir/axm-many-race-rts-current",
        ref: sourceRef,
        path: "src/contentPacks.js",
        pack_id: unitPack.id,
        pack_source: String(unitPack.source || "unknown"),
        faction_id: unitPack.factionId,
        unit_id: unitId
      }
    ]
  };

  return clone(request);
}

export function requestTruthBoundary(request) {
  return {
    gameplay_fields_transferred: false,
    inferred_scale: false,
    inferred_asset_type: false,
    provider_execution_authority: false,
    runtime_adoption_authority: false,
    merge_authority: false,
    canon_authority: false,
    request_contract: request?.contract || null
  };
}
