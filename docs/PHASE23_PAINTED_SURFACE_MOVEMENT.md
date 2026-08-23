# Phase 23 — Painted Surface Movement

## Goal

Turn the movement values already present in the shared surface catalog into real flat-Skirmish terrain behavior without adding a second terrain system or a micro-heavy movement mode.

Phase 23 builds directly on Phase 22:

- terrain relief still decides cliff passability;
- Ramp / Passable Cut still opens steep terrain;
- painted surface skins now affect the actual travel speed of squads and founders;
- cliff detour search can compare valid routes using the same surface movement costs.

## Existing authored movement language

The shared `SURFACE_SKINS` catalog already carried movement multipliers before this phase. Phase 23 consumes those existing values rather than inventing a separate balance table.

Current examples include:

- Road — 1.18×
- Meadow — 1.03×
- Grassland — 1.00×
- Dirt — 0.98×
- Ramp / Passable Cut — 0.95×
- Stone — 0.95×
- Farmland — 0.92×
- Forest Floor — 0.90×
- Sand / Ash — 0.88×
- Snow — 0.84×
- Ice — 0.78×
- Shallow Water — 0.55×
- Lava — 0.35×

This is content-first terrain language, not final balance tuning.

## Runtime contract

`src/terrainPassability.js` now exposes shared queries for:

- which painted surface owns a point;
- the movement multiplier at a point;
- sampled movement cost across a segment.

When surfaces overlap, movement uses a deterministic last-authored priority. This is a movement-rule contract only; it does not claim transparent Three.js draw sorting will always make that same surface visually appear on top. Map authors should avoid ambiguous overlap when the visual result matters.

A custom map may supply `movementMultiplier` directly on a surface object. Runtime clamps that value to a bounded range so malformed map data cannot create zero/infinite movement.

## Movement integration

`src/terrainMovementPatch.js` applies the local surface multiplier by scaling movement time passed into the existing movement chain.

This composes with existing formation/faction speed rather than replacing it. The entity also records its current `surfaceSkin` and `surfaceMovementMultiplier` for future HUD/debug use.

No new command is required from the player.

## Routing integration

Open-field movement remains direct and cheap.

The coarse A* route search still only activates when the direct route is blocked by terrain. When it does run, valid detours use travel-time-style cost instead of pure geometric distance, so a reasonable road/ramp route can beat an equally valid swamp/water route.

Route simplification is also surface-cost aware. It only removes intermediate waypoints if the shortcut is not materially slower than the routed chain, preventing simplification from accidentally deleting a useful painted detour.

## Editor contract

No schema fork was added.

The existing Visual Layer `surfacePaint` authoring is still the source of truth. Its guidance now states clearly that those surfaces affect live flat-Skirmish movement.

This means built-in maps and exported custom maps use the same capability.

## Boundaries

- flat Skirmish first;
- no decoration collision/pathfinding in this phase;
- no automatic global road-seeking search for otherwise clear open-field commands;
- no lava damage-over-time or other hazard damage yet;
- no arbitrary high-ground combat stat bonus;
- no globe movement adapter;
- no final balance claim;
- no local/browser runtime-success claim from this chat environment.

## Local smoke focus

1. Road visibly moves formations faster than grass.
2. Shallow Water visibly slows formations.
3. Snow/Ice/Forest/Sand surfaces apply their authored values.
4. Ramp remains passable through Phase-22 steep terrain while using its 0.95× speed.
5. Existing faction/unit speed differences still compose correctly.
6. Wall/Gate movement rollback remains correct after surface-scaled motion.
7. Cliff detours prefer a materially faster valid surface route when available.
8. Surface overlap applies deterministic last-authored movement priority.
9. Auto Scout inherits surface speed without new micro.
10. No unacceptable route-search or frame-time spike appears during local play.
