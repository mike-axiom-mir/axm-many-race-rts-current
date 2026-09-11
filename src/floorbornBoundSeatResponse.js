import { createHash } from "node:crypto";

import { FLOORBORN_BOUND_EXCHANGE_RECEIPT_SCHEMA } from "./floorbornBoundExchange.js";
import { stableClone, stableStringify } from "./floorbornConnectedSeat.js";
import { fingerprintBoundFloorbornAdmission } from "./floorbornExplicitApplication.js";

export const FLOORBORN_BOUND_SEAT_RESPONSE_SCHEMA = "axm.rts.floorborn-bound-seat-response/v0.1";
export const FLOORBORN_BOUND_SEAT_RESPONSE_RECEIPT_SCHEMA = "axm.rts.floorborn-bound-seat-response-receipt/v0.1";
const RESPONSE_RECEIPT_AUTHORITY = "CONTENT_INTEGRITY_ONLY_NO_COMMAND_EXECUTION_NO_GAME_MUTATION_NO_MERGE_NO_CANON";

export function admissionFromBoundSeatResponse(response) {
  assertPortableJson(response, "bound seat response");
  assertPlainObject(response, "bound seat response");
  assertExactKeys(response, [
    "schema", "ok", "status", "candidate", "playerSnapshot", "providerReceipt",
    "exchangeVerification", "authority", "receipt"
  ], "bound seat response");
  if (response.schema !== FLOORBORN_BOUND_SEAT_RESPONSE_SCHEMA || response.ok !== true || response.status !== "READY") {
    throw new Error("Floorborn bound seat response is not a READY success response");
  }

  const receipt = response.receipt;
  assertPlainObject(receipt, "bound seat response receipt");
  assertExactKeys(receipt, ["schema", "sha256", "authority"], "bound seat response receipt");
  if (receipt.schema !== FLOORBORN_BOUND_SEAT_RESPONSE_RECEIPT_SCHEMA || receipt.authority !== RESPONSE_RECEIPT_AUTHORITY) {
    throw new Error("Floorborn bound seat response receipt is incompatible");
  }
  assertSha256(receipt.sha256, "bound seat response receipt sha256");

  const { receipt: _receipt, ...body } = response;
  if (sha256(body) !== receipt.sha256) {
    throw new Error("Floorborn bound seat response receipt does not match its content");
  }

  const admission = stableClone({
    schema: FLOORBORN_BOUND_EXCHANGE_RECEIPT_SCHEMA,
    status: response.status,
    candidate: response.candidate,
    playerSnapshot: response.playerSnapshot,
    providerReceipt: response.providerReceipt,
    exchangeVerification: response.exchangeVerification,
    authority: response.authority
  });

  fingerprintBoundFloorbornAdmission(admission);
  return deepFreeze(admission);
}

function assertPortableJson(value, label) {
  walkPortableJson(value, label, new Set());
}

function walkPortableJson(value, label, seen) {
  if (value == null || typeof value === "string" || typeof value === "boolean") return;
  if (typeof value === "number") {
    if (!Number.isFinite(value)) throw new Error(`${label} contains a non-finite number`);
    return;
  }
  if (typeof value !== "object") throw new Error(`${label} is not portable JSON`);
  if (seen.has(value)) throw new Error(`${label} contains a cycle`);
  seen.add(value);
  if (Array.isArray(value)) {
    for (const child of value) walkPortableJson(child, label, seen);
  } else {
    if (Object.getPrototypeOf(value) !== Object.prototype && Object.getPrototypeOf(value) !== null) {
      throw new Error(`${label} must contain only plain JSON objects`);
    }
    for (const child of Object.values(value)) walkPortableJson(child, label, seen);
  }
  seen.delete(value);
}

function assertPlainObject(value, label) {
  if (!value || typeof value !== "object" || Array.isArray(value)) throw new TypeError(`${label} must be an object`);
}

function assertExactKeys(value, expectedKeys, label) {
  const actual = Object.keys(value).sort();
  const expected = [...expectedKeys].sort();
  if (actual.length !== expected.length || actual.some((key, index) => key !== expected[index])) {
    throw new Error(`${label} fields are incompatible`);
  }
}

function assertSha256(value, label) {
  if (!/^[0-9a-f]{64}$/.test(String(value || ""))) throw new Error(`${label} must be a lowercase SHA-256 hex digest`);
}

function sha256(value) {
  return createHash("sha256").update(stableStringify(value)).digest("hex");
}

function deepFreeze(value) {
  if (!value || typeof value !== "object" || Object.isFrozen(value)) return value;
  Object.freeze(value);
  for (const child of Object.values(value)) deepFreeze(child);
  return value;
}
