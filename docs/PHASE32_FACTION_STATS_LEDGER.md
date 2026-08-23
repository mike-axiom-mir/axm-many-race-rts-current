# Phase 32 — Persistent Faction Stats Ledger

## Goal

Persist completed-match statistics by the faction actually used in that match, so the new result screens can become long-term faction history rather than disposable one-match summaries.

## Current backend boundary

This repository is currently a static/browser-first runtime and did not contain a server persistence layer before Phase 32.

Phase 32 therefore adds a local persistent backend using browser storage behind a neutral store API. Nothing is uploaded or synchronized externally.

The API is exposed as `window.AXMMatchStats` so a future localhost Workshop service, native wrapper or hosted account backend can consume/mirror the same match receipts without rewriting game instrumentation.

## Storage contract

- key: `axm.rts.matchStats.v1`
- schema version: 1
- maximum retained match receipts: 300
- oldest receipts are removed when the cap is exceeded
- duplicate match IDs are ignored
- malformed/non-finite values are normalized before storage
- unreadable/corrupt storage falls back to an empty ledger instead of blocking the game
- storage failure does not change match outcome/gameplay

## Match-first architecture

Faction totals are not stored as authoritative counters.

Each completed match writes one normalized receipt containing:

- match ID;
- timestamp;
- mode;
- result;
- map / mode context;
- duration;
- team-level grounded metrics;
- participating seat/faction/controller records.

Faction career aggregates are derived from those receipts when queried.

This preserves more truth and gives later schema migrations, re-aggregation, filtering and export a stable source history.

## Skirmish persistence

Normal Skirmish writes one player participation record linked to the selected Player faction.

Persisted data includes the observable Phase-31 metrics:

- result;
- map;
- duration;
- direct field damage;
- direct kills;
- formations fielded/lost/surviving;
- structures fielded/lost;
- explicit macro orders;
- final map-domination value.

No lifetime gathered/spent economy totals are invented because Skirmish still does not expose those totals outside its private game closure.

## Defend the Workshop persistence

A completed co-op run writes one match receipt with each active allied seat represented separately.

Each participant retains:

- seat ID;
- controller type (`human`, `faction-ai`, `connected-ai`, etc.);
- faction ID/name;
- result;
- direct field damage;
- last-hit kills;
- recruited/lost/surviving formations;
- macro orders;
- waves cleared;
- final Workshop integrity.

The match also retains shared-team values such as passive Supply, wave rewards, final Supply, peak hostiles/towers and team damage/kills.

Shared Supply remains team data and is not falsely attributed to one faction/player.

## Controller separation

Controller type is stored on each co-op participation record.

This allows later analysis to distinguish, for example:

- a human playing Ironvale;
- Faction AI playing Ironvale;
- a Connected AI seat playing Ironvale.

`AXMMatchStats.factions({ controller: "human" })` produces human-only faction career aggregates.

## Faction aggregates

The store can derive per-faction:

- matches;
- wins/losses;
- win rate;
- total play time;
- damage;
- kills;
- average damage;
- formations fielded/lost/surviving;
- structures fielded/lost;
- orders;
- waves cleared / best waves cleared;
- average map domination where recorded;
- average Workshop integrity for Defend runs;
- match counts by mode.

## Result-screen history strip

After a completed match, human-controlled factions receive a compact `Faction History` strip on the Phase-31 result screen.

Example:

`Ironvale Compact • 7 matches • 4W / 3L • 57% wins`

This reads the persistent ledger after the current result has been written.

## Public API

`window.AXMMatchStats` exposes:

- `read()` — complete normalized bounded ledger;
- `record(match)` — append one deduplicated receipt;
- `factions(options)` — derive faction aggregates, optionally by mode/controller;
- `overview(options)` — high-level aggregate view;
- `exportSnapshot()` — JSON-ready ledger + aggregate snapshot;
- `storageAvailable()` — storage capability check.

## Preservation / privacy

Phase 32 does not:

- upload stats;
- use cookies;
- create an account identifier;
- add telemetry;
- alter faction balance;
- alter matchmaking;
- alter victory rules;
- alter wave scaling;
- alter economy values;
- change Phase-31 match metrics.

## Verification boundary

Implemented and source-audited in chat. Browser persistence across reloads/origins and result-strip visual fit are not locally/browser smoke-tested here.
