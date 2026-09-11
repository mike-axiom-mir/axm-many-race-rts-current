import test from "node:test";
import assert from "node:assert/strict";
import {
  CityBrowserDirectSeatError,
  CITY_BROWSER_DIRECT_SEAT_SCHEMAS,
  consumeBrowserDirectSeatMessage,
  createCityBrowserDirectSeatBridge,
  describeCityBrowserDirectSeatCapability,
} from "../src/cityBrowserDirectSeat.js";

const provider = Object.freeze({
  id: "axm.browser-direct/v1",
  signaling: "manual-copy-paste",
  transport: "WebRTC-DataChannel",
  iceServers: [],
  relayFallback: false,
  accountRequired: false,
  failureCode: "DIRECT_CONNECTION_UNAVAILABLE",
  limits: { tokenBytes: 65536, messageBytes: 65536 },
});

function message(overrides = {}) {
  return {
    schema: CITY_BROWSER_DIRECT_SEAT_SCHEMAS.message,
    gameId: "axm-many-race-rts",
    build: "test-build",
    applicationSessionId: "match-local-001",
    seatId: "seat-3",
    sequence: 1,
    command: { type: "move", point: [12, 0, 8] },
    ...overrides,
  };
}

function bridge(dispatches = [], overrides = {}) {
  return createCityBrowserDirectSeatBridge({
    providerCapability: overrides.providerCapability || provider,
    binding: {
      gameId: "axm-many-race-rts",
      build: "test-build",
      applicationSessionId: "match-local-001",
      seatId: "seat-3",
      dispatchSeatCommand: async (detail) => dispatches.push(detail),
      ...(overrides.binding || {}),
    },
  });
}

function expectCode(fn, code) {
  assert.throws(fn, (error) => error instanceof CityBrowserDirectSeatError && error.code === code);
}

async function expectCodeAsync(fn, code) {
  await assert.rejects(fn, (error) => error instanceof CityBrowserDirectSeatError && error.code === code);
}

test("describes a narrow optional provider-to-existing-seat-command capability", () => {
  const descriptor = describeCityBrowserDirectSeatCapability();
  assert.equal(descriptor.id, CITY_BROWSER_DIRECT_SEAT_SCHEMAS.bridge);
  assert.equal(descriptor.provider, "axm.browser-direct/v1");
  assert.equal(descriptor.destination, "axm-seat-command");
  assert.deepEqual(descriptor.supportedCommands, ["move", "attack-capital"]);
  assert.deepEqual(descriptor.transportPolicy.iceServers, []);
  assert.equal(descriptor.transportPolicy.relayFallback, false);
  assert.equal(descriptor.transportPolicy.accountRequired, false);
  assert.equal(descriptor.authority.providerSelection, false);
  assert.equal(descriptor.authority.providerInstallation, false);
  assert.equal(descriptor.authority.seatSelection, false);
  assert.equal(descriptor.authority.gameplayStateMutation, false);
  assert.equal(descriptor.authority.merge, false);
  assert.equal(descriptor.authority.canon, false);
});

test("dispatches one exact move and emits deterministic content-bound evidence", async () => {
  const firstDispatches = [];
  const secondDispatches = [];
  const first = await bridge(firstDispatches).dispatch(message());
  const second = await bridge(secondDispatches).dispatch(message());

  assert.deepEqual(firstDispatches, [{ seatId: "seat-3", type: "move", point: [12, 0, 8] }]);
  assert.deepEqual(secondDispatches, firstDispatches);
  assert.equal(first.status, "DISPATCHED");
  assert.equal(first.messageSha256, second.messageSha256);
  assert.equal(first.providerCapabilitySha256, second.providerCapabilitySha256);
  assert.equal(first.receiptSha256, second.receiptSha256);
  assert.equal(first.truth.downstreamGameplayEffectPossible, true);
  assert.equal(first.truth.humanIdentityAuthenticated, false);
  assert.equal(first.authority.seatCommandDispatch, true);
  assert.equal(first.authority.gameplayStateMutation, false);
});

test("fails closed when the provider widens transport authority", () => {
  for (const drifted of [
    { ...provider, relayFallback: true },
    { ...provider, iceServers: [{ urls: "stun:example.invalid" }] },
    { ...provider, accountRequired: true },
    { ...provider, transport: "WebSocket" },
    { ...provider, limits: { tokenBytes: 65536, messageBytes: 65535 } },
    { ...provider, extraAuthority: true },
  ]) {
    expectCode(() => bridge([], { providerCapability: drifted }), "PROVIDER_HELD");
  }
});

