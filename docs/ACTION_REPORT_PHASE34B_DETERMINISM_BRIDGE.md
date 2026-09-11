# Phase 34B — Stable identity, seeded RNG and replay-observation bridge

## Purpose

Continue the RTS Foundation Consolidation inside PR #34 without replacing working gameplay authority before the existing patch stack is ready.

This slice implements the next safe foundation seam:

1. stable runtime entity identities;
2. seeded pseudo-random streams;
3. read-only canonical world snapshots;
4. a shadow fixed-step observation clock;
5. tick-bound formation command capture;
6. exportable replay-observation receipts.

## What changed

### `src/core/seededRng.js`

Adds deterministic named random streams with reset, range, integer, chance, pick and fork operations. Named streams are intended to prevent future visual randomness from perturbing gameplay randomness.

### `src/core/entityIdentity.js`

Adds a resettable deterministic ID allocator. Runtime entities use `userData.entityId` rather than overwriting the existing `userData.id`, which remains the authored unit/building definition ID.

Example shape:

`flat:player:squad:0001`

### `src/core/runtimeSnapshot.js`

Builds a read-only canonical snapshot from the live Three.js world. The adapter deliberately reports its boundary as `world-entities-only`; it does not invent economy state that remains closed inside the current Skirmish runtime.

Snapshots contain a stable FNV-1a fingerprint for comparison. The fingerprint is a reproducibility checksum, not a cryptographic security digest.

### `src/core/replayBridge.js`

Adds a non-authoritative replay observer. It:

- advances a 20 Hz shadow clock;
- records commands against observed ticks;
- captures bounded periodic snapshot fingerprints;
- exports a receipt with commands, checkpoints and latest canonical world snapshot.

It does **not** replay a match yet.

### `src/core/skirmishFoundationBridge.js`

Installs the migration bridge before the existing Skirmish patch stack.

The bridge:

- resets deterministic entity IDs at match reset;
- assigns IDs to capitals, buildings, founders and squads;
- repairs missing IDs on observed world entities;
- records `RTSWorld.command()` formation orders;
- observes frames through the fixed-step shadow clock;
- exposes `window.__AXM_RTS_SKIRMISH_BRIDGE__` for inspection/export;
- accepts a shareable seed through `?seed=<value>`.

### Legacy randomness compatibility boundary

The existing Skirmish implementation still contains direct `Math.random()` call sites in the old runtime and patch layers. Rewriting all of them at once would be a risky authority change.

For this migration slice, the bridge seeds `Math.random()` after match reset using a dedicated compatibility stream. This makes the existing random call path seed-controlled while keeping an explicit diagnostic count.

This is temporary. The intended end state is explicit named RNG streams at each gameplay call site, after which the compatibility shim can be removed.

## Public inspection surface

After a Skirmish world exists:

```js
window.__AXM_RTS_SKIRMISH_BRIDGE__
```

Provides:

- `authority: "observer-only"`;
- active seed;
- current world reference;
- `snapshot()`;
- `exportReplayReceipt()`;
- `diagnostics()`.

## Truth boundary

This phase does **not** claim full deterministic simulation or authoritative replay.

Still not migrated:

- variable-step Skirmish simulation authority;
- economy state held in the `game.js` closure;
- all random call sites into explicit named streams;
- replay playback / command application;
- fixed-step authority for combat, AI, economy and scenario systems;
- Defend, Globe and Domination runtime adapters.

A same-seed run is therefore more reproducible than before, but full equality still depends on current frame/timing and patch execution order.

## Verification performed

Before the GitHub write, the new module text was checked with Node syntax parsing. An isolated logic self-check also verified:

- identical seeded streams return identical sequences;
- entity ID allocation resets deterministically;
- equivalent world snapshots produce the same fingerprint;
- the 20 Hz replay observer advances expected ticks;
- command capture appears in exported observation receipts.

This is not a browser/gameplay pass. `verification.html` and real Skirmish play still remain required before merge-gate confidence.

## Next safe slice

1. expose Skirmish economy/seat state through a read-only provider;
2. include that provider in canonical snapshots;
3. replace legacy random compatibility with explicit gameplay streams;
4. add command schemas for build/train/research/age actions;
5. move one bounded subsystem (economy first) onto fixed-step authority;
6. compare same-seed receipts before and after authority migration.
