# City browser-direct remote RTS seat

Status: **experimental optional integration / not CANON**.

The RTS already has a four-seat lobby and the browser event door `axm-seat-command`. The current shared-screen prototype explicitly leaves independent network input routing to later adapters. This integration connects one explicitly selected RTS seat to AXM City Multiplayer's existing browser-direct WebRTC/DataChannel capability without copying its transport implementation.

## Exact provider used by the interoperability gate

- repository: `mike-axiom-mir/axm-city-multiplayer`
- draft PR: `#18`
- exact provider head: `256f670d832633159a3d91b9e4f522a438e966b4`
- local package: `axm-city-browser-direct@0.1.0`
- capability: `axm.browser-direct/v1`
- signaling: manual copy/paste
- `iceServers: []`
- relay fallback: false
- account required: false

The provider is not a product dependency of the RTS. A caller must deliberately stage it and supply a live peer plus the host-owned seat-command dispatch function.

## Bounded path

`manual offer/answer -> direct DataChannel -> axm.rts.remote-seat-command/v0.1 -> exact game/build/session/seat/sequence admission -> existing axm-seat-command door`

The remote message can express only the two seat commands already present on the current RTS command surface:

- `move` with exactly three finite coordinates;
- `attack-capital` with no remote target override.

A bridge binding fixes one current seat (`seat-1` through `seat-4`) before any message is admitted. The sender cannot choose another seat inside a command. Sequence numbers must be contiguous, so replayed, skipped, or out-of-order messages fail before the RTS player door is called.

The bridge also pins the provider's v1 transport policy. A provider that adds relay fallback, ICE servers, an account requirement, a different transport, wider limits, or extra capability fields is held rather than silently accepted.

## Authority and truth boundary

A `DISPATCHED` receipt means that one exact admitted message crossed the caller-supplied existing RTS seat-command door without that door throwing. Ordinary player input can affect the live game afterward; that downstream gameplay effect belongs to the existing RTS command system, not to the networking adapter.

The bridge does **not**:

- discover, download, install, or select a provider;
- automate offer/answer exchange;
- select a player seat;
- authenticate the remote human;
- prove honest input or provide anti-cheat;
- improve NAT reachability;
- add STUN, TURN, relay, rendezvous, cloud, account, or paid infrastructure;
- rewrite RTS rules or canonical game state directly;
- merge, release, promote, or establish CANON.

Direct connection failure remains a valid result. Manual signaling tokens can expose network candidates to the person receiving them.

## Pattern provenance

Local Game Hub PR #15 previously proved the same **provider-to-existing-player-door** architectural pattern against Robo Pong Cross. This RTS lane adapts that pattern to the RTS's distinct `axm-seat-command` authority boundary and its documented multi-human networking gap. It does not copy the Hub adapter source.

## Evidence target

The focused contract runs on Node 20 and 22. The cross-repository job checks out the exact City provider head, runs its provider-owned transport/package tests, packs and installs only that provider tarball, then uses real Chromium to establish a direct DataChannel. A remote `seat-3` move must cross the installed provider, the RTS admission bridge, and the repository's real `seatCommandAuthorityPatch.js` event listener before a world-command witness can observe it. A replayed sequence must be held before a second world command is possible.

This proof is intentionally narrower than full multiplayer. WAN/NAT/CGNAT behavior, reconnect/resume, sustained command rate, hostile peers, physical-phone ergonomics, multi-peer synchronization, rollback networking, authoritative lockstep, anti-cheat, and matchmaking remain outside this lane.
