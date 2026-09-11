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
  verifyBoundFloorbornExchange
} from "../src/floorbornBoundExchange.js";
import {
  describeFloorbornExplicitApplication,
  dispatchApprovedFloorbornCommand,
  fingerprintBoundFloorbornAdmission,
  FLOORBORN_SEAT_APPROVAL_SCHEMA
} from "../src/floorbornExplicitApplication.js";

const ROOT = fileURLToPath(new URL("..", import.meta.url));
const BRIDGE = fileURLToPath(new URL("../tools/floorborn-bound-seat-bridge.mjs", import.meta.url));
const PROVIDER = process.env.FLOORBORN_V02_PROVIDER || "";

function providerAuthority() {
  return { automaticSelection: false, canon: false, execution: false, gameMutation: false, merge: false, publication: false };
}

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

function hostRequest() {
  return {
    schema: FLOORBORN_SEAT_REQUEST_SCHEMA,
    sessionId: "many-race-rts:explicit-application-001",
    turn: 10,
    seatId: "seat-1",
    ownerId: "player",
    playerId: "floorborn:rts:seat-1",
    lineageId: "floorborn:rts:seat-1:local",
    publicState: publicState(),
    legalCommands: [
      { id: "move:founder-stone", type: "move", point: [12, 0, 8], target: "founder-stone", affordanceTags: ["goal"] },
      { id: "move:home", type: "move", point: [-28, 0, 20], target: "player-capital", affordanceTags: ["optional"] }
    ]
  };
}

function syntheticAdmission() {
  const input = hostRequest();
  const observation = createFloorbornSeatObservation(input);
  const request = createFloorbornDecideRequest(input, observation);
  const action = observation.legalActions[0];
  const body = stableClone({
    schema: "axm.floorborn.process-response/v0.2",
    ok: true,
    operation: "decide",
    action,
    decision: { selectedActionId: action.id },
    playerSnapshot: { schema: "axm.floorborn.memory.v0.7", playerId: input.playerId },
    authority: providerAuthority()
  });
  const response = stableClone({
    ...body,
    receipt: {
      schema: "axm.floorborn.process-receipt/v0.2",
      requestSha256: sha256(request),
      responseSha256: sha256(body),
      authority: "CONTENT_INTEGRITY_ONLY_NO_EXECUTION_NO_MERGE_NO_CANON"
    }
  });
  const verification = verifyBoundFloorbornExchange({ request, response, replayedResponse: response });
  return admitBoundFloorbornDecision({ response, observation, verification });
}

function approvalFor(admission, overrides = {}) {
  return {
    schema: FLOORBORN_SEAT_APPROVAL_SCHEMA,
    decision: "APPROVE_THIS_DISPATCH",
    admissionSha256: fingerprintBoundFloorbornAdmission(admission),
    seatId: admission.candidate.seatId,
    ...overrides
  };
}

function runProviderBridge() {
  return spawnSync(process.execPath, [BRIDGE, "run", "--provider", PROVIDER], {
    cwd: ROOT,
    input: JSON.stringify(hostRequest()),
    encoding: "utf8",
    maxBuffer: 1024 * 1024
  });
}

test("descriptor makes explicit approval the only new dispatch authority", () => {
  const descriptor = describeFloorbornExplicitApplication();
  assert.equal(descriptor.id, "axm.rts.floorborn-explicit-application");
  assert.equal(descriptor.boundary.approval, "CALLER_SUPPLIES_EXACT_ADMISSION_SHA256_AND_SEAT");
  assert.equal(descriptor.boundary.automaticApproval, false);
  assert.equal(descriptor.boundary.automaticProviderExecution, false);
  assert.equal(descriptor.authority.commandDispatch, "EXPLICIT_CALLER_APPROVAL_ONLY");
  assert.equal(descriptor.authority.canon, false);
});

test("exact admission identity and seat must match before dispatch", () => {
  const admission = syntheticAdmission();
  let calls = 0;
  const dispatchCommand = () => { calls += 1; };

  assert.throws(
    () => dispatchApprovedFloorbornCommand({ admission, approval: approvalFor(admission, { admissionSha256: "0".repeat(64) }), dispatchCommand }),
    /does not bind this exact Floorborn admission/
  );
  assert.throws(
    () => dispatchApprovedFloorbornCommand({ admission, approval: approvalFor(admission, { seatId: "seat-2" }), dispatchCommand }),
    /does not bind the admitted seat/
  );
  assert.equal(calls, 0);
});

