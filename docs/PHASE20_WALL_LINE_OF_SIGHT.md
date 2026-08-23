# Phase 20 — Opaque Walls / Real Line of Sight

## Goal

Make walls a positional tradeoff rather than a ranged-turtle amplifier.

A fortification now blocks line of sight through its footprint. The rule is symmetric: owning the wall does not let you shoot or see through it.

## Core rule

For flat Skirmish:

- closed Wall segments block formation targeting through them;
- closed Gates block targeting through them;
- defensive towers cannot acquire targets through an opaque Wall/Gate;
- Siege does not arc over Walls;
- friendly ranged formations cannot fire outward through their own closed perimeter;
- enemy ranged formations cannot fire inward through that perimeter;
- hostile Walls/Gates remain valid targets themselves;
- moving around the end of a wall creates a valid firing angle;
- an open Gate creates a valid firing/vision gap.

This deliberately removes the classic "ranged deathball safely firing over cheap walls" pattern.

## Fog / information

The same line-of-sight helper is used by fog of war.

- Walls create current-vision shadows behind them.
- Previously explored terrain remains mapped but dim.
- Enemy entities behind an opaque fortification disappear when no friendly observer has another clear line.
- Enemy Wall/Gate structures themselves can still be seen from the visible side because the target fortification is not treated as blocking sight to itself.
- Wall and Gate segments provide no vision by themselves.
- Explicit defensive sight ranges continue to work, but are clipped by Walls.

## Gates

Gates open when friendly/allied formations approach, reusing the Phase-19 gate animation state.

While open:

- friendly units can pass;
- line of sight can pass through the opening;
- both sides can potentially exploit that firing lane.

That makes opening a Gate a tactical choice/cost rather than a free one-way loophole.

## Projectiles

Tower target acquisition requires clear line of sight. A tower will not launch a new projectile through a Wall.

If a Gate closes or another fortification becomes the blocker while a tower projectile is already in flight, the projectile is intercepted at the blocker instead of passing through it. Hostile blockers can take the intercepted impact; friendly blockers absorb it without friendly-fire damage.

## Relationship with Siege

Siege retains its existing +85% structure multiplier. The intended breach loop is:

1. approach the opaque perimeter;
2. target/break a Wall or Gate, or route around it;
3. create clear line of sight;
4. only then can ranged formations/towers/siege engage targets behind the former obstruction.

The Wall therefore redirects or delays an assault but does not let defenders safely shoot over it.

## Deliberate boundaries

- This is flat-Skirmish first, matching the existing Wall/Fog implementation.
- It is lightweight 2D fortification LOS, not height-aware ballistic simulation.
- Terrain hills do not yet independently occlude line of sight.
- Complex navmesh maze-solving remains out of scope; Phase-19 movement blocking still handles readable wall lines/chokes.
- No successful local/browser smoke run is claimed from this chat environment.

## Local smoke targets

1. Put archers behind a closed friendly Wall: they should not acquire enemies directly beyond it.
2. Put a tower behind the same Wall: it should stay silent until it has another clear angle.
3. Put enemy archers outside: they should not acquire defenders behind the Wall.
4. Approach with Siege: Siege should target/break the blocking structure, not damage targets behind it.
5. Open a Gate with a friendly formation: visibility and fire should be able to use the gap.
6. Close the Gate: the firing lane should disappear again.
7. Walk around a Wall end: targets should become valid without destroying the Wall.
8. Verify fog shadow/minimap enemy visibility tracks the same LOS rule.
