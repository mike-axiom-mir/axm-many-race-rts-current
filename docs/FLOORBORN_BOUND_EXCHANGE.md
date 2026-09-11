# Floorborn request-bound connected-seat exchange

This is a deliberately separate continuation of the existing Floorborn connected-seat bridge. The original bridge remains pinned to the provider's v0.1 response/receipt contract. This seam adopts the stronger Floorborn v0.2 exchange contract without silently reinterpreting old evidence.

## Why this exists

The original connected-seat lane proved that a local Floorborn process could receive Many-Race RTS public state and return one exact legal ordinary-seat move candidate. Its provider receipt bound only response-body integrity.

Floorborn later added:

- `axm.floorborn.process-response/v0.2`;
- `axm.floorborn.process-receipt/v0.2`;
- exact `requestSha256` plus `responseSha256`;
- `axm.floorborn.process-exchange-verification/v0.1` deterministic replay semantics;
- strict raw-JSON admission at its CLI boundary.

This RTS continuation consumes that stronger contract explicitly.

## Flow

```text
Phase 34 public RTS state + declared legal move candidates
  -> existing connected-seat observation/request builder
  -> caller-supplied local Floorborn v0.2 process
  -> response #1
  -> exact same process request again
  -> response #2
  -> consumer verifies:
       request SHA-256 == provider receipt requestSha256
       response body SHA-256 == provider receipt responseSha256
       response #1 == deterministic replay response #2
  -> exact legal action comparison
  -> READY ordinary-seat command candidate
  -> caller may separately use the existing connected-AI player door
```

The bridge invokes the provider twice intentionally. The second run is verification evidence, not a performance optimization.

## Run locally

Supply the provider executable explicitly. Nothing is discovered, installed, selected, or downloaded automatically.

```bash
node tools/floorborn-bound-seat-bridge.mjs run \
  --provider /path/to/axm-floor-born/bin/floorborn-player.js \
  < examples/floorborn-connected-seat-request.json
```

The exact interoperability evidence for this lane pins Floorborn PR #10 head `9183acabfd9fab1f2913527871e651300a160e62`, package `axm-floor-born@0.15.1` (private/local), capability `axm.floorborn.bounded-player-process`, response `v0.2`, receipt `v0.2`, and exchange verification `v0.1`.

## Fail-closed boundary

The consumer refuses providers that do not expose the required v0.2 response/receipt/exchange contract, widen their declared network/account/model or authority boundary, return a response whose request identity does not match the exact semantic request, return altered response bytes, replay to different bytes, change player identity, or select anything outside the exact legal-action set supplied by the RTS.

The old v0.1 bridge is left intact. Old evidence is not upgraded by reinterpretation.

## Authority and truth

A PASS proves only that the supplied local provider declared the pinned contract, the exact semantic request identity matches the returned receipt, the returned response body matches its receipt, a second execution of that exact request returned the same response, and the chosen action is one of the exact legal actions the RTS supplied.

It does not authenticate provider authorship, prove hostile-process isolation, authorize command execution, mutate the game, select a provider automatically, merge anything, or establish CANON. SHA-256 is content identity, not a signature. The provider remains optional and local. Mike remains the merge/CANON authority.
