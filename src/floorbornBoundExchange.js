import { createHash } from "node:crypto";

import { stableClone, stableStringify } from "./floorbornConnectedSeat.js";

export const FLOORBORN_BOUND_EXCHANGE_CAPABILITY_SCHEMA = "axm.rts.floorborn-bound-exchange-capability/v0.1";
export const FLOORBORN_BOUND_EXCHANGE_CAPABILITY_ID = "axm.rts.floorborn-bound-exchange";
export const FLOORBORN_CAPABILITY_ID = "axm.floorborn.bounded-player-process";
export const FLOORBORN_OBSERVATION_PROTOCOL = "axm.player.rts.v0.1";
export const FLOORBORN_PROCESS_REQUEST_SCHEMA = "axm.floorborn.process-request/v0.1";
export const FLOORBORN_PROCESS_RESPONSE_SCHEMA = "axm.floorborn.process-response/v0.2";
export const FLOORBORN_PROCESS_RECEIPT_SCHEMA = "axm.floorborn.process-receipt/v0.2";
export const FLOORBORN_PROCESS_EXCHANGE_VERIFICATION_SCHEMA = "axm.floorborn.process-exchange-verification/v0.1";
export const FLOORBORN_BOUND_EXCHANGE_RECEIPT_SCHEMA = "axm.rts.floorborn-bound-exchange-receipt/v0.1";

const PROVIDER_AUTHORITY = Object.freeze({
  automaticSelection: false,
  canon: false,
  execution: false,
  gameMutation: false,
  merge: false,
  publication: false
});

const CONSUMER_AUTHORITY = Object.freeze({
  automaticProviderSelection: false,
  canon: false,
  commandExecution: false,
  gameMutation: false,
  merge: false,
  publication: false
});

export function describeFloorbornBoundExchange() {
  return stableClone({
    schema: FLOORBORN_BOUND_EXCHANGE_CAPABILITY_SCHEMA,
    id: FLOORBORN_BOUND_EXCHANGE_CAPABILITY_ID,
    status: "EXPERIMENTAL",
    purpose: "Admit an ordinary RTS Floorborn command only after exact request identity, response integrity, and deterministic process replay agree.",
    provider: {
      capabilityId: FLOORBORN_CAPABILITY_ID,
      playerProtocol: FLOORBORN_OBSERVATION_PROTOCOL,
      processRequestSchema: FLOORBORN_PROCESS_REQUEST_SCHEMA,
      processResponseSchema: FLOORBORN_PROCESS_RESPONSE_SCHEMA,
      processReceiptSchema: FLOORBORN_PROCESS_RECEIPT_SCHEMA,
      exchangeVerificationSchema: FLOORBORN_PROCESS_EXCHANGE_VERIFICATION_SCHEMA
    },
    boundary: {
      providerChoice: "CALLER_SUPPLIES_LOCAL_PROVIDER",
      requestIdentity: "CONSUMER_RECOMPUTES_EXACT_SEMANTIC_REQUEST_SHA256",
      responseIntegrity: "CONSUMER_RECOMPUTES_RESPONSE_BODY_SHA256",
      deterministicReplay: "CONSUMER_REPEATS_EXACT_PROVIDER_PROCESS_REQUEST",
      selectedAction: "EXACT_DECLARED_LEGAL_ACTION_ONLY",
      application: "CALLER_MUST_EXPLICITLY_USE_EXISTING_CONNECTED_AI_PLAYER_DOOR"
    },
    runtime: { dependencies: 0, network: false, account: false, aiModel: false },
    authority: CONSUMER_AUTHORITY
  });
}

export function validateBoundFloorbornProviderDescriptor(descriptor) {
  assertPlainObject(descriptor, "provider descriptor");
  if (descriptor.id !== FLOORBORN_CAPABILITY_ID) throw new Error("unexpected Floorborn capability id");
  if (descriptor.schema !== "axm.floorborn.capability/v0.1") throw new Error("unsupported Floorborn capability schema");
  if (!descriptor.playerProtocols?.includes(FLOORBORN_OBSERVATION_PROTOCOL)) {
    throw new Error("Floorborn provider does not declare axm.player.rts.v0.1");
  }
  const process = descriptor.process;
  assertPlainObject(process, "provider process descriptor");
  if (process.requestSchema !== FLOORBORN_PROCESS_REQUEST_SCHEMA ||
      process.responseSchema !== FLOORBORN_PROCESS_RESPONSE_SCHEMA ||
      process.receiptSchema !== FLOORBORN_PROCESS_RECEIPT_SCHEMA ||
      process.exchangeVerificationSchema !== FLOORBORN_PROCESS_EXCHANGE_VERIFICATION_SCHEMA) {
    throw new Error("Floorborn provider does not expose the required request-bound exchange contract");
  }
  if (descriptor.runtime?.network !== false || descriptor.runtime?.account !== false || descriptor.runtime?.aiModel !== false) {
    throw new Error("Floorborn provider is not declared local/offline/model-free");
  }
  assertExactBooleanRecord(descriptor.authority, PROVIDER_AUTHORITY, "provider authority");
  return true;
}

