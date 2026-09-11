#!/usr/bin/env node
import { createHash } from "node:crypto";
import { readFileSync, writeFileSync } from "node:fs";
import { resolve } from "node:path";
import {
  buildForgeUnitRequest,
  FORGE_PROVIDER_GENOME_VERSION,
  FORGE_PROVIDER_REPOSITORY,
  requestTruthBoundary
} from "../src/forgeAssetRequest.js";

function usage() {
  return [
    "Usage:",
    "  node --experimental-default-type=module tools/export-forge-unit-request.mjs \\",
    "    --unit-pack UNIT_PACK.json --unit UNIT_ID --asset-type TYPE --unit-meters METERS \\",
    "    --source-ref 40_HEX_SHA --provider-ref 40_HEX_SHA --output REQUEST.json --receipt RECEIPT.json"
  ].join("\n");
}

function parseArgs(argv) {
  const out = {};
  for (let i = 0; i < argv.length; i += 2) {
    const key = argv[i];
    const value = argv[i + 1];
    if (!key?.startsWith("--") || value === undefined) throw new Error(usage());
    out[key.slice(2)] = value;
  }
  return out;
}

function stable(value) {
  if (Array.isArray(value)) return value.map(stable);
  if (value && typeof value === "object") {
    return Object.fromEntries(Object.keys(value).sort().map(key => [key, stable(value[key])]));
  }
  return value;
}

function canonicalJson(value) {
  return JSON.stringify(stable(value));
}

function sha256(value) {
  return `sha256:${createHash("sha256").update(value, "utf8").digest("hex")}`;
}

function assertCommitSha(value, label) {
  if (!/^[0-9a-f]{40}$/i.test(String(value || ""))) throw new Error(`${label} must be an exact 40-character Git commit SHA`);
}

try {
  const args = parseArgs(process.argv.slice(2));
  for (const key of ["unit-pack", "unit", "asset-type", "unit-meters", "source-ref", "provider-ref", "output", "receipt"]) {
    if (!args[key]) throw new Error(`missing --${key}\n${usage()}`);
  }
  assertCommitSha(args["source-ref"], "source ref");
  assertCommitSha(args["provider-ref"], "provider ref");

  const pack = JSON.parse(readFileSync(resolve(args["unit-pack"]), "utf8"));
  const request = buildForgeUnitRequest(pack, {
    unitId: args.unit,
    assetType: args["asset-type"],
    unitMeters: args["unit-meters"],
    sourceRef: args["source-ref"]
  });

  const requestDigest = sha256(canonicalJson(request));
  const receipt = {
    schema: "axm.rts.forge-request-export-receipt/v0.1",
    status: "REQUEST_READY",
    authority: "REQUEST_ONLY",
    request_digest: requestDigest,
    source: {
      repository: request.sources[0].repository,
      ref: request.sources[0].ref,
      path: request.sources[0].path,
      pack_id: request.sources[0].pack_id,
      unit_id: request.sources[0].unit_id
    },
    provider_contract: {
      repository: FORGE_PROVIDER_REPOSITORY,
      ref: args["provider-ref"].toLowerCase(),
      command: "python forge.py init <request> <output>",
      genome_version: FORGE_PROVIDER_GENOME_VERSION
    },
    truth_boundary: requestTruthBoundary(request)
  };

  writeFileSync(resolve(args.output), `${JSON.stringify(stable(request), null, 2)}\n`, "utf8");
  writeFileSync(resolve(args.receipt), `${JSON.stringify(stable(receipt), null, 2)}\n`, "utf8");
  process.stdout.write(`${JSON.stringify(receipt)}\n`);
} catch (error) {
  process.stderr.write(`forge request export failed: ${error.message}\n`);
  process.exitCode = 2;
}
