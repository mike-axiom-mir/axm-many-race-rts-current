import test from "node:test";
import assert from "node:assert/strict";
import { createHash } from "node:crypto";
import { spawnSync } from "node:child_process";
import { fileURLToPath } from "node:url";

import {
  admitFloorbornDecision,
  createFloorbornDecideRequest,
  createFloorbornSeatObservation,
  describeFloorbornConnectedSeat,
  FLOORBORN_SEAT_REQUEST_SCHEMA,
  stableStringify,
  validateFloorbornProviderDescriptor
} from "../src/floorbornConnectedSeat.js";

const ROOT = fileURLToPath(new URL("..", import.meta.url));
const BRIDGE = fileURLToPath(new URL("../tools/floorborn-seat-bridge.mjs", import.meta.url));
const PROVIDER = process.env.FLOORBORN_PROVIDER || "";

function publicState() {
  return {
    schema: "axm-rts-public-skirmish-state/v1",
    authoritative: false,
    source: "public-runtime-readback",
    coverage: "player-economy-ui+world-seats+strategy-ui",
    status: "running",
    result: null,
    seats: {
      player: {
        id: "player",
        factionId: "northpole-dominion",
        factionName: "Northpole Dominion",
        team: 1,
        age: 1,
        workforce: 18,
        resources: { food: 320, wood: 220, stone: 90, gold: 140 },
        allocation: {
          values: { food: 4, wood: 3, stone: 1, gold: 2 },
          shares: { food: 0.4, wood: 0.3, stone: 0.1, gold: 0.2 }
        },
        formations: 3,
        buildings: 2,
        founders: 1,
        capitals: 1
      },
      enemy: { id: "enemy", factionId: "fatfrotz-empire", team: 2, formations: 4, buildings: 2, founders: 1, capitals: 1 }
    },
    strategy: { Map: "Founder's Crossing", Territory: "1 / 3" }
  };
}