export function verifyBoundFloorbornExchange({ request, response, replayedResponse }) {
  assertPlainObject(request, "Floorborn request");
  assertPlainObject(response, "Floorborn response");
  assertPlainObject(replayedResponse, "replayed Floorborn response");

  const problems = [];
  if (request.schema !== FLOORBORN_PROCESS_REQUEST_SCHEMA) problems.push("REQUEST_SCHEMA_MISMATCH");
  if (!isV02Response(response)) problems.push("RESPONSE_CONTRACT_MISMATCH");

  const requestSha256 = sha256(request);
  const responseSha256 = response && typeof response === "object" ? sha256WithoutReceipt(response) : null;
  if (response?.receipt?.requestSha256 !== requestSha256) problems.push("REQUEST_IDENTITY_MISMATCH");
  if (response?.receipt?.responseSha256 !== responseSha256) problems.push("RESPONSE_INTEGRITY_MISMATCH");
  if (stableStringify(replayedResponse) !== stableStringify(response)) problems.push("DETERMINISTIC_REPLAY_MISMATCH");

  const uniqueProblems = [...new Set(problems)];
  const core = stableClone({
    schema: "axm.rts.floorborn-bound-exchange-verification/v0.1",
    result: uniqueProblems.length === 0 ? "PASS" : "HOLD",
    requestSha256,
    responseSha256,
    replayedResponseSha256: sha256(replayedResponse),
    problems: uniqueProblems,
    truth: {
      exactRequestIdentityVerified: !uniqueProblems.includes("REQUEST_IDENTITY_MISMATCH"),
      responseContentIntegrityVerified: !uniqueProblems.includes("RESPONSE_INTEGRITY_MISMATCH") && !uniqueProblems.includes("RESPONSE_CONTRACT_MISMATCH"),
      deterministicReplayVerified: !uniqueProblems.includes("DETERMINISTIC_REPLAY_MISMATCH"),
      providerAuthorshipAuthenticated: false,
      gameMutationAuthorized: false,
      mergeOrCanonAuthorized: false
    },
    authority: "VERIFY_ONLY_NO_COMMAND_EXECUTION_NO_GAME_MUTATION_NO_MERGE_NO_CANON"
  });
  return stableClone({ ...core, verificationSha256: sha256(core) });
}

export function admitBoundFloorbornDecision({ response, observation, verification }) {
  if (verification?.result !== "PASS") throw new Error("Floorborn request-bound exchange must PASS before admission");
  assertPlainObject(response, "Floorborn response");
  assertExactKeys(response, ["schema", "ok", "operation", "action", "decision", "playerSnapshot", "authority", "receipt"]);
  if (!isV02Response(response) || response.ok !== true || response.operation !== "decide") {
    throw new Error("Floorborn response is not a successful v0.2 decide response");
  }
  assertExactBooleanRecord(response.authority, PROVIDER_AUTHORITY, "provider response authority");
  if (response.playerSnapshot?.playerId !== observation?.self?.playerId) {
    throw new Error("Floorborn snapshot identity does not match the connected seat player");
  }
  if (response.decision?.selectedActionId !== response.action?.id) {
    throw new Error("Floorborn decision evidence does not match the returned action");
  }
  const legal = observation?.legalActions?.find(action => action.id === response.action?.id);
  if (!legal || stableStringify(legal) !== stableStringify(response.action)) {
    throw new Error("Floorborn action is not an exact declared legal action");
  }

  return Object.freeze(stableClone({
    schema: FLOORBORN_BOUND_EXCHANGE_RECEIPT_SCHEMA,
    status: "READY",
    candidate: legal.command,
    playerSnapshot: response.playerSnapshot,
    providerReceipt: response.receipt,
    exchangeVerification: verification,
    authority: CONSUMER_AUTHORITY
  }));
}

function isV02Response(response) {
  if (!response || typeof response !== "object" || Array.isArray(response)) return false;
  if (response.schema !== FLOORBORN_PROCESS_RESPONSE_SCHEMA) return false;
  const receipt = response.receipt;
  if (!receipt || receipt.schema !== FLOORBORN_PROCESS_RECEIPT_SCHEMA) return false;
  if (receipt.authority !== "CONTENT_INTEGRITY_ONLY_NO_EXECUTION_NO_MERGE_NO_CANON") return false;
  if (!sameKeys(receipt, ["authority", "requestSha256", "responseSha256", "schema"])) return false;
  if (!/^[0-9a-f]{64}$/.test(String(receipt.requestSha256 || ""))) return false;
  if (!/^[0-9a-f]{64}$/.test(String(receipt.responseSha256 || ""))) return false;
  return true;
}

function sha256WithoutReceipt(response) {
  const { receipt: _receipt, ...body } = response;
  return sha256(body);
}

function sha256(value) {
  return createHash("sha256").update(stableStringify(value)).digest("hex");
}

function assertExactBooleanRecord(actual, expected, label) {
  assertPlainObject(actual, label);
  if (stableStringify(actual) !== stableStringify(expected)) throw new Error(`${label} is incompatible`);
}

function assertPlainObject(value, label) {
  if (!value || typeof value !== "object" || Array.isArray(value)) throw new TypeError(`${label} must be an object`);
}

function assertExactKeys(value, allowedKeys) {
  const actual = Object.keys(value).sort();
  const expected = [...allowedKeys].sort();
  if (actual.length !== expected.length || actual.some((key, index) => key !== expected[index])) {
    throw new Error(`unexpected response fields: ${actual.join(",")}`);
  }
}

function sameKeys(value, expectedKeys) {
  const actual = Object.keys(value).sort();
  const expected = [...expectedKeys].sort();
  return actual.length === expected.length && actual.every((key, index) => key === expected[index]);
}
