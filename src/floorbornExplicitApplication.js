import { createHash } from "node:crypto";

import {
  FLOORBORN_BOUND_EXCHANGE_RECEIPT_SCHEMA
} from "./floorbornBoundExchange.js";
import { stableClone, stableStringify } from "./floorbornConnectedSeat.js";

export const FLOORBORN_EXPLICIT_APPLICATION_CAPABILITY_SCHEMA = "axm.rts.floorborn-explicit-application-capability/v0.1";
export const FLOORBORN_EXPLICIT_APPLICATION_CAPABILITY_ID = "axm.rts.floorborn-explicit-application";
export const FLOORBORN_SEAT_APPROVAL_SCHEMA = "axm.rts.floorborn-seat-approval/v0.1";
export const FLOORBORN_SEAT_APPLICATION_RECEIPT_SCHEMA = "axm.rts.floorborn-seat-application-receipt/v0.1";

const BOUND_EXCHANGE_VERIFICATION_SCHEMA = "axm.rts.floorborn-bound-exchange-verification/v0.1";
const BOUND_EXCHANGE_VERIFICATION_AUTHORITY = "VERIFY_ONLY_NO_COMMAND_EXECUTION_NO_GAME_MUTATION_NO_MERGE_NO_CANON";
const CONNECTED_SEAT_COMMAND_SCHEMA = "axm-rts-connected-seat-command/v1";
const EXPECTED_ADMISSION_AUTHORITY = Object.freeze({
  automaticProviderSelection: false,
  canon: false,
  commandExecution: false,
  gameMutation: false,
  merge: false,
  publication: false
});

export function describeFloorbornExplicitApplication() {
  return stableClone({
    schema: FLOORBORN_EXPLICIT_APPLICATION_CAPABILITY_SCHEMA,
    id: FLOORBORN_EXPLICIT_APPLICATION_CAPABILITY_ID,
    status: "EXPERIMENTAL",
    purpose: "Dispatch one already-verified Floorborn ordinary-seat candidate through the existing connected-AI player door only after an exact caller-supplied approval.",
    input: {
      admissionSchema: FLOORBORN_BOUND_EXCHANGE_RECEIPT_SCHEMA,
      approvalSchema: FLOORBORN_SEAT_APPROVAL_SCHEMA,
      commandSchema: CONNECTED_SEAT_COMMAND_SCHEMA
    },
    boundary: {
      providerExecution: "OUTSIDE_THIS_CAPABILITY",
      approval: "CALLER_SUPPLIES_EXACT_ADMISSION_SHA256_AND_SEAT",
      dispatch: "CALLER_SUPPLIES_EXISTING_CONNECTED_AI_PLAYER_DOOR",
      automaticApproval: false,
      automaticProviderSelection: false,
      automaticProviderExecution: false
    },
    authority: {
      commandDispatch: "EXPLICIT_CALLER_APPROVAL_ONLY",
      downstreamGameMutation: "EXISTING_CONNECTED_AI_PLAYER_DOOR_ONLY",
      merge: false,
      publication: false,
      canon: false
    }
  });
}

export function fingerprintBoundFloorbornAdmission(admission) {
  validateBoundAdmission(admission);
  return sha256(admission);
}

export function dispatchApprovedFloorbornCommand({ admission, approval, dispatchCommand }) {
  const admissionSha256 = fingerprintBoundFloorbornAdmission(admission);
  validateApproval(approval, admission, admissionSha256);
  if (typeof dispatchCommand !== "function") {
    throw new TypeError("dispatchCommand must be the existing connected-AI player door");
  }

  const candidate = stableClone(admission.candidate);
  dispatchCommand(candidate.seatId, candidate);

  const core = stableClone({
    schema: FLOORBORN_SEAT_APPLICATION_RECEIPT_SCHEMA,
    status: "DISPATCHED",
    admissionSha256,
    commandSha256: sha256(candidate),
    seatId: candidate.seatId,
    commandType: candidate.type,
    door: "axm-seat-command",
    approval: {
      schema: approval.schema,
      decision: approval.decision,
      admissionSha256: approval.admissionSha256,
      seatId: approval.seatId
    },
    truth: {
      boundExchangeAdmissionValidated: true,
      exactCallerApprovalMatched: true,
      dispatchFunctionReturned: true,
      providerAuthorshipAuthenticated: false,
      downstreamGameStateObserved: false,
      mergeOrCanonAuthorized: false
    },
    authority: "EXPLICIT_APPROVAL_DISPATCH_ONLY_EXISTING_PLAYER_DOOR_OWNS_GAME_EFFECT_NO_MERGE_NO_CANON"
  });
  return deepFreeze(stableClone({ ...core, receiptSha256: sha256(core) }));
}

