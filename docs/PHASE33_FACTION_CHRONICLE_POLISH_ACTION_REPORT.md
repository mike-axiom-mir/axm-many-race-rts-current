# Phase 33 Action Report

## Implemented

- Added a dedicated `Faction Chronicle` page for the Phase-32 persistent faction ledger.
- Added controller and mode filters.
- Added faction career ordering by matches, wins, win rate, damage and play time.
- Added unique match/time overview so co-op seats do not double-count team match duration.
- Added faction career cards and recent match receipt history.
- Added local JSON export using the existing stats snapshot API.
- Added visible local-storage/privacy status.
- Linked Faction Chronicle from the main war table.
- Linked completed-match `Faction History` strips to the Chronicle.
- Replaced the obsolete main-menu Phase-10 badge with an active-development label.

## Source-audit repair

- Skirmish result tabs replace the complete result-panel HTML.
- The Phase-32 faction-history strip could therefore disappear after changing result tabs.
- Phase 33 adds a bounded result-panel MutationObserver that restores the strip when a result redraw removes it.

## Preservation

No combat, economy, balance, AI, wave, map, domination, victory or persistence schema values were changed.

## Verification state

Implemented and source-audited only. Browser/local smoke testing remains pending.
