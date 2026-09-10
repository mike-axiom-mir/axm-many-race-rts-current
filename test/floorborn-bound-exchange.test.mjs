import test from "node:test";
import assert from "node:assert/strict";
import { createHash } from "node:crypto";
import { spawnSync } from "node:child_process";
import { fileURLToPath } from "node:url";

import {
  createFloorbornDecideRequest,
  createFloorbornSeatObservation,
  FLOORBORN_SEAT_REQUEST_SCHEMA,
  stableClone,
  stableStringify
} from "../src/floorbornConnectedSeat.js";
import {
  admitBoundFloorbornDecision,
  describeFloorbornBoundExchange,
  validateBoundFloorbornProviderDescriptor,
  verifyBoundFloorbornExchange
} from "../src/floorbornBoundExchange.js";

const ROOT = fileURLToPath(new URL("..", import.meta.url));
const BRIDGE = fileURLToPath(new URL("../tools/floorborn-bound-seat-bridge.mjs", import.meta.url));
const PROVIDER = process.env.FLOORBORN_V02_PROVIDER || "";

function publicState() {
  return {
    schema: "axm-rts-public-skirmish-state/v1",
    authoritative: false,
    source: "public-runtime-readback",
    coverage: "player-economy-ui+world-seats+strategy-ui",
    status: "running",
    result: null,
    seats: {
      player: { id: "player", factionId: "northpole-dominion", team: 1, formations: 3, buildings: 2, founders: 1, capitals: 1 },
      enemy: { id: "enemy", factionId: "fatfrotz-empire", team: 2, formations: 4, buildings: 2, founders: 1, capitals: 1 }
    },
    strategy: { Map: "Founder's Crossing", Territory: "1 / 3" }
  };
}

function hostRequest(overrides = {}) {
  return {
    schema: FLOORBORN_SEAT_REQUEST_SCHEMA,
    sessionId: "many-race-rts:bound-exchange-001",
    turn: 9,
    seatId: "seat-1",
    ownerId: "player",
    playerId: "floorborn:rts:seat-1",
    lineageId: "floorborn:rts:seat-1:local",
    publicState: publicState(),
    legalCommands: [
      { id: "move:founder-stone", type: "move", point: [12, 0, 8], target: "founder-stone", affordanceTags: ["goal"] },
      { id: "move:home", type: "move", point: [-28, 0, 20], target: "player-capital", affordanceTags: ["optional"] }
    ],
    ...overrides
  };
}

function semanticRequest(input = hostRequest()) {
  const observation = createFloorbornSeatObservation(input);
  return { observation, request: createFloorbornDecideRequest(input, observation) };
}

function providerAuthority() {
  return { automaticSelection: false, canon: false, execution: false, gameMutation: false, merge: false, publication: false };
}

function sealProviderResponse(request, action, overrides = {}) {
  const body = stableClone({
    schema: "axm.floorborn.process-response/v0.2",
    ok: true,
    operation: "decide",
    action,
    decision: { selectedActionId: action.id },
    playerSnapshot: { schema: "axm.floorborn.memory.v0.7", playerId: "floorborn:rts:seat-1" },
    authority: providerAuthority(),
    ...overrides
  });
  return stableClone({
    ...body,
    receipt: {
      schema: "axm.floorborn.process-receipt/v0.2",
      requestSha256: sha256(request),
      responseSha256: sha256(body),
      authority: "CONTENT_INTEGRITY_ONLY_NO_EXECUTION_NO_MERGE_NO_CANON"
    }
  });
}

function descriptor(overrides = {}) {
  return {
    schema: "axm.floorborn.capability/v0.1",
    id: "axm.floorborn.bounded-player-process",
    status: "EXPERIMENTAL",
    runtime: { node: ">=24", dependencies: 0, network: false, account: false, aiModel: false },
    process: {
      requestSchema: "axm.floorborn.process-request/v0.1",
      responseSchema: "axm.floorborn.process-response/v0.2",
      receiptSchema: "axm.floorborn.process-receipt/v0.2",
      exchangeVerificationSchema: "axm.floorborn.process-exchange-verification/v0.1",
      operations: ["describe", "decide", "learn", "complete"],
      maxCliInputBytes: 1048576
    },
    playerProtocols: ["axm.player.v0.1", "axm.player.rts.v0.1"],
    boundary: {},
    authority: providerAuthority(),
    ...overrides
  };
}

function runBridge(input, provider = PROVIDER) {
  return spawnSync(process.execPath, [BRIDGE, "run", "--provider", provider], {
    cwd: ROOT,
    input: JSON.stringify(input),
    encoding: "utf8",
    maxBuffer: 1024 * 1024
  });
}

test("descriptor exposes request identity plus deterministic replay without gaining authority", () => {
  const value = describeFloorbornBoundExchange();
  assert.equal(value.id, "axm.rts.floorborn-bound-exchange");
  assert.equal(value.provider.processResponseSchema, "axm.floorborn.process-response/v0.2");
  assert.equal(value.provider.processReceiptSchema, "axm.floorborn.process-receipt/v0.2");
  assert.equal(value.provider.exchangeVerificationSchema, "axm.floorborn.process-exchange-verification/v0.1");
  assert.equal(value.boundary.deterministicReplay, "CONSUMER_REPEATS_EXACT_PROVIDER_PROCESS_REQUEST");
  assert.equal(value.authority.commandExecution, false);
  assert.equal(value.authority.gameMutation, false);
});

