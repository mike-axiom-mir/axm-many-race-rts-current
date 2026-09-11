const BRIDGE_SCHEMA = "axm.rts.city-browser-direct-seat/v0.1";
const MESSAGE_SCHEMA = "axm.rts.remote-seat-command/v0.1";
const RECEIPT_SCHEMA = "axm.rts.remote-seat-command-receipt/v0.1";
const PROVIDER_ID = "axm.browser-direct/v1";
const PROVIDER_KEYS = ["id", "signaling", "transport", "iceServers", "relayFallback", "accountRequired", "failureCode", "limits"];
const LIMIT_KEYS = ["tokenBytes", "messageBytes"];
const MESSAGE_KEYS = ["schema", "gameId", "build", "applicationSessionId", "seatId", "sequence", "command"];
const MOVE_KEYS = ["type", "point"];
const ATTACK_KEYS = ["type"];
const MAX_TEXT = 128;
const MAX_MESSAGE_BYTES = 64 * 1024;
const textEncoder = new TextEncoder();

export class CityBrowserDirectSeatError extends Error {
  constructor(code, message) {
    super(message);
    this.name = "CityBrowserDirectSeatError";
    this.code = code;
  }
}

function fail(code, message) {
  throw new CityBrowserDirectSeatError(code, message);
}

function isPlainObject(value) {
  if (!value || typeof value !== "object" || Array.isArray(value)) return false;
  const prototype = Object.getPrototypeOf(value);
  return prototype === Object.prototype || prototype === null;
}

function exactKeys(value, expected, code, label) {
  if (!isPlainObject(value)) fail(code, `${label} must be a plain object`);
  const actual = Object.keys(value).sort();
  const wanted = [...expected].sort();
  if (actual.length !== wanted.length || actual.some((key, index) => key !== wanted[index])) {
    fail(code, `${label} fields do not match the v0.1 contract`);
  }
}

function requiredText(value, code, label) {
  if (typeof value !== "string" || !value.trim() || value.length > MAX_TEXT) {
    fail(code, `${label} must be a non-empty string up to ${MAX_TEXT} characters`);
  }
  return value;
}

function stableJson(value, seen = new Set()) {
  if (value === null) return "null";
  if (typeof value === "string" || typeof value === "boolean") return JSON.stringify(value);
  if (typeof value === "number") {
    if (!Number.isFinite(value)) fail("NON_PORTABLE_VALUE", "non-finite numbers are not portable evidence");
    return JSON.stringify(Object.is(value, -0) ? 0 : value);
  }
  if (Array.isArray(value)) return `[${value.map((item) => stableJson(item, seen)).join(",")}]`;
  if (!isPlainObject(value)) fail("NON_PORTABLE_VALUE", "evidence must contain only portable JSON values");
  if (seen.has(value)) fail("NON_PORTABLE_VALUE", "cyclic evidence is not portable");
  seen.add(value);
  const encoded = `{${Object.keys(value).sort().map((key) => `${JSON.stringify(key)}:${stableJson(value[key], seen)}`).join(",")}}`;
  seen.delete(value);
  return encoded;
}

async function sha256(value) {
  if (!globalThis.crypto?.subtle) fail("CRYPTO_UNAVAILABLE", "Web Crypto SHA-256 is required");
  const digest = await globalThis.crypto.subtle.digest("SHA-256", textEncoder.encode(stableJson(value)));
  return `sha256:${[...new Uint8Array(digest)].map((byte) => byte.toString(16).padStart(2, "0")).join("")}`;
}

