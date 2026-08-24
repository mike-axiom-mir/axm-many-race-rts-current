# Phase 34C — Restore original randomness and expose public Skirmish state

## Purpose

Correct the Phase 34B compatibility choice before it becomes architecture.

The original AXM Many-Race RTS uses ordinary per-run browser randomness for combat variation, formation presentation and AI choices. A global `Math.random()` replacement was introduced only as a temporary determinism migration shim in Phase 34B.

That shim is now removed.

## Original game behavior preserved

Normal Skirmish now keeps its original randomness policy:

- `Math.random()` is not overridden;
- normal players do not receive a hidden deterministic seed;
- `?seed=` does not alter gameplay outcomes;
- existing random variation remains part of the current game design;
- no cleanup/restoration hook is needed because the global random function is never changed.

The seeded RNG primitive remains in the foundation library for future **explicit opt-in** deterministic tests, simulations or replay modes. Availability of that capability does not make it default gameplay authority.

## New public-state observation layer

`src/core/publicSkirmishState.js` reads only state that the running game already exposes publicly through its world objects and HUD:

- player stockpile;
- player workforce;
- macro resource allocation;
- player/enemy age when visible;
- seat/faction/team identity when exposed by the runtime;
- living formations/buildings/founders/capitals;
- public strategic HUD rows;
- setup/running/end state.

The snapshot explicitly reports:

- `authoritative: false`;
- `source: public-runtime-readback`;
- its coverage boundary.

Enemy private economy values are not invented when they are not exposed.

## Economy observation mirror

`src/core/economyObserver.js` samples the public player stockpile against the existing 20 Hz shadow observation clock.

It can derive observed stockpile deltas/rates across samples, but it does **not** take economy authority.

This is intentional: measure the current economy first, then extract/migrate the real formula. Do not create a second economy implementation and silently call it equivalent.

## Observed command schema

`src/core/commandSchema.js` now normalizes these observer command types:

- `formation-order`;
- `economy-allocation`;
- `build-intent`;
- `train-intent`;
- `research-intent`;
- `advance-age-intent`.

These are explicitly called **observed intents** because the current runtime can still reject, cancel or supersede an action. They are not yet authoritative replay commands.

## UI command observer

`src/skirmishCommandObserver.js` is loaded after `game.js` and records:

- build selection;
- formation training clicks;
- research clicks;
- age-advance clicks;
- committed macro allocation changes.

Formation movement orders continue to be observed at `RTSWorld.command()`.

## Replay receipt v2

The Skirmish bridge now exports:

- world entities;
- stable entity IDs;
- observed commands;
- public Skirmish state;
- economy observation samples;
- combined snapshot fingerprints;
- an explicit randomness policy.

The receipt states that:

- normal gameplay randomness is native per-run;
- there is no global random override;
- the observation seed does not affect gameplay;
- replay remains observer-only.

## Truth boundary

Still not claimed:

- authoritative replay playback;
- deterministic default gameplay;
- fixed-step combat/AI/economy authority;
- private enemy economy state;
- exact lifetime gathered/spent totals;
- browser gameplay verification from this GitHub connector.

## Next safe migration

The next architecture step should extract the **existing economy formula itself** from `game.js` into one shared economy system, then have the current variable-step runtime and a fixed-step test harness call that same implementation. Only after same-state comparisons pass should fixed-step economy become authoritative.