function validateBoundAdmission(admission) {
  assertPortableJson(admission, "bound exchange admission");
  assertPlainObject(admission, "bound exchange admission");
  assertExactKeys(admission, ["schema", "status", "candidate", "playerSnapshot", "providerReceipt", "exchangeVerification", "authority"], "bound exchange admission");
  if (admission.schema !== FLOORBORN_BOUND_EXCHANGE_RECEIPT_SCHEMA || admission.status !== "READY") {
    throw new Error("Floorborn admission is not a READY request-bound exchange receipt");
  }
  if (stableStringify(admission.authority) !== stableStringify(EXPECTED_ADMISSION_AUTHORITY)) {
    throw new Error("Floorborn admission authority is incompatible");
  }

  const providerReceipt = admission.providerReceipt;
  assertPlainObject(providerReceipt, "provider receipt");
  assertExactKeys(providerReceipt, ["schema", "requestSha256", "responseSha256", "authority"], "provider receipt");
  if (providerReceipt.schema !== "axm.floorborn.process-receipt/v0.2" ||
      providerReceipt.authority !== "CONTENT_INTEGRITY_ONLY_NO_EXECUTION_NO_MERGE_NO_CANON") {
    throw new Error("Floorborn provider receipt is incompatible");
  }
  assertSha256(providerReceipt.requestSha256, "provider requestSha256");
  assertSha256(providerReceipt.responseSha256, "provider responseSha256");

  const verification = admission.exchangeVerification;
  assertPlainObject(verification, "exchange verification");
  assertExactKeys(verification, [
    "schema", "result", "requestSha256", "responseSha256", "replayedResponseSha256",
    "problems", "truth", "authority", "verificationSha256"
  ], "exchange verification");
  if (verification.schema !== BOUND_EXCHANGE_VERIFICATION_SCHEMA ||
      verification.result !== "PASS" ||
      verification.authority !== BOUND_EXCHANGE_VERIFICATION_AUTHORITY ||
      !Array.isArray(verification.problems) || verification.problems.length !== 0) {
    throw new Error("Floorborn exchange verification is not an exact PASS");
  }
  assertSha256(verification.requestSha256, "verification requestSha256");
  assertSha256(verification.responseSha256, "verification responseSha256");
  assertSha256(verification.replayedResponseSha256, "verification replayedResponseSha256");
  assertSha256(verification.verificationSha256, "verification verificationSha256");
  const { verificationSha256: _verificationSha256, ...verificationCore } = verification;
  if (sha256(verificationCore) !== verification.verificationSha256) {
    throw new Error("Floorborn exchange verification digest does not match its content");
  }
  if (verification.requestSha256 !== providerReceipt.requestSha256 || verification.responseSha256 !== providerReceipt.responseSha256) {
    throw new Error("Floorborn provider receipt and exchange verification identities disagree");
  }
  const truth = verification.truth;
  assertPlainObject(truth, "exchange verification truth");
  assertExactKeys(truth, [
    "exactRequestIdentityVerified", "responseContentIntegrityVerified", "deterministicReplayVerified",
    "providerAuthorshipAuthenticated", "gameMutationAuthorized", "mergeOrCanonAuthorized"
  ], "exchange verification truth");
  if (truth.exactRequestIdentityVerified !== true ||
      truth.responseContentIntegrityVerified !== true ||
      truth.deterministicReplayVerified !== true ||
      truth.providerAuthorshipAuthenticated !== false ||
      truth.gameMutationAuthorized !== false ||
      truth.mergeOrCanonAuthorized !== false) {
    throw new Error("Floorborn exchange verification truth boundary is incompatible");
  }

  const candidate = admission.candidate;
  assertPlainObject(candidate, "connected-seat command candidate");
  assertExactKeys(candidate, ["schema", "seatId", "type", "point", "observedCommand"], "connected-seat command candidate");
  if (candidate.schema !== CONNECTED_SEAT_COMMAND_SCHEMA || candidate.type !== "move") {
    throw new Error("unsupported connected-seat command candidate");
  }
  assertNonEmptyString(candidate.seatId, "candidate seatId");
  if (!Array.isArray(candidate.point) || candidate.point.length !== 3 || candidate.point.some(value => !Number.isFinite(value))) {
    throw new Error("candidate move point must contain three finite numbers");
  }
  return true;
}

function validateApproval(approval, admission, admissionSha256) {
  assertPortableJson(approval, "caller approval");
  assertPlainObject(approval, "caller approval");
  assertExactKeys(approval, ["schema", "decision", "admissionSha256", "seatId"], "caller approval");
  if (approval.schema !== FLOORBORN_SEAT_APPROVAL_SCHEMA || approval.decision !== "APPROVE_THIS_DISPATCH") {
    throw new Error("caller approval decision is incompatible");
  }
  assertSha256(approval.admissionSha256, "approval admissionSha256");
  if (approval.admissionSha256 !== admissionSha256) throw new Error("caller approval does not bind this exact Floorborn admission");
  if (approval.seatId !== admission.candidate.seatId) throw new Error("caller approval does not bind the admitted seat");
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

function assertNonEmptyString(value, label) {
  if (typeof value !== "string" || !value.trim()) throw new Error(`${label} must be a non-empty string`);
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
