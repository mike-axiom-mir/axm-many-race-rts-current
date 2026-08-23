# Phase 21 — Terrain / High-Ground Line of Sight

## Goal

Extend the Phase-20 wall line-of-sight rule to authored flat terrain without turning high ground into a one-way combat bonus.

The rule is geometric and symmetric:

- terrain can block vision and fire when it physically crosses the line between observer/shooter and target;
- being on high ground does not make a unit immune to return fire;
- if the line from the low unit to the high unit is unobstructed, both directions are valid;
- a separate ridge or cliff mass between them blocks both directions.

## Shared battlefield LOS

`src/battlefieldLineOfSight.js` now owns the complete flat-battlefield LOS contract.

It evaluates:

1. closed Wall / Gate intersections;
2. authored terrain height along the ray;
3. the first obstruction along the firing / vision line.

`src/fortificationLineOfSight.js` remains as a compatibility entrypoint so Phase-20 combat, towers and fog automatically consume the expanded battlefield LOS rule rather than growing three different implementations.

## Terrain sampling

The terrain ray uses the same `flatHeightAt()` source that grounds:

- formations;
- buildings;
- strategic sites;
- map visual relief.

The line is sampled between source and target firing/eye heights. If terrain reaches that interpolated line, LOS is blocked.

Small endpoint regions are skipped so a formation standing on a slope does not block itself with its own ground surface.

## Eye / firing heights

The LOS contract uses simple role-aware heights above local ground:

- Capital — high observation point;
- defensive tower — elevated firing point;
- ordinary building — medium observation point;
- founder — human-scale eye line;
- normal formation — formation eye/fire line;
- Siege — slightly elevated weapon line;
- Wall/Gate — low fortification reference height.

This is intentionally lightweight and readable rather than a per-soldier ballistic simulation.

## Examples

### High ground firing down

A formation on top of a hill can fire at a lower formation if the downhill terrain remains below the straight line connecting their firing heights.

The lower formation can fire back along the same geometric line.

### Ridge between armies

Two formations on low ground cannot fire or see through a high ridge if the ridge crosses their LOS line.

### Two elevated positions

Two hills do not automatically see each other. If a taller ridge lies between them, the ridge blocks both.

### Walls + terrain

Walls and terrain participate in the same query. The first real obstruction along the line controls the result.

## Systems affected automatically

Because existing Phase-20 consumers keep using the compatibility LOS entrypoint, terrain now affects:

- formation target acquisition;
- Ranged fire;
- Siege fire;
- tower target acquisition;
- projectiles in flight;
- current fog-of-war vision;
- scout vision.

Previously explored ground still remains mapped according to the fog contract.

## Strategic effect

High ground becomes useful because it can create clear firing / observation lines over lower terrain, not because it receives an arbitrary damage or invulnerability bonus.

Ridges and cliffs become natural:

- sight blockers;
- approach screens;
- ambush separators;
- positional objectives;
- reasons to scout around terrain rather than simply reading the whole map.

## Boundaries

- flat Skirmish first;
- terrain LOS uses authored height relief, not mesh triangle raycasting;
- this phase does not add a high-ground damage/accuracy bonus;
- this phase does not claim full cliff-aware pathfinding or climb restrictions;
- globe/spherical terrain LOS remains separate future work;
- no successful local/browser smoke run is claimed from this chat environment.

## Local smoke focus

1. low-to-low shot across a hill is blocked;
2. hilltop-to-low shot is clear when the slope falls away;
3. low-to-hilltop return shot is also clear;
4. a higher intervening ridge blocks two elevated formations;
5. towers obey terrain LOS;
6. fog creates terrain vision shadows;
7. scouts reveal around a ridge only after moving to a clear angle;
8. projectiles do not visually pass through blocking terrain;
9. Phase-20 Wall/Gate LOS remains unchanged.
