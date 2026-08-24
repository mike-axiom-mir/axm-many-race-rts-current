# Phase 34D — Shared Economy System + Parity Gate

## Purpose

Move one bounded subsystem out of the fast-grown `game.js` closure without changing the original RTS design or transferring simulation authority prematurely.

The selected subsystem is economy because its current behavior is compact, observable and substantially safer to isolate than combat or AI.

## What moved

The pre-extraction Skirmish economy formula was:

1. workforce × allocation share × base resource rate × faction economy multiplier × age multiplier;
2. add income from living faction buildings;
3. add strategic-territory income × age multiplier;
4. apply the existing Efficient Supply upgrade multiplier;
5. accrue the resulting per-second rate using the runtime `dt`.

Population growth remained a separate timer:

- player: `max(26, 48 - economyBuildings * 5)` seconds;
- enemy: `max(27, 49 - economyBuildings * 5)` seconds;
- when the threshold is crossed, the legacy timer resets to zero and one workforce is added.

## New shared system

`src/core/economySystem.js` now owns:

- the existing base income constants;
- allocation normalization as a separate helper;
- shared income-rate calculation;
- resource accrual for a supplied `dt`;
- living economy-building counting;
- player/enemy population-growth intervals;
- legacy-compatible population-clock stepping.

The calculation contract deliberately expects allocation shares, matching the old `incomeRateFor()` function. Player allocation is normalized by the existing UI helper before the shared call; `enemyAllocationForFaction()` was verified to already return normalized shares.

## Live runtime integration

`src/game.js` now calls the shared economy system for both player and AI income and population growth.

The extraction changes only the economy seam. It does not alter:

- the requestAnimationFrame loop;
- variable-step `dt` authority;
- combat;
- AI random choices;
- unit spawn randomness;
- faction identities;
- map bonuses;
- age data;
- upgrade values.

A Git comparison after the rewrite reports only 9 additions and 6 deletions in `src/game.js`, confirming the full-file GitHub update did not silently rewrite unrelated runtime code.

## Parity harness

`src/core/economyParityHarness.js` contains a locked reference copy of the pre-extraction formula and compares it with the new shared implementation across:

- founding economy;
- age-scaled economy;
- building income;
- territory income;
- Efficient Supply upgrades;
- player and enemy population-growth timings;
- the legacy reset-on-growth timer behavior;
- static-state 20 Hz accrual versus the same elapsed-time accumulation.

The harness explicitly reports `authorityTransferred: false`.

## Browser parity gate

`economy-parity.html` renders the parity suite and publishes:

`window.__AXM_RTS_ECONOMY_PARITY__`

`verification.html` now treats Economy Parity as a semantic verification target: loading the page is not enough. The target fails when the parity report is absent or reports a mismatch.

## Truth boundary

This GitHub-connected environment does not execute the browser game, so Phase 34D does not claim the browser parity gate has been run here.

What is true from this pass:

- the legacy formula was identified from the live branch;
- the AI allocation helper was verified to return normalized shares;
- the live Skirmish source now routes both sides through the shared economy implementation;
- native per-run randomness remains unchanged;
- no fixed-step gameplay authority has been transferred.

## Next safe migration

1. run `verification.html` in a real browser and require the economy parity target to pass;
2. expose the live shared economy inputs/outputs as a compact diagnostic receipt;
3. run a fixed-step shadow economy beside the live economy from identical snapshots;
4. compare drift over changing workforce/buildings/territory/upgrades, not only static fixtures;
5. only if drift remains zero, introduce an explicit opt-in fixed-step economy experiment before any default authority transfer.