function verifyProviderCapability(provider) {
  exactKeys(provider, PROVIDER_KEYS, "PROVIDER_HELD", "provider capability");
  exactKeys(provider.limits, LIMIT_KEYS, "PROVIDER_HELD", "provider limits");
  if (provider.id !== PROVIDER_ID) fail("PROVIDER_HELD", `provider must expose ${PROVIDER_ID}`);
  if (provider.signaling !== "manual-copy-paste") fail("PROVIDER_HELD", "provider signaling must remain manual-copy-paste");
  if (provider.transport !== "WebRTC-DataChannel") fail("PROVIDER_HELD", "provider transport must remain WebRTC-DataChannel");
  if (!Array.isArray(provider.iceServers) || provider.iceServers.length !== 0) fail("PROVIDER_HELD", "provider must keep iceServers empty");
  if (provider.relayFallback !== false) fail("PROVIDER_HELD", "relay fallback must remain disabled");
  if (provider.accountRequired !== false) fail("PROVIDER_HELD", "provider must not require an account");
  if (provider.failureCode !== "DIRECT_CONNECTION_UNAVAILABLE") fail("PROVIDER_HELD", "provider failure code drifted");
  if (provider.limits.tokenBytes !== MAX_MESSAGE_BYTES || provider.limits.messageBytes !== MAX_MESSAGE_BYTES) {
    fail("PROVIDER_HELD", "provider 64 KiB token/message limits drifted");
  }
  return provider;
}

function verifyBinding(binding) {
  if (!isPlainObject(binding)) fail("BINDING_INVALID", "binding must be a plain object");
  const allowed = ["gameId", "build", "applicationSessionId", "seatId", "dispatchSeatCommand"];
  const actual = Object.keys(binding).sort();
  const wanted = [...allowed].sort();
  if (actual.length !== wanted.length || actual.some((key, index) => key !== wanted[index])) {
    fail("BINDING_INVALID", "binding fields do not match the v0.1 contract");
  }
  const gameId = requiredText(binding.gameId, "BINDING_INVALID", "gameId");
  const build = requiredText(binding.build, "BINDING_INVALID", "build");
  const applicationSessionId = requiredText(binding.applicationSessionId, "BINDING_INVALID", "applicationSessionId");
  const seatId = requiredText(binding.seatId, "BINDING_INVALID", "seatId");
  if (!/^seat-[1-4]$/u.test(seatId)) fail("BINDING_INVALID", "seatId must be one current RTS seat (seat-1 through seat-4)");
  if (typeof binding.dispatchSeatCommand !== "function") fail("BINDING_INVALID", "dispatchSeatCommand must be an explicit host-owned function");
  return { gameId, build, applicationSessionId, seatId, dispatchSeatCommand: binding.dispatchSeatCommand };
}

function normalizeCommand(command) {
  if (!isPlainObject(command)) fail("MESSAGE_HELD", "command must be a plain object");
  if (command.type === "move") {
    exactKeys(command, MOVE_KEYS, "MESSAGE_HELD", "move command");
    if (!Array.isArray(command.point) || command.point.length !== 3 || command.point.some((value) => typeof value !== "number" || !Number.isFinite(value))) {
      fail("MESSAGE_HELD", "move point must contain exactly three finite numbers");
    }
    return { type: "move", point: command.point.map((value) => Object.is(value, -0) ? 0 : value) };
  }
  if (command.type === "attack-capital") {
    exactKeys(command, ATTACK_KEYS, "MESSAGE_HELD", "attack-capital command");
    return { type: "attack-capital" };
  }
  fail("MESSAGE_HELD", "only existing RTS move and attack-capital seat commands are admitted");
}

function normalizeMessage(message, binding, expectedSequence) {
  exactKeys(message, MESSAGE_KEYS, "MESSAGE_HELD", "remote seat message");
  if (message.schema !== MESSAGE_SCHEMA) fail("MESSAGE_HELD", `message schema must be ${MESSAGE_SCHEMA}`);
  if (message.gameId !== binding.gameId) fail("MESSAGE_HELD", "gameId does not match the explicit bridge binding");
  if (message.build !== binding.build) fail("MESSAGE_HELD", "build does not match the explicit bridge binding");
  if (message.applicationSessionId !== binding.applicationSessionId) fail("MESSAGE_HELD", "applicationSessionId does not match the explicit bridge binding");
  if (message.seatId !== binding.seatId) fail("MESSAGE_HELD", "seatId does not match the explicitly selected seat");
  if (!Number.isSafeInteger(message.sequence) || message.sequence !== expectedSequence) {
    fail("MESSAGE_HELD", `sequence must be exactly ${expectedSequence}`);
  }
  const command = normalizeCommand(message.command);
  const normalized = {
    schema: MESSAGE_SCHEMA,
    gameId: binding.gameId,
    build: binding.build,
    applicationSessionId: binding.applicationSessionId,
    seatId: binding.seatId,
    sequence: message.sequence,
    command,
  };
  if (textEncoder.encode(stableJson(normalized)).byteLength > MAX_MESSAGE_BYTES) fail("MESSAGE_HELD", "remote seat message exceeds the provider message ceiling");
  return normalized;
}

