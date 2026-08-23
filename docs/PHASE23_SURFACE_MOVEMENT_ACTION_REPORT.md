# Phase 23 Action Report

## Implemented

- Activated the movement multipliers that already existed in the shared surface-skin catalog.
- Added shared surface ownership and point-speed queries to the Phase-22 terrain passability module.
- Added bounded custom `movementMultiplier` support for exported/custom map surfaces.
- Applied the local surface multiplier to squads and founders through the existing movement wrapper chain rather than replacing unit/faction speed.
- Recorded `surfaceSkin` and `surfaceMovementMultiplier` on moving entities for future HUD/debug use.
- Made cliff-detour A* cost surface-aware so valid detours can distinguish fast and slow painted terrain.
- Made route simplification surface-cost aware so it does not casually erase a worthwhile faster detour.
- Kept direct open-field commands direct; Phase 23 does not run a global road-seeking path search for every normal move order.
- Updated the Visual Layer guidance so map authors know painted surfaces now have live movement meaning.

## Preserved

- Phase-21 geometric terrain LOS.
- Phase-22 steep-terrain blocking and Ramp / Passable Cut behavior.
- Existing Wall/Gate blocking wrapper order.
- Existing faction/unit speed differences.
- Existing AXM `surfacePaint` map schema.
- No high-ground combat-stat bonus.

## Source-audit repairs

The first cost-aware route version still used the old passability-only simplifier. Source review caught that it could shortcut across a slower surface after A* had selected a better painted detour. The simplifier was repaired to compare sampled travel cost and preserve a routed chain when the shortcut is materially slower.

A second review corrected an overclaim in the overlap documentation: movement priority is deterministically last-authored, but transparent Three.js draw sorting is not claimed to use that exact priority.

## Explicit non-goals

- No decoration collision routing.
- No always-on full navigation mesh.
- No automatic road seeking for otherwise unobstructed open terrain.
- No lava/hazard damage system yet.
- No final balance tuning.
- No globe movement adapter.
- No local/browser runtime-success claim from this chat environment.

## Verification state

Implemented and source-audited on the Phase-23 branch.

Local/browser play remains unverified until Mike/local runs the merged build.

## Local verification targets

1. Road gives a visible speed increase.
2. Shallow Water gives a strong visible slowdown.
3. Snow/Ice/Forest/Sand/Ash/Farm/Stone values compose correctly.
4. Ramp remains a passable steep-terrain cut.
5. Unit/faction speed identities are preserved rather than overwritten.
6. Wall collisions still roll movement back correctly.
7. Auto Scout inherits surface movement automatically.
8. Cliff detours remain stable and do not jitter between surface choices.
9. Surface overlaps apply deterministic last-authored movement priority.
10. Performance remains acceptable with several formations moving at once.
