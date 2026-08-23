# Phase 22 Action Report

## Implemented

- Added shared terrain passability derived from `flatHeightAt()` rather than a second hidden terrain map.
- Added local steepness classification so ordinary relief can remain walkable while steep relief blocks squads and founders.
- Added a bounded coarse route search for movement goals whose direct path crosses blocked terrain.
- Added route simplification and per-target caching so normal open movement does not perform terrain path searches every frame.
- Added unreachable-goal behavior that stops at reachable terrain rather than permitting cliff traversal.
- Added `Ramp / Passable Cut` to the existing surface catalog and Visual Layer workflow.
- Ramp surface areas locally override steepness and therefore act as explicit map-authored passages.
- Added a Shattered Crown central escarpment plus ramp example as live built-in content.
- Preserved selected-map `DEFAULT_MAP` mutation so terrain LOS, grounding, visuals and movement continue reading the same selected map.
- Installed terrain-aware movement before the existing fortification movement wrapper so Wall/Gate blocking retains its current authority.
- Updated Visual Layer guidance to state that ramp paint now has a real movement effect.

## Source-audit repair

During review, route reconstruction was corrected to preserve the guaranteed-reachable entry grid point before route simplification. This prevents the simplifier from accidentally skipping the safe connection between the exact formation position and its first searched grid node.

## Explicit non-goals

- No engine-wide navmesh.
- No tree/ruin/decorative collision routing.
- No rewrite of Wall/Gate routing.
- No high-ground combat-stat bonus.
- No faction, roster or upgrade redesign.
- No globe movement adapter.
- No final balance claim.
- No local/browser runtime success claim from this environment.

## Verification state

Source inspected and PR diff audited.

No GitHub Actions workflow ran for the PR head, and this chat did not execute the game in a local browser/runtime.

## Local verification targets

1. normal relief remains walkable;
2. steep terrain blocks movement outside a passage;
3. formations route around a blocked slope when a route exists;
4. Ramp / Passable Cut allows intentional cliff crossing;
5. Shattered Crown's authored escarpment/ramp behaves coherently;
6. Auto Scout obeys the same terrain rule;
7. walls and gates retain Phase-19 movement behavior;
8. Phase-21 LOS remains unchanged except for the new authored Shattered Crown relief;
9. Visual Layer import/export preserves ramp surfaces;
10. no visible movement jitter or unacceptable route-search spikes appear during local play.
