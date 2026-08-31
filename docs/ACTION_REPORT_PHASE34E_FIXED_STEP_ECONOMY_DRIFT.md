# Phase 34E — Fixed-step economy drift probe

## Purpose

Measure the real behavioral difference between the current variable-step Skirmish economy and a 20 Hz fixed-step shadow before transferring any gameplay authority.

This phase is observation only.

## What changed

### Read-only Economy System observation hook

`src/core/economySystem.js` now supports registered income-tick observers.

The live calculation and mutation order remains:

1. calculate income rate from the current economy snapshot;
2. apply `rate × dt` to the live stockpile;
3. return the same live resource object.

Observers receive copies of:

- stockpile immediately before the income application;
- stockpile immediately after;
- the exact live rate;
- the live frame `dt`;
- the economy inputs used to calculate that rate.

The hook does not alter rates, `dt`, resources, AI choices, randomness or command authority.

### `src/core/economyDriftProbe.js`

Adds a 20 Hz fixed-step shadow.

For every live economy tick it receives the same changing snapshot used by the real game:

- faction;
- workforce;
- allocation shares;
- age;
- living buildings;
- territory bonus;
- upgrade levels.

The shadow integrates those snapshots at 20 Hz while the current game continues to integrate at the render-frame `dt`.

This phase deliberately uses the **live workforce snapshot** at each observation rather than independently simulating population growth. The question being measured here is narrower: does changing the integration cadence alter the resource result when both systems receive the same evolving economy inputs?

Independent fixed-step population authority is a later experiment.

The comparison projects the fixed-step remainder to the current live time so ordinary sub-tick accumulator lag is not misreported as semantic drift.

### External mutation isolation

Player purchases, rewards and other stockpile changes can occur between economy ticks.

Before comparing the next economy step, the probe measures the difference between:

- the previous live post-income stockpile; and
- the next live pre-income stockpile.

That difference is mirrored into the shadow as an external adjustment.

Therefore a build cost or reward is not incorrectly counted as economy integration drift.

### Live inspection

During a Skirmish match:

```js
window.__AXM_RTS_ECONOMY_DRIFT__.report()
```

or through the combined foundation bridge:

```js
window.__AXM_RTS_SKIRMISH_BRIDGE__.economyDrift()
```

The same evidence is included in the replay-observation receipt.

### Channel naming

The current Skirmish loop evaluates player economy before enemy economy. The first two observed resource objects are therefore labelled `player` and `enemy`; any additional future streams receive generic names.

This label is diagnostic only and carries no gameplay authority.

## Probe sanity harness

`economy-drift.html` runs a synthetic probe verification suite.

It checks:

1. variable render-frame cadence with a constant economy produces zero projected drift;
2. external spending is mirrored and does not become false economy drift;
3. a deliberate mid-fixed-tick economy change produces measurable drift, proving the detector is sensitive rather than always returning zero.

`verification.html` treats this page as a semantic verification target.

## Critical truth boundary

A green `economy-drift.html` result validates the **probe mechanics** only.

It does not prove a real Skirmish has zero drift.

Real-match evidence must come from an actual browser play session using `window.__AXM_RTS_ECONOMY_DRIFT__.report()` after economy conditions have changed through normal play.

## Authority state

- live economy authority: **unchanged / variable-step**;
- fixed-step economy: **shadow only**;
- fixed-step population growth: **not authoritative / not independently simulated in this phase**;
- default randomness: **native per-run**;
- global RNG override: **none**;
- replay authority: **observer only**;
- merge authority: **Mike**.

## What must happen before any authority transfer

Run a real browser match and deliberately exercise changing economy inputs:

- change workforce allocation several times;
- construct economy buildings;
- capture and lose strategic territory;
- advance ages;
- research Efficient Supply;
- spend resources on structures and formations;
- allow population growth to change the live workforce snapshots.

Then export the drift receipt.

If drift is non-zero, keep the shadow non-authoritative and use the samples to locate which transition produces it.

If drift remains effectively zero across those transitions, the next experiment may add an **explicit opt-in** fixed-step economy authority mode together with an independently simulated population clock. It should not replace default gameplay until that mode is separately browser-tested and compared against the current behavior.
