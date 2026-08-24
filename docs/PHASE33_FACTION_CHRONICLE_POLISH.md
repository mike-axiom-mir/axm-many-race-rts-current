# Phase 33 — Faction Chronicle Polish

## Goal

Finish the Phase-32 faction stats feature as a usable player-facing loop rather than leaving the persistent ledger hidden behind result-screen snippets and a debug/API surface.

## Faction Chronicle

Adds `faction-stats.html`, a dedicated local career page backed only by the existing Phase-32 match receipt ledger.

The Chronicle provides:

- Human / All controllers / Faction AI / Connected AI filtering;
- All modes / Skirmish / Defend the Workshop filtering;
- faction ordering by matches, wins, win rate, damage or play time;
- unique filtered match count;
- factions used;
- favorite faction by played matches;
- unique tracked match time without double-counting co-op seats;
- faction career cards;
- recent completed-match receipts;
- local JSON export of the existing ledger snapshot;
- visible storage/privacy state.

Faction career cards show grounded Phase-32 aggregates such as matches, W/L, win rate, play time, field damage, direct kills, formations and orders. Map domination, Workshop integrity and wave records appear only where those values were actually recorded.

## Result-screen loop

The compact `Faction History` block on completed-match result screens now links directly to `Faction Chronicle`.

A Phase-32 presentation bug was also fixed: Skirmish result-tab changes redraw the whole result panel. The original history patch could render once, stop polling and then disappear when the player changed tabs. Phase 33 observes the completed result panel and restores the history strip if a tab redraw removes it.

## Main menu polish

The war table now links to Faction Chronicle from both the quick actions and the menu grid.

The stale `EARLY BUILD • PHASE 10` badge was replaced with `EARLY BUILD • ACTIVE DEVELOPMENT` so the front page no longer advertises an obsolete phase number every time the repo advances.

## Truth / privacy

Faction Chronicle:

- reads only `axm.rts.matchStats.v1` from the current browser profile;
- does not upload data;
- does not create telemetry;
- does not create an account/device identifier;
- does not modify match receipts;
- does not alter gameplay, economy, combat, map domination, faction balance or victory logic;
- does not fabricate metrics absent from the ledger.

## Verification boundary

Implemented and source-audited in chat. Browser/local verification is still required for responsive layout, localStorage persistence across reloads/origins, JSON download behavior and the result-tab history restoration path.
