#!/usr/bin/env node
import { createHash } from "node:crypto";
import { accessSync, constants as fsConstants, readFileSync } from "node:fs";
import { resolve } from "node:path";
import { spawnSync } from "node:child_process";

import {
  admitFloorbornDecision,
  createFloorbornDecideRequest,
  createFloorbornSeatObservation,
  describeFloorbornConnectedSeat,
  stableClone,
  stableStringify,
  validateFloorbornProviderDescriptor
} from "../src/floorbornConnectedSeat.js";

const MAX_BYTES = 1024 * 1024;
const command = process.argv[2] || "help";

class BridgeError extends Error {
  constructor(code, message) {
    super(message);
    this.code = code;
  }
}

try {
  if (command === "describe") {
    write(describeFloorbornConnectedSeat());
  } else if (command === "run") {
    const provider = readProviderArgument();
    const input = readRequest();
    const descriptor = runProvider(provider, ["describe"]);
    validateFloorbornProviderDescriptor(descriptor);
    const observation = createFloorbornSeatObservation(input);
    const request = createFloorbornDecideRequest(input, observation);
    const response = runProvider(provider, ["process"], stableStringify(request));
    if (!verifyProviderResponseIntegrity(response)) throw new BridgeError("PROVIDER_INTEGRITY", "Floorborn response digest does not match its body");
    const admitted = admitFloorbornDecision({ response, observation, integrityVerified: true });
    write(sealBridgeResponse(admitted));
  } else if (["help", "--help", "-h"].includes(command)) {
    process.stdout.write("Usage: node tools/floorborn-seat-bridge.mjs <describe|run --provider PATH>\n");
  } else {
    throw new BridgeError("INVALID_COMMAND", `unsupported command: ${command}`);
  }
} catch (error) {
  const code = error instanceof BridgeError ? error.code : "INVALID_HOST_REQUEST";
  process.stderr.write(`${stableStringify({
    schema: "axm.rts.floorborn-connected-seat-error/v0.1",
    ok: false,
    error: { code, message: error instanceof Error ? error.message : String(error) },
    authority: "NO_COMMAND_EXECUTION_NO_GAME_MUTATION_NO_MERGE_NO_CANON"
  })}\n`);
  process.exitCode = 2;
}

function readProviderArgument() {
  const index = process.argv.indexOf("--provider");
  const value = index >= 0 ? process.argv[index + 1] : "";
  if (!value || value.startsWith("--")) throw new BridgeError("PROVIDER_REQUIRED", "run requires --provider PATH");
  const provider = resolve(value);
  try {
    accessSync(provider, fsConstants.R_OK);
  } catch {
    throw new BridgeError("PROVIDER_UNAVAILABLE", `Floorborn provider is not readable: ${provider}`);
  }
  return provider;
}

function readRequest() {
  const bytes = readFileSync(0);
  if (bytes.length > MAX_BYTES) throw new BridgeError("INPUT_TOO_LARGE", `stdin exceeds ${MAX_BYTES} bytes`);
  const text = bytes.toString("utf8").trim();
  if (!text) throw new BridgeError("INPUT_REQUIRED", "run requires one JSON request on stdin");
  try {
    return JSON.parse(text);
  } catch {
    throw new BridgeError("INVALID_JSON", "stdin is not valid JSON");
  }
}

function runProvider(provider, args, input = undefined) {
  const run = spawnSync(process.execPath, [provider, ...args], {
    input,
    encoding: "utf8",
    timeout: 5000,
    maxBuffer: MAX_BYTES,
    shell: false,
    windowsHide: true
  });
  if (run.error) {
    const code = run.error.code === "ENOENT" ? "PROVIDER_UNAVAILABLE" : "PROVIDER_FAILED";
    throw new BridgeError(code, `Floorborn provider could not run: ${run.error.message}`);
  }
  if (run.status !== 0) {
    throw new BridgeError("PROVIDER_REJECTED", `Floorborn provider exited ${run.status}: ${bounded(run.stderr)}`);
  }
  try {
    return JSON.parse(run.stdout);
  } catch {
    throw new BridgeError("PROVIDER_INVALID_JSON", "Floorborn provider did not return one JSON value");
  }
}

function verifyProviderResponseIntegrity(response) {
  if (!response || typeof response !== "object" || Array.isArray(response)) return false;
  if (!response.receipt || !/^[0-9a-f]{64}$/.test(String(response.receipt.sha256 || ""))) return false;
  const { receipt, ...body } = response;
  return sha256(body) === receipt.sha256;
}

function sealBridgeResponse(admitted) {
  const body = stableClone({
    schema: "axm.rts.floorborn-connected-seat-response/v0.1",
    ok: true,
    status: admitted.status,
    candidate: admitted.candidate,
    playerSnapshot: admitted.playerSnapshot,
    providerReceipt: admitted.providerReceipt,
    authority: admitted.authority
  });
  return stableClone({
    ...body,
    receipt: {
      schema: "axm.rts.floorborn-connected-seat-response-receipt/v0.1",
      sha256: sha256(body),
      authority: "CONTENT_INTEGRITY_ONLY_NO_COMMAND_EXECUTION_NO_GAME_MUTATION_NO_MERGE_NO_CANON"
    }
  });
}

function sha256(value) {
  return createHash("sha256").update(stableStringify(value)).digest("hex");
}

function bounded(value) {
  return String(value || "unknown provider error").trim().slice(0, 512);
}

function write(value) {
  process.stdout.write(`${stableStringify(value)}\n`);
}
