# Phase 22 — Cliff Passability and Ramp Routing

## Goal

Continue Phase 21's terrain geometry into movement without replacing the lightweight RTS movement model with a large navigation system.

The rule is simple:

- ordinary authored relief remains walkable;
- sufficiently steep authored relief is treated as a cliff;
- squads and founders do not walk straight through that cliff;
- movement can route around blocked relief;
- an authored Ramp / Passable Cut surface creates an explicit local passage through steep terrain.

## Shared terrain truth

`src/terrainPassability.js` uses the same `flatHeightAt()` source already used for:

- Phase 17 terrain relief;
- entity grounding;
- strategic-site grounding;
- Phase 21 terrain line of sight.

Passability is therefore derived from authored terrain rather than a second hidden collision map.

## Slope classification

Walkability samples local terrain height around a point and measures the steepest nearby rise/run.

The default maximum walk slope is deliberately centralized in `terrainPassability.js`. A map can optionally supply `environment.maxWalkSlope` if a later authored map needs a different terrain scale.

This phase does not make ordinary hills impassable just because they are elevated. Height alone is not the rule; steepness is.

## Lightweight routing

When a movement target changes:

1. the direct terrain segment is checked once;
2. if clear, normal RTS movement continues unchanged;
3. if blocked, a coarse on-demand route is searched across walkable terrain;
4. the route is simplified into a small waypoint list;
5. that route is cached on the formation until its movement goal changes.

This avoids a permanent global navmesh and avoids rescanning an open-field route every frame.

If no complete route exists, the search can return the closest reachable progress point and the formation stops rather than walking through a cliff.

## Ramp / Passable Cut contract

A ramp is intentionally stored in the existing map `surfacePaint` collection instead of adding a second navigation-only schema.

The Visual Layer now exposes the surface skin:

`Ramp / Passable Cut`

A strip is the normal authoring shape for a ramp. Inside that authored strip, terrain steepness is locally overridden so the same relief can have a deliberate passage.

Advanced/custom map data can also mark a surface with:

- `movementPassage: true`, or
- the `movement-passage` tag.

This keeps built-in maps and exported editor maps on the same JSON contract.

## Shattered Crown example

Phase 22 adds a central steep escarpment to Shattered Crown plus an east/west authored ramp through it.

The purpose is to ensure the new capability exists as real map content rather than as an unused engine helper.

Because Phase 21 LOS already reads the same terrain height, that escarpment also naturally participates in battlefield sight/firing geometry.

## Interaction with Walls / Gates

`terrainMovementPatch.js` is installed after relief grounding and before `fortificationPatch.js`.

That preserves the existing authority chain:

- terrain chooses a legal terrain route;
- the existing Wall/Gate movement blocker still gets the final opportunity to stop that movement;
- hostile wall contact can still redirect a formation onto the fortification target;
- friendly gate behavior remains owned by Phase 19.

This phase does not attempt to merge wall routing and terrain routing into one giant navigation system.

## Systems affected

Terrain-aware movement applies to:

- normal player movement commands;
- founders;
- combat pursuit targets;
- Auto Scout movement targets;
- enemy macro movement that uses the shared world target contract.

## Explicit non-goals

- no navmesh rewrite;
- no decoration/tree/ruin collision routing yet;
- no wall-line path planning beyond the existing blocker behavior;
- no high-ground damage/accuracy/evasion bonus;
- no balance pass;
- no globe movement adapter;
- no claim that the browser/local runtime has been smoke-tested from this chat.

## Local smoke focus

1. normal hills remain traversable;
2. a steep Shattered Crown slope cannot be crossed outside the ramp;
3. a formation ordered across blocked relief routes around it when a route exists;
4. the Shattered Crown Ramp / Passable Cut permits crossing the steep relief;
5. repeated movement toward the same target does not continuously rebuild a route;
6. Auto Scout does not walk directly through a cliff;
7. hostile Wall/Gate collision still behaves as in Phase 19;
8. friendly gate passage remains unchanged;
9. Phase 21 terrain LOS still follows the same relief;
10. Visual Layer export/import preserves ramp surface data.
