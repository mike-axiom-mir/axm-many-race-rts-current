# Phase 28 Action Report

## Implemented

- Added a mobile-friendly All Combat command in the left HUD.
- Added one persistent army waypoint rather than a waypoint chain.
- Added All Combat → Map: arm one battlefield tap, move the waypoint and order all current combat actors.
- Added Go To Waypoint: explicitly reissue the saved waypoint to the current combat roster.
- Added loose formation offsets around the waypoint so the army does not intentionally stack on one exact coordinate.
- Added economy/civilian exclusion at command time.
- Added a spawn adapter that propagates future economy/civilian unit tags from unit definitions onto live squads.
- Added a small persistent low-poly waypoint marker with pulsing ring and pennant.
- Kept the controls in the left HUD so they remain available in the current mobile layout.
- Added build-placement interop by using the existing Escape cancellation path when All Combat is armed.
- Added cancellation of an armed map tap when the player chooses another unrelated button.
- Added an active-world bridge for the optional macro helpers used by this adapter.

## Source behavior reused

- Ground-click input already routes through `world.hooks.onGroundClick`, so the waypoint adapter intercepts only when its own one-tap mode is armed and otherwise returns control to existing building placement.
- The movement stack already routes each actor toward its `userData.target`; waypoint orders use that existing contract.
- Terrain routing, surface multipliers, support effects, faction speed, Phase-26 powers and Phase-27 rain remain downstream of the waypoint order.
- `game.js` already exposes Escape as the supported construction-placement cancellation interaction; Phase 28 uses that instead of reaching into private closure state.

## Economy exclusion contract

Current economy actors are abstract workforce rather than visible workers, but Phase 28 recognizes explicit future tags including economy, worker, civilian, villager, gatherer, trader, merchant and laborer/labourer classifications.

Combat-role units such as Line, Ranged, Mobile, Siege, Support and Scout remain eligible unless explicitly tagged as economy/civilian.

## Preservation

- No damage/armor/range changes.
- No formation cost changes.
- No terrain/pathfinding algorithm rewrite.
- No faction-power changes.
- No weather changes.
- No multi-waypoint queue.
- No automatic new-unit rally behavior.
- No per-unit micro controls.

## Verification state

Implemented and source-audited on the Phase-28 branch.

Local/browser interaction remains unverified until Mike/local runs the merged build.

## Local verification targets

1. All Combat → Map is reachable on desktop and mobile HUD layouts.
2. Arming it visibly changes state to TAP MAP.
3. One battlefield tap moves the waypoint and orders all current combat actors.
4. Economy/civilian-tagged actors do not receive the target.
5. Go To Waypoint reissues the saved target to current combat units.
6. Newly trained combat units stay home until Go To Waypoint or a new All Combat map order is explicitly used.
7. Construction placement cancels cleanly when All Combat is armed.
8. Other button presses cancel an armed army tap.
9. Moving units still route around cliffs and inherit surfaces/rain normally.
10. Reset/new match clears the saved waypoint and armed state.
