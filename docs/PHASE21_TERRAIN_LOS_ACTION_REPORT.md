# Phase 21 Action Report

## Implemented

- Added one shared flat battlefield LOS helper combining fortification occlusion and authored terrain height.
- Preserved the Phase-20 fortification import surface as a compatibility wrapper so existing formation combat, towers, projectiles and fog consume terrain LOS automatically.
- Added role-aware eye / firing heights for capitals, towers, ordinary buildings, founders, formations and Siege.
- Terrain sampling uses the same `flatHeightAt()` source as live grounding and authored map relief.
- Raw projectile positions keep their actual current Y so in-flight shots can collide with terrain instead of being reprojected to ground eye height.
- The first obstruction along the line wins when terrain and a fortification both intersect the same shot.
- High-ground exchange remains symmetric: clear geometric LOS permits fire in both directions.

## Explicit non-goals

- No arbitrary high-ground damage, accuracy or evasion bonus.
- No one-way high-ground immunity.
- No new balance tuning.
- No cliff-aware movement/pathfinding changes.
- No globe LOS adapter.
- No local/browser runtime success claim from this environment.

## Local verification targets

1. low-to-low fire across raised relief is blocked;
2. hilltop-to-low fire works when the slope falls below the line;
3. the low unit can return fire along the same clear line;
4. a taller intermediate ridge blocks both directions;
5. fog produces terrain shadows;
6. towers and scouts use the same result;
7. an in-flight projectile disappears on blocking relief rather than crossing through it;
8. Wall/Gate LOS behavior from Phase 20 is unchanged.
