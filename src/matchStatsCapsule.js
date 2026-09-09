import {
  MATCH_STATS_SCHEMA_VERSION,
  MATCH_STATS_STORAGE_KEY,
  exportMatchStatsSnapshot
} from "./matchStatsStore.js";

export const MATCH_STATS_CAPSULE_SCHEMA = "axm.rts.match-stats-capsule/v1";

const ALLOWED_STORAGE_STATUS = new Set(["ABSENT", "VALID"]);
const CAPSULE_KEYS = ["authority", "capsuleId", "ledger", "ledgerSha256", "schema", "source"];
const SOURCE_KEYS = ["schemaVersion", "storageKey", "storageStatus"];
const AUTHORITY_KEYS = ["canonAuthority", "importAuthority", "mergeAuthority", "storageAuthority"];
const LEDGER_KEYS = ["matches", "schemaVersion", "updatedAt"];
const SHA256_RE = /^sha256:[0-9a-f]{64}$/;
const HEX_RE = /^[0-9a-f]{64}$/;

export const MATCH_STATS_CAPSULE_AUTHORITY = Object.freeze({
  storageAuthority: false,
  importAuthority: false,
  mergeAuthority: false,
  canonAuthority: false
});

function isPlainObject(value) {
  if (!value || typeof value !== "object" || Array.isArray(value)) return false;
  const prototype = Object.getPrototypeOf(value);
  return prototype === Object.prototype || prototype === null;
}

function exactKeys(value, expected) {
  if (!isPlainObject(value)) return false;
  const keys = Object.keys(value).sort();
  return keys.length === expected.length && keys.every((key, index) => key === expected[index]);
}

function cloneJson(value) {
  return JSON.parse(JSON.stringify(value));
}

function canonicalize(value, path = "$") {
  if (value === null || typeof value === "string" || typeof value === "boolean") return value;
  if (typeof value === "number") {
    if (!Number.isFinite(value)) throw new TypeError(`non-finite number at ${path}`);
    return Object.is(value, -0) ? 0 : value;
  }
  if (Array.isArray(value)) return value.map((entry, index) => canonicalize(entry, `${path}[${index}]`));
  if (!isPlainObject(value)) throw new TypeError(`non-portable value at ${path}`);

  const output = {};
  for (const key of Object.keys(value).sort()) {
    const entry = value[key];
    if (entry === undefined || typeof entry === "function" || typeof entry === "symbol" || typeof entry === "bigint") {
      throw new TypeError(`non-portable value at ${path}.${key}`);
    }
    output[key] = canonicalize(entry, `${path}.${key}`);
  }
  return output;
}

export function canonicalMatchStatsJson(value) {
  return JSON.stringify(canonicalize(value));
}

async function sha256Hex(value) {
  const subtle = globalThis.crypto?.subtle;
  if (!subtle) throw new Error("sha256-unavailable");
  const bytes = new TextEncoder().encode(canonicalMatchStatsJson(value));
  const digest = new Uint8Array(await subtle.digest("SHA-256", bytes));
  return [...digest].map(byte => byte.toString(16).padStart(2, "0")).join("");
}

function capsuleBody(capsule) {
  return {
    schema: capsule.schema,
    source: capsule.source,
    ledgerSha256: capsule.ledgerSha256,
    ledger: capsule.ledger,
    authority: capsule.authority
  };
}

function hold(reason, details = {}) {
  return {
    status: "HOLD",
    reason,
    authority: cloneJson(MATCH_STATS_CAPSULE_AUTHORITY),
    ...details
  };
}

function validateLedgerEnvelope(ledger) {
  if (!exactKeys(ledger, LEDGER_KEYS)) return "invalid-ledger-envelope";
  if (ledger.schemaVersion !== MATCH_STATS_SCHEMA_VERSION) return "unsupported-ledger-schema";
  if (!Array.isArray(ledger.matches)) return "invalid-ledger-matches";

  const ids = new Set();
  for (const match of ledger.matches) {
    if (!isPlainObject(match) || typeof match.id !== "string" || !match.id.trim()) return "invalid-match-id";
    if (ids.has(match.id)) return "duplicate-match-id";
    ids.add(match.id);
  }
  return null;
}

