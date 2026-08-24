import { createCanonicalGameState } from "./gameState.js";

function finite(value, fallback = 0) {
  const number = Number(value);
  return Number.isFinite(number) ? number : fallback;
}

function point(value) {
  if (!value) return null;
  const source = value.position || value;
  const x = Number(source.x);
  const y = Number(source.y);
  const z = Number(source.z);
  if (![x, y, z].every(Number.isFinite)) return null;
  return { x, y, z };
}

function stableStringify(value) {
  if (value === null || typeof value !== "object") return JSON.stringify(value);
  if (Array.isArray(value)) return `[${value.map(stableStringify).join(",")}]`;
  const keys = Object.keys(value).sort();
  return `{${keys.map(key => `${JSON.stringify(key)}:${stableStringify(value[key])}`).join(",")}}`;
}

export function snapshotFingerprint(snapshot) {
  const text = stableStringify(snapshot);
  let hash = 2166136261;
  for (let i = 0; i < text.length; i++) {
    hash ^= text.charCodeAt(i);
    hash = Math.imul(hash, 16777619);
  }
  return `fnv1a32:${(hash >>> 0).toString(16).padStart(8, "0")}`;
}

function deepFreeze(value) {
  if (!value || typeof value !== "object" || Object.isFrozen(value)) return value;
  Object.freeze(value);
  for (const child of Object.values(value)) deepFreeze(child);
  return value;
}

function canonicalEntity(entity) {
  const data = entity?.userData || {};
  const position = point(entity) || { x: 0, y: 0, z: 0 };
  return {
    id: String(data.entityId || ""),
    type: String(data.type || "unknown"),
    owner: data.owner == null ? null : String(data.owner),
    factionId: data.factionId == null ? null : String(data.factionId),
    hp: finite(data.hp, 0),
    maxHp: finite(data.maxHp, finite(data.hp, 0)),
    x: position.x,
    y: position.y,
    z: position.z,
    tags: [
      data.role ? `role:${data.role}` : null,
      data.id ? `definition:${data.id}` : null,
      data.combatRole ? `combat:${data.combatRole}` : null
    ].filter(Boolean)
  };
}

export function createWorldSnapshot(world, {
  seed = "axm-rts",
  mode = "skirmish",
  projection = "flat",
  tick = 0,
  time = 0,
  commands = []
} = {}) {
  const canonical = createCanonicalGameState({ seed, mode, projection, commandLog: commands });
  canonical.setClock({ tick, time });
  canonical.setStatus("observed");
  canonical.setVariable("snapshotCoverage", "world-entities-only");
  canonical.setVariable("authoritative", false);

  const entities = [...(world?.entities || [])]
    .filter(entity => entity?.parent && entity.userData?.hp > 0 && entity.userData?.entityId)
    .map(canonicalEntity)
    .sort((a, b) => a.id.localeCompare(b.id));
  for (const entity of entities) canonical.upsertEntity(entity);

  const snapshot = canonical.snapshot({ includeCommands: true });
  snapshot.fingerprint = snapshotFingerprint(snapshot);
  return deepFreeze(snapshot);
}