export function describeCityBrowserDirectSeatCapability() {
  return {
    id: BRIDGE_SCHEMA,
    provider: PROVIDER_ID,
    messageSchema: MESSAGE_SCHEMA,
    destination: "axm-seat-command",
    supportedCommands: ["move", "attack-capital"],
    transportPolicy: {
      signaling: "manual-copy-paste",
      iceServers: [],
      relayFallback: false,
      accountRequired: false,
    },
    authority: {
      providerSelection: false,
      providerInstallation: false,
      connectionAutomation: false,
      seatSelection: false,
      seatCommandDispatch: true,
      gameplayStateMutation: false,
      merge: false,
      canon: false,
    },
  };
}

export function createCityBrowserDirectSeatBridge({ providerCapability, binding } = {}) {
  const provider = verifyProviderCapability(providerCapability);
  const exactBinding = verifyBinding(binding);
  let lastSequence = 0;

  return Object.freeze({
    schema: BRIDGE_SCHEMA,
    get lastSequence() { return lastSequence; },
    async dispatch(message) {
      const normalized = normalizeMessage(message, exactBinding, lastSequence + 1);
      const messageSha256 = await sha256(normalized);
      const providerCapabilitySha256 = await sha256(provider);
      const detail = normalized.command.type === "move"
        ? { seatId: exactBinding.seatId, type: "move", point: [...normalized.command.point] }
        : { seatId: exactBinding.seatId, type: "attack-capital" };

      try {
        await exactBinding.dispatchSeatCommand(detail);
      } catch (error) {
        fail("DISPATCH_FAILED", `existing RTS seat-command door rejected dispatch: ${error?.message || String(error)}`);
      }

      lastSequence = normalized.sequence;
      const receipt = {
        schema: RECEIPT_SCHEMA,
        status: "DISPATCHED",
        provider: PROVIDER_ID,
        providerCapabilitySha256,
        messageSha256,
        binding: {
          gameId: exactBinding.gameId,
          build: exactBinding.build,
          applicationSessionId: exactBinding.applicationSessionId,
          seatId: exactBinding.seatId,
        },
        sequence: normalized.sequence,
        command: normalized.command,
        truth: {
          humanIdentityAuthenticated: false,
          antiCheatProof: false,
          natReachabilityProven: false,
          downstreamGameplayEffectPossible: true,
        },
        authority: {
          providerSelection: false,
          providerInstallation: false,
          connectionAutomation: false,
          seatSelection: false,
          seatCommandDispatch: true,
          gameplayStateMutation: false,
          merge: false,
          canon: false,
        },
      };
      return Object.freeze({ ...receipt, receiptSha256: await sha256(receipt) });
    },
  });
}

export async function consumeBrowserDirectSeatMessage({ peer, bridge, timeoutMs = 10000 } = {}) {
  if (!peer || typeof peer.receive !== "function") fail("PROVIDER_HELD", "an explicit browser-direct peer with receive() is required");
  if (!bridge || typeof bridge.dispatch !== "function") fail("BINDING_INVALID", "an explicit RTS seat bridge is required");
  if (!Number.isSafeInteger(timeoutMs) || timeoutMs < 1 || timeoutMs > 60000) fail("BINDING_INVALID", "timeoutMs must be an integer from 1 to 60000");
  const message = await peer.receive(timeoutMs);
  return bridge.dispatch(message);
}

export const CITY_BROWSER_DIRECT_SEAT_SCHEMAS = Object.freeze({
  bridge: BRIDGE_SCHEMA,
  message: MESSAGE_SCHEMA,
  receipt: RECEIPT_SCHEMA,
});
