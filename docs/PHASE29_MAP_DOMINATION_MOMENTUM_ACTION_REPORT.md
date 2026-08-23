# Phase 29 Action Report

## Implemented

- Added signed Map Domination state with `0%` neutral baseline.
- Calculated domination from live strategic-site control/capture progress rather than only final ownership.
- Made the calculation team-aware using the existing multi-seat team map.
- Added +1% primary economy per full +3% domination.
- Added +1% combat attack per full -1% domination.
- Applied comeback attack to live combat Squads/Founders, not towers.
- Applied comeback attack to extra-seat combat actors where present.
- Kept positive and negative rewards mutually exclusive around zero.
- Added a compact left-HUD Map Domination readout for Player and primary Enemy.
- Added runtime diagnostics/API through `world.__axmMapDominationMomentum` and `window.AXMMapDomination`.

## Existing behavior reused

- `multiSeatMapPatch` already owns final multi-owner/team capture state.
- Strategic sites already expose owner, `captureOwner` and capture progress.
- `FactionRuntime` already restores temporary actor combat stats every tick.
- Phase-26 faction power runtime already restores faction economy baselines before temporary economy effects are reapplied.

## Source-audit repair

The first implementation draft assumed the older two-sided `-100..100` site-progress format. Source audit showed that `multiSeatMapPatch` replaces the map update path and uses `owner + captureOwner + 0..100 progress` instead.

Phase 29 was rewritten before PR to evaluate site control from each owner's/team's perspective and interpolate from current holder to capturing owner. This avoids reporting an enemy capture as positive Player domination and preserves seat-3/seat-4/team semantics.

## Economy scope

The current flat runtime owns resource ledgers for primary `player` and `enemy` only. Therefore:

- primary positive domination can apply the economy multiplier;
- extra seats can receive combat comeback attack but do not receive a fake economy multiplier;
- mirrored primary factions keep the economy component guarded because both sides currently reference one faction economy definition.

## Preservation

- No capture-rate changes.
- No strategic-site ownership rewrite.
- No terrain or route changes.
- No combat interval/range/armor changes.
- No tower comeback damage.
- No faction-power cooldown changes.
- No rain/weather changes.
- No waypoint changes.

## Verification state

Implemented and source-audited on the Phase-29 branch.

Local/browser play remains unverified until Mike/local runs the merged build.

## Local verification targets

1. 0% at match start.
2. Correct sign while Player/Enemy/seat-3/seat-4 capture sites.
3. Correct ally treatment in team games.
4. +3 domination -> +1% economy.
5. -1 domination -> +1% formation/founder attack.
6. +100 domination -> +33% economy first-pass maximum.
7. -100 domination -> +100% attack first-pass maximum.
8. Towers remain unaffected by comeback attack.
9. Phase-26 powers compose without permanent stat/economy drift.
10. HUD displays current Player and Enemy momentum accurately.
