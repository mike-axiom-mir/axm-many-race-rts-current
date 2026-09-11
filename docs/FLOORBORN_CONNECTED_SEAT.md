# Optional Floorborn connected-seat bridge

The RTS already defines a `connected-ai` controller that must use the normal player information and command gates. Phase 34 adds a read-only public Skirmish state and a normalized observed-command contract. This adapter connects those host-owned boundaries to Floorborn's bounded local player process without giving the provider direct game access.

## What crosses the boundary

The host supplies:

- one `axm-rts-public-skirmish-state/v1` value from Phase 34's `readPublicState()` boundary;
- an explicit list of legal ordinary-seat `move` commands;
- the seat, owner, session, turn, and Floorborn player identity;
- an optional caller-owned Floorborn snapshot for continuity.

The adapter translates each move through Phase 34's existing `normalizeSkirmishCommand()` contract and sends the bounded observation as `axm.player.rts.v0.1`. Floorborn may choose only one declared legal action. The adapter independently checks the provider response SHA-256, requires every authority flag to remain false, and matches the returned action byte-for-byte against the host list.

The output remains a candidate. A human or explicit host policy must pass `candidate` to the existing `connectedAiCommand(candidate.seatId, candidate)` player door. Neither the adapter nor Floorborn performs that call.

## Run locally

Check out Floorborn PR #7 at its pinned interoperability revision and point to its process executable:

```bash
git clone https://github.com/mike-axiom-mir/axm-floor-born.git ../axm-floor-born
git -C ../axm-floor-born checkout ae244d3dd72c516f4905ba21fedd349d7b60389b
node tools/floorborn-seat-bridge.mjs describe
node tools/floorborn-seat-bridge.mjs run \
  --provider ../axm-floor-born/bin/floorborn-player.js \
  < examples/floorborn-connected-seat-request.json
```

The bridge is dependency-free, local, and offline after checkout. It does not discover or install providers, open a network connection, choose a provider automatically, mutate the match, authenticate authorship, publish anything, merge code, or establish CANON.

## Failure behavior

Missing providers, incompatible descriptors, oversized or malformed input, non-public state, unsupported commands, provider rejection, response-integrity drift, authority escalation, and actions outside the declared legal set all exit nonzero with a bounded JSON error. No candidate is written to stdout on failure.

## Compatibility boundary

This v0.1 bridge intentionally supports only flat-Skirmish connected-seat `move` commands. Economy, build, train, research, attack-capital, Defend, Globe, and Domination commands are not silently approximated. Adding any of them requires a host-owned legal-command contract and its own admission tests.