function hostRequest(overrides = {}) {
  return {
    schema: FLOORBORN_SEAT_REQUEST_SCHEMA,
    sessionId: "many-race-rts:fixture-001",
    turn: 7,
    seatId: "seat-1",
    ownerId: "player",
    playerId: "floorborn:rts:seat-1",
    lineageId: "floorborn:rts:seat-1:local",
    publicState: publicState(),
    legalCommands: [
      {
        id: "move:founder-stone",
        type: "move",
        point: [12, 0, 8],
        target: "founder-stone",
        affordanceTags: ["goal"]
      },
      {
        id: "move:home",
        type: "move",
        point: [-28, 0, 20],
        target: "player-capital",
        affordanceTags: ["optional"]
      }
    ],
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

test("descriptor keeps provider choice, command execution, mutation, and authority outside the adapter", () => {
  const descriptor = describeFloorbornConnectedSeat();
  assert.equal(descriptor.id, "axm.rts.floorborn-connected-seat");
  assert.equal(descriptor.provider.capabilityId, "axm.floorborn.bounded-player-process");
  assert.equal(descriptor.provider.playerProtocol, "axm.player.rts.v0.1");
  assert.deepEqual(descriptor.authority, {
    automaticProviderSelection: false,
    canon: false,
    commandExecution: false,
    gameMutation: false,
    merge: false,
    publication: false
  });
});

test("Phase 34 public state becomes a bounded RTS observation with exact ordinary-seat commands", () => {
  const input = hostRequest();
  const observation = createFloorbornSeatObservation(input);
  const request = createFloorbornDecideRequest(input, observation);

  assert.equal(observation.protocol, "axm.player.rts.v0.1");
  assert.equal(observation.game.publicState.source, "public-runtime-readback");
  assert.equal(observation.self.seatId, "seat-1");
  assert.equal(observation.legalActions.length, 2);
  assert.deepEqual(observation.legalActions[0].command.observedCommand, {
    schema: "axm-rts-observed-command/v1",
    type: "formation-order",
    seatId: "player",
    payload: { x: 12, y: 0, z: 8 }
  });
  assert.deepEqual(request.player, { playerId: "floorborn:rts:seat-1", lineageId: "floorborn:rts:seat-1:local" });
  assert.equal(Object.isFrozen(observation.game.publicState), true);
});

test("hidden authority, unsupported commands, and malformed coordinates fail before provider execution", () => {
  assert.throws(
    () => createFloorbornSeatObservation(hostRequest({ publicState: { ...publicState(), authoritative: true } })),
    /public runtime readback/
  );
  assert.throws(
    () => createFloorbornSeatObservation(hostRequest({ legalCommands: [{ id: "attack", type: "attack-capital", point: [0, 0, 0] }] })),
    /only ordinary connected-seat move/
  );
  assert.throws(
    () => createFloorbornSeatObservation(hostRequest({ legalCommands: [{ id: "move", type: "move", point: [0, Infinity, 0] }] })),
    /three finite numbers/
  );
  assert.throws(
    () => createFloorbornSeatObservation(hostRequest({ ownerId: "enemy" })),
    /same RTS player seat/
  );
});

test("admission requires verified integrity, exact legal action bytes, and unchanged false authority", () => {
  const observation = createFloorbornSeatObservation(hostRequest());
  const action = observation.legalActions[0];
  const response = {
    schema: "axm.floorborn.process-response/v0.1",
    ok: true,
    operation: "decide",
    action,
    decision: { selectedActionId: action.id },
    playerSnapshot: { schema: "axm.floorborn.memory.v0.7", playerId: observation.self.playerId },
    authority: { automaticSelection: false, canon: false, execution: false, gameMutation: false, merge: false, publication: false },
    receipt: {
      schema: "axm.floorborn.process-receipt/v0.1",
      sha256: "a".repeat(64),
      authority: "CONTENT_INTEGRITY_ONLY_NO_EXECUTION_NO_MERGE_NO_CANON"
    }
  };

  assert.throws(() => admitFloorbornDecision({ response, observation, integrityVerified: false }), /integrity must be verified/);
  assert.throws(
    () => admitFloorbornDecision({ response: { ...response, action: { ...action, target: "enemy-capital" } }, observation, integrityVerified: true }),
    /not an exact declared legal action/
  );
  assert.throws(
    () => admitFloorbornDecision({ response: { ...response, authority: { ...response.authority, gameMutation: true } }, observation, integrityVerified: true }),
    /authority is incompatible/
  );
  const admitted = admitFloorbornDecision({ response, observation, integrityVerified: true });
  assert.equal(admitted.status, "READY");
  assert.equal(admitted.candidate.seatId, "seat-1");
  assert.equal(admitted.authority.commandExecution, false);
});

test("a missing optional provider returns an explicit non-executing failure", () => {
  const run = runBridge(hostRequest(), "/definitely/missing/floorborn-player.js");
  assert.equal(run.status, 2);
  const error = JSON.parse(run.stderr);
  assert.equal(error.error.code, "PROVIDER_UNAVAILABLE");
  assert.equal(error.authority, "NO_COMMAND_EXECUTION_NO_GAME_MUTATION_NO_MERGE_NO_CANON");
  assert.equal(run.stdout, "");
});

test("the exact Floorborn provider performs a deterministic player-seat round trip", { skip: !PROVIDER }, () => {
  const first = runBridge(hostRequest());
  assert.equal(first.status, 0, first.stderr);
  const left = JSON.parse(first.stdout);
  const repeated = runBridge(hostRequest());
  assert.equal(repeated.status, 0, repeated.stderr);
  const right = JSON.parse(repeated.stdout);

  assert.deepEqual(left, right);
  assert.equal(left.status, "READY");
  assert.equal(left.candidate.schema, "axm-rts-connected-seat-command/v1");
  assert.equal(left.candidate.seatId, "seat-1");
  assert.equal(left.candidate.type, "move");
  assert.deepEqual(left.candidate.point, [12, 0, 8]);
  assert.equal(left.authority.commandExecution, false);
  const { receipt, ...body } = left;
  assert.equal(receipt.sha256, createHash("sha256").update(stableStringify(body)).digest("hex"));

  const descriptorRun = spawnSync(process.execPath, [PROVIDER, "describe"], { encoding: "utf8" });
  assert.equal(descriptorRun.status, 0, descriptorRun.stderr);
  assert.equal(validateFloorbornProviderDescriptor(JSON.parse(descriptorRun.stdout)), true);

  const continuedInput = hostRequest({ turn: 8, playerSnapshot: left.playerSnapshot });
  delete continuedInput.lineageId;
  const continued = runBridge(continuedInput);
  assert.equal(continued.status, 0, continued.stderr);
  const continuedResponse = JSON.parse(continued.stdout);
  assert.equal(continuedResponse.status, "READY");
  assert.equal(continuedResponse.playerSnapshot.playerId, "floorborn:rts:seat-1");
});
