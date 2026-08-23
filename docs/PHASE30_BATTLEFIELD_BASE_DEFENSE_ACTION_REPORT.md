# Phase 30 Action Report

## Implemented

- Added `battlefieldBaseApproachPatch.js` before map visual construction.
- Added active-start base courts with visual-only movement multiplier `1.0`.
- Added short Road approach/muster lanes toward each map's strategic center.
- Added neutral flank watch markers, banner and rear campfire landmarks around live bases.
- Added base-defense sector metadata for future map/editor reuse.
- Added `baseDefenseCoordinationPatch.js` after the existing combat/multi-seat/momentum stack.
- Linked defense towers within 18 units of the nearest friendly-team capital.
- Changed only linked-tower target priority; raw tower stats are untouched.
- Added priority weight for hostile formations closest to the protected capital.
- Added additional priority for Siege formations and formations already committed toward the capital.
- Added a shared weak emergency capital garrison: 9.2 range, 12 damage, 1.9 second cadence.
- Reused DefenseSystem projectile and fortification LOS behavior.
- Added compact player Base Defense HUD with status, linked tower count and nearby threat count.
- Applied the same emergency capital garrison rule to primary and multi-seat capitals.

## Source-audit repairs

1. **Inactive start clutter** — the first map pass considered every authored `playerStarts` entry. It now prefers `runtimeStarts`, so unused seats on larger maps are not decorated like live bases.
2. **Capital tower-recoil state** — Phase 25's `DefenseSystem.fire()` hook adds a tower recoil marker to every firing source, but its animator intentionally advances only defense buildings. Capital garrison shots now clear that marker after the existing muzzle-flash/projectile hook runs.
3. **LOS preservation** — base coordination reuses `firstLineOfSightBlocker`; no tower or capital is allowed to shoot through walls/closed fortification blockers merely because the base is under pressure.
4. **No hidden court buff** — the base court explicitly uses movement multiplier `1.0`; only the visible short Road strip uses the existing road movement rule.
5. **Team-aware coordination** — linked towers resolve the nearest friendly-team capital instead of assuming only Player/Enemy ownership.

## Preserved

- Existing faction-specific tower damage/range/fire cadence.
- Existing wall/gate durability and collision.
- Existing symmetric fortification LOS.
- Siege bonus versus structures.
- Phase 26 faction powers.
- Phase 27 rain.
- Phase 28 combat waypoint.
- Phase 29 map domination momentum.
- Fog of War.
- Terrain/pathfinding algorithms.
- Unit/building costs.

## Explicit non-goals

- No free militia spawning.
- No automatic wall ring.
- No tower HP/damage inflation.
- No base invulnerability/shield.
- No global defender attack buff.
- No projectile accuracy modifier.
- No automatic repair aura.
- No new micro targeting controls.

## Verification state

Implemented and source-audited on the Phase-30 branch.

No local/browser gameplay verification is claimed.

## Local verification targets

1. base visual treatment appears at every live start only;
2. base road points toward meaningful strategic interior ground;
3. court movement remains exactly neutral;
4. linked tower count updates as defense buildings are built/destroyed;
5. linked towers prefer core/Siege threats but still require range + LOS;
6. non-linked towers retain old nearest-target behavior;
7. capitals fire only inside the 9.2 range;
8. capital garrison projectile is weak enough not to erase successful pushes;
9. garrison and linked towers respect own wall/gate fire blocking;
10. capital shots show the existing muzzle flash without stale recoil state;
11. extra-seat capitals receive the same garrison rule;
12. Base defense HUD does not reveal remote enemy information;
13. performance remains acceptable in large multi-seat fights.