test("provider admission requires the new request-bound exchange contract and closed authority", () => {
  assert.equal(validateBoundFloorbornProviderDescriptor(descriptor()), true);
  assert.throws(
    () => validateBoundFloorbornProviderDescriptor(descriptor({ process: { ...descriptor().process, responseSchema: "axm.floorborn.process-response/v0.1", receiptSchema: "axm.floorborn.process-receipt/v0.1" } })),
    /request-bound exchange contract/
  );
  assert.throws(
    () => validateBoundFloorbornProviderDescriptor(descriptor({ authority: { ...providerAuthority(), gameMutation: true } })),
    /authority is incompatible/
  );
});

test("exact request identity, response bytes, and replay are all required", () => {
  const { observation, request } = semanticRequest();
  const response = sealProviderResponse(request, observation.legalActions[0]);
  const pass = verifyBoundFloorbornExchange({ request, response, replayedResponse: response });
  assert.equal(pass.result, "PASS");
  assert.deepEqual(pass.problems, []);
  assert.equal(pass.truth.exactRequestIdentityVerified, true);
  assert.equal(pass.truth.responseContentIntegrityVerified, true);
  assert.equal(pass.truth.deterministicReplayVerified, true);

  const other = semanticRequest(hostRequest({ turn: 10 })).request;
  const substituted = verifyBoundFloorbornExchange({ request: other, response, replayedResponse: response });
  assert.equal(substituted.result, "HOLD");
  assert.ok(substituted.problems.includes("REQUEST_IDENTITY_MISMATCH"));

  const alteredBody = stableClone({ ...response, action: observation.legalActions[1], decision: { selectedActionId: observation.legalActions[1].id } });
  const stale = verifyBoundFloorbornExchange({ request, response: alteredBody, replayedResponse: alteredBody });
  assert.equal(stale.result, "HOLD");
  assert.ok(stale.problems.includes("RESPONSE_INTEGRITY_MISMATCH"));
});

test("self-consistent false response is held when exact provider replay disagrees", () => {
  const { observation, request } = semanticRequest();
  const realResponse = sealProviderResponse(request, observation.legalActions[0]);
  const resealedFalseResponse = sealProviderResponse(request, observation.legalActions[1]);
  const verification = verifyBoundFloorbornExchange({ request, response: resealedFalseResponse, replayedResponse: realResponse });
  assert.equal(verification.result, "HOLD");
  assert.ok(!verification.problems.includes("REQUEST_IDENTITY_MISMATCH"));
  assert.ok(!verification.problems.includes("RESPONSE_INTEGRITY_MISMATCH"));
  assert.ok(verification.problems.includes("DETERMINISTIC_REPLAY_MISMATCH"));
});

test("ordinary-seat admission requires a passing bound exchange and exact declared action", () => {
  const { observation, request } = semanticRequest();
  const response = sealProviderResponse(request, observation.legalActions[0]);
  const verification = verifyBoundFloorbornExchange({ request, response, replayedResponse: response });
  assert.throws(() => admitBoundFloorbornDecision({ response, observation, verification: { ...verification, result: "HOLD" } }), /must PASS/);
  const admitted = admitBoundFloorbornDecision({ response, observation, verification });
  assert.equal(admitted.status, "READY");
  assert.equal(admitted.candidate.schema, "axm-rts-connected-seat-command/v1");
  assert.equal(admitted.candidate.seatId, "seat-1");
  assert.equal(admitted.providerReceipt.requestSha256, sha256(request));
  assert.equal(admitted.exchangeVerification.result, "PASS");
  assert.equal(admitted.authority.commandExecution, false);
});

test("missing optional provider fails without a command candidate", () => {
  const run = runBridge(hostRequest(), "/definitely/missing/floorborn-player.js");
  assert.equal(run.status, 2);
  assert.equal(run.stdout, "");
  const error = JSON.parse(run.stderr);
  assert.equal(error.error.code, "PROVIDER_UNAVAILABLE");
  assert.equal(error.authority, "NO_COMMAND_EXECUTION_NO_GAME_MUTATION_NO_MERGE_NO_CANON");
});

test("exact Floorborn v0.2 provider crosses the bound exchange into an ordinary RTS candidate", { skip: !PROVIDER }, () => {
  const first = runBridge(hostRequest());
  assert.equal(first.status, 0, first.stderr);
  const result = JSON.parse(first.stdout);
  assert.equal(result.status, "READY");
  assert.equal(result.candidate.schema, "axm-rts-connected-seat-command/v1");
  assert.deepEqual(result.candidate.point, [12, 0, 8]);
  assert.equal(result.exchangeVerification.result, "PASS");
  assert.equal(result.exchangeVerification.truth.exactRequestIdentityVerified, true);
  assert.equal(result.exchangeVerification.truth.responseContentIntegrityVerified, true);
  assert.equal(result.exchangeVerification.truth.deterministicReplayVerified, true);
  assert.equal(result.exchangeVerification.truth.providerAuthorshipAuthenticated, false);
  assert.equal(result.authority.commandExecution, false);
  assert.match(result.providerReceipt.requestSha256, /^[0-9a-f]{64}$/);
  assert.match(result.providerReceipt.responseSha256, /^[0-9a-f]{64}$/);

  const repeated = runBridge(hostRequest());
  assert.equal(repeated.status, 0, repeated.stderr);
  assert.deepEqual(JSON.parse(repeated.stdout), result);

  const continuedInput = hostRequest({ turn: 10, playerSnapshot: result.playerSnapshot });
  delete continuedInput.lineageId;
  const continued = runBridge(continuedInput);
  assert.equal(continued.status, 0, continued.stderr);
  assert.equal(JSON.parse(continued.stdout).exchangeVerification.result, "PASS");
});

function sha256(value) {
  return createHash("sha256").update(stableStringify(value)).digest("hex");
}