test("post-approval admission mutation invalidates approval before dispatch", () => {
  const admission = syntheticAdmission();
  const approval = approvalFor(admission);
  const changed = stableClone(admission);
  changed.candidate.point[0] = 13;
  let calls = 0;
  assert.throws(
    () => dispatchApprovedFloorbornCommand({ admission: changed, approval, dispatchCommand: () => { calls += 1; } }),
    /does not bind this exact Floorborn admission/
  );
  assert.equal(calls, 0);
});

test("admission authority or verification drift is held before dispatch", () => {
  const admission = syntheticAdmission();
  const widened = stableClone(admission);
  widened.authority.commandExecution = true;
  assert.throws(() => fingerprintBoundFloorbornAdmission(widened), /authority is incompatible/);

  const forgedVerification = stableClone(admission);
  forgedVerification.exchangeVerification.truth.gameMutationAuthorized = true;
  assert.throws(() => fingerprintBoundFloorbornAdmission(forgedVerification), /verification digest does not match|truth boundary is incompatible/);
});

test("successful explicit application dispatches exactly the admitted command and seals a receipt", () => {
  const admission = syntheticAdmission();
  const approval = approvalFor(admission);
  const calls = [];
  const receipt = dispatchApprovedFloorbornCommand({
    admission,
    approval,
    dispatchCommand: (seatId, command) => calls.push({ seatId, command: stableClone(command) })
  });

  assert.equal(calls.length, 1);
  assert.equal(calls[0].seatId, "seat-1");
  assert.deepEqual(calls[0].command, admission.candidate);
  assert.equal(receipt.status, "DISPATCHED");
  assert.equal(receipt.admissionSha256, fingerprintBoundFloorbornAdmission(admission));
  assert.equal(receipt.commandSha256, sha256(admission.candidate));
  assert.equal(receipt.truth.downstreamGameStateObserved, false);
  const { receiptSha256, ...core } = receipt;
  assert.equal(receiptSha256, sha256(core));
});

test("dispatch failure cannot produce a false application receipt", () => {
  const admission = syntheticAdmission();
  const approval = approvalFor(admission);
  assert.throws(
    () => dispatchApprovedFloorbornCommand({ admission, approval, dispatchCommand: () => { throw new Error("door unavailable"); } }),
    /door unavailable/
  );
});

test("exact installed Floorborn admission crosses the existing RTS connected-AI event door", { skip: !PROVIDER }, async () => {
  const run = runProviderBridge();
  assert.equal(run.status, 0, run.stderr);
  const admission = JSON.parse(run.stdout);
  const approval = approvalFor(admission);

  const priorWindow = globalThis.window;
  const priorLocalStorage = globalThis.localStorage;
  try {
    const eventTarget = new EventTarget();
    globalThis.window = eventTarget;
    globalThis.localStorage = {
      getItem(key) {
        if (key !== "axm.manyRaceRts.lobby") return null;
        return JSON.stringify({
          mode: "skirmish",
          seats: [
            { id: "seat-1", controller: "connected-ai", label: "Floorborn", team: 1, factionId: "northpole-dominion", ready: true },
            { id: "seat-2", controller: "faction-ai", label: "Opponent", team: 2, factionId: "fatfrotz-empire", ready: true },
            { id: "seat-3", controller: "closed", label: "Seat 3", team: 3, ready: true },
            { id: "seat-4", controller: "closed", label: "Seat 4", team: 4, ready: true }
          ]
        });
      },
      setItem() {}
    };

    const applied = [];
    eventTarget.__AXM_RTS_WORLD__ = {
      command(owner, point) {
        applied.push({ owner, point: [point.x, point.y, point.z] });
      }
    };

    const { connectedAiCommand } = await import(`../src/multiSeatPatch.js?floorborn-explicit=${Date.now()}`);
    const receipt = dispatchApprovedFloorbornCommand({ admission, approval, dispatchCommand: connectedAiCommand });

    assert.equal(receipt.status, "DISPATCHED");
    assert.deepEqual(applied, [{ owner: "player", point: [12, 0, 8] }]);
    assert.equal(receipt.truth.downstreamGameStateObserved, false);
  } finally {
    if (priorWindow === undefined) delete globalThis.window;
    else globalThis.window = priorWindow;
    if (priorLocalStorage === undefined) delete globalThis.localStorage;
    else globalThis.localStorage = priorLocalStorage;
  }
});

function sha256(value) {
  return createHash("sha256").update(stableStringify(value)).digest("hex");
}