export async function createMatchStatsCapsule(snapshot = exportMatchStatsSnapshot()) {
  const storageStatus = snapshot?.storage?.status;
  if (!ALLOWED_STORAGE_STATUS.has(storageStatus)) {
    return hold(storageStatus === "HELD" ? "history-held" : "storage-not-readable", {
      storageStatus: storageStatus ?? null,
      capsule: null
    });
  }

  let ledger;
  try {
    ledger = cloneJson(snapshot.ledger);
  } catch {
    return hold("ledger-not-portable", { storageStatus, capsule: null });
  }

  const ledgerProblem = validateLedgerEnvelope(ledger);
  if (ledgerProblem) return hold(ledgerProblem, { storageStatus, capsule: null });

  try {
    const ledgerSha256 = await sha256Hex(ledger);
    const capsule = {
      schema: MATCH_STATS_CAPSULE_SCHEMA,
      capsuleId: "",
      source: {
        storageKey: MATCH_STATS_STORAGE_KEY,
        schemaVersion: MATCH_STATS_SCHEMA_VERSION,
        storageStatus
      },
      ledgerSha256,
      ledger,
      authority: cloneJson(MATCH_STATS_CAPSULE_AUTHORITY)
    };
    capsule.capsuleId = `sha256:${await sha256Hex(capsuleBody(capsule))}`;
    return {
      status: "PASS",
      reason: "integrity-bound-export",
      capsuleId: capsule.capsuleId,
      authority: cloneJson(MATCH_STATS_CAPSULE_AUTHORITY),
      capsule
    };
  } catch (error) {
    return hold(error?.message === "sha256-unavailable" ? "sha256-unavailable" : "ledger-not-portable", {
      storageStatus,
      capsule: null
    });
  }
}

export async function verifyMatchStatsCapsule(capsule, options = {}) {
  const expectedCapsuleId = options.expectedCapsuleId ?? null;

  if (!exactKeys(capsule, CAPSULE_KEYS)) return hold("unsupported-capsule-envelope", { capsuleId: null, expectedCapsuleId });
  if (capsule.schema !== MATCH_STATS_CAPSULE_SCHEMA) return hold("unsupported-capsule-schema", { capsuleId: capsule.capsuleId ?? null, expectedCapsuleId });
  if (!SHA256_RE.test(capsule.capsuleId || "")) return hold("invalid-capsule-id", { capsuleId: capsule.capsuleId ?? null, expectedCapsuleId });
  if (!HEX_RE.test(capsule.ledgerSha256 || "")) return hold("invalid-ledger-digest", { capsuleId: capsule.capsuleId, expectedCapsuleId });

  if (!exactKeys(capsule.source, SOURCE_KEYS)) return hold("unsupported-source-envelope", { capsuleId: capsule.capsuleId, expectedCapsuleId });
  if (capsule.source.storageKey !== MATCH_STATS_STORAGE_KEY) return hold("storage-key-mismatch", { capsuleId: capsule.capsuleId, expectedCapsuleId });
  if (capsule.source.schemaVersion !== MATCH_STATS_SCHEMA_VERSION) return hold("source-schema-mismatch", { capsuleId: capsule.capsuleId, expectedCapsuleId });
  if (!ALLOWED_STORAGE_STATUS.has(capsule.source.storageStatus)) return hold("invalid-source-storage-status", { capsuleId: capsule.capsuleId, expectedCapsuleId });

  if (!exactKeys(capsule.authority, AUTHORITY_KEYS)) return hold("unsupported-authority-envelope", { capsuleId: capsule.capsuleId, expectedCapsuleId });
  for (const key of AUTHORITY_KEYS) {
    if (capsule.authority[key] !== false) return hold("authority-escalation", { capsuleId: capsule.capsuleId, expectedCapsuleId });
  }

  const ledgerProblem = validateLedgerEnvelope(capsule.ledger);
  if (ledgerProblem) return hold(ledgerProblem, { capsuleId: capsule.capsuleId, expectedCapsuleId });

  if (expectedCapsuleId !== null && (!SHA256_RE.test(expectedCapsuleId) || capsule.capsuleId !== expectedCapsuleId)) {
    return hold("expected-capsule-mismatch", { capsuleId: capsule.capsuleId, expectedCapsuleId });
  }

  try {
    const measuredLedger = await sha256Hex(capsule.ledger);
    if (measuredLedger !== capsule.ledgerSha256) {
      return hold("ledger-digest-mismatch", { capsuleId: capsule.capsuleId, expectedCapsuleId, measuredLedgerSha256: measuredLedger });
    }

    const measuredCapsuleId = `sha256:${await sha256Hex(capsuleBody(capsule))}`;
    if (measuredCapsuleId !== capsule.capsuleId) {
      return hold("capsule-id-mismatch", { capsuleId: capsule.capsuleId, expectedCapsuleId, measuredCapsuleId });
    }

    return {
      status: "PASS",
      reason: "integrity-verified",
      capsuleId: capsule.capsuleId,
      expectedCapsuleId,
      ledgerSha256: capsule.ledgerSha256,
      matchCount: capsule.ledger.matches.length,
      source: cloneJson(capsule.source),
      authority: cloneJson(MATCH_STATS_CAPSULE_AUTHORITY)
    };
  } catch (error) {
    return hold(error?.message === "sha256-unavailable" ? "sha256-unavailable" : "capsule-not-portable", {
      capsuleId: capsule.capsuleId,
      expectedCapsuleId
    });
  }
}

export const MatchStatsCapsules = {
  schema: MATCH_STATS_CAPSULE_SCHEMA,
  authority: MATCH_STATS_CAPSULE_AUTHORITY,
  create: createMatchStatsCapsule,
  verify: verifyMatchStatsCapsule,
  canonicalJson: canonicalMatchStatsJson
};

if (typeof window !== "undefined") window.AXMMatchStatsCapsules = MatchStatsCapsules;