test("binds game build session and one explicitly selected seat", async () => {
  for (const drifted of [
    { gameId: "other-game" },
    { build: "other-build" },
    { applicationSessionId: "other-session" },
    { seatId: "seat-2" },
  ]) {
    const dispatches = [];
    await expectCodeAsync(() => bridge(dispatches).dispatch(message(drifted)), "MESSAGE_HELD");
    assert.deepEqual(dispatches, []);
  }
  expectCode(() => bridge([], { binding: { seatId: "seat-9" } }), "BINDING_INVALID");
});

test("requires contiguous per-seat sequence and rejects replay before dispatch", async () => {
  const dispatches = [];
  const adapter = bridge(dispatches);
  await adapter.dispatch(message());
  assert.equal(adapter.lastSequence, 1);

  await expectCodeAsync(() => adapter.dispatch(message()), "MESSAGE_HELD");
  await expectCodeAsync(() => adapter.dispatch(message({ sequence: 3 })), "MESSAGE_HELD");
  assert.equal(dispatches.length, 1);
  assert.equal(adapter.lastSequence, 1);

  await adapter.dispatch(message({ sequence: 2, command: { type: "attack-capital" } }));
  assert.equal(adapter.lastSequence, 2);
  assert.deepEqual(dispatches[1], { seatId: "seat-3", type: "attack-capital" });
});

test("rejects malformed or widened commands before the RTS player door", async () => {
  const badMessages = [
    message({ command: { type: "move", point: [1, 2] } }),
    message({ command: { type: "move", point: [1, Number.NaN, 3] } }),
    message({ command: { type: "move", point: [1, 2, 3], hidden: true } }),
    message({ command: { type: "attack-capital", target: "seat-2" } }),
    message({ command: { type: "delete-capital" } }),
    { ...message(), hiddenAuthority: true },
  ];
  for (const candidate of badMessages) {
    const dispatches = [];
    await expectCodeAsync(() => bridge(dispatches).dispatch(candidate), "MESSAGE_HELD");
    assert.deepEqual(dispatches, []);
  }
});

test("does not consume a sequence when the existing seat-command door rejects dispatch", async () => {
  let failDispatch = true;
  const accepted = [];
  const adapter = createCityBrowserDirectSeatBridge({
    providerCapability: provider,
    binding: {
      gameId: "axm-many-race-rts",
      build: "test-build",
      applicationSessionId: "match-local-001",
      seatId: "seat-3",
      dispatchSeatCommand(detail) {
        if (failDispatch) throw new Error("host held command");
        accepted.push(detail);
      },
    },
  });

  await expectCodeAsync(() => adapter.dispatch(message()), "DISPATCH_FAILED");
  assert.equal(adapter.lastSequence, 0);
  failDispatch = false;
  await adapter.dispatch(message());
  assert.equal(adapter.lastSequence, 1);
  assert.equal(accepted.length, 1);
});

test("consumes an explicit peer receive seam without selecting or installing a provider", async () => {
  const dispatches = [];
  const adapter = bridge(dispatches);
  let receivedTimeout = null;
  const peer = {
    async receive(timeoutMs) {
      receivedTimeout = timeoutMs;
      return message();
    },
  };
  const receipt = await consumeBrowserDirectSeatMessage({ peer, bridge: adapter, timeoutMs: 4321 });
  assert.equal(receivedTimeout, 4321);
  assert.equal(receipt.status, "DISPATCHED");
  assert.equal(dispatches.length, 1);

  await expectCodeAsync(() => consumeBrowserDirectSeatMessage({ bridge: adapter }), "PROVIDER_HELD");
});

test("rejects non-exact bridge bindings instead of silently accepting hidden controls", () => {
  expectCode(() => createCityBrowserDirectSeatBridge({
    providerCapability: provider,
    binding: {
      gameId: "axm-many-race-rts",
      build: "test-build",
      applicationSessionId: "match-local-001",
      seatId: "seat-3",
      dispatchSeatCommand() {},
      autoReconnect: true,
    },
  }), "BINDING_INVALID");
});
