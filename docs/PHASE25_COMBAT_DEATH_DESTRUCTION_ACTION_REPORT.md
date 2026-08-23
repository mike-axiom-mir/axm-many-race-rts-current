# Phase 25 Action Report

## Implemented

- Added `src/combatDeathVisualPatch.js` as a visual lifecycle layer after the existing battle/defense systems.
- Formation attack poses now trigger from the real combat cooldown reset rather than an unrelated idle loop.
- Added distinct Line, Ranged, Mobile and Siege attack motion.
- Added Founder attack motion without translating the Founder gameplay root.
- Wrapped `DefenseSystem.fire()` with tower recoil and muzzle flash while preserving the existing projectile implementation.
- Wrapped `removeEntity()` so gameplay removal remains immediate while the removed visual can finish a death/collapse effect outside `world.entities`.
- Added staggered Squad death falls and fade-out.
- Added Founder fall/fade behavior.
- Added charred structure collapse for Buildings, Capitals and fortifications.
- Added lightweight deterministic rubble, smoke and embers after structure collapse.
- Added different aftermath lifetimes for Capitals, ordinary Buildings and Walls/Gates.
- Kept wrecks out of gameplay entity lists so destroyed structures remain non-blocking and non-targetable.
- Made death/wreck effects consult the existing Fog-of-War current-visibility query.
- Added reset cleanup for corpses, wrecks, smoke and muzzle flashes.

## Existing behavior confirmed before build

- `world.js` already had generic continuous weapon swing/decoration motion and movement bounce.
- `combatDepthPatch.js` already handled the real formation attack cadence and direct damage application.
- `DefenseSystem` already handled defensive-building projectiles and their damage/LOS behavior.
- `removeEntity()` removed dead entities from the live array and scene immediately, which explained why no death/wreck visuals persisted.

## Source-audit repairs

1. **Founder root translation** — first draft could have translated the actual Founder gameplay entity during an attack lunge. Founder root position is no longer modified by the attack visual.
2. **Attack direction** — local positive Z is forward under the runtime rotation convention. Line/Mobile/Siege lunge signs were corrected and Ranged recoil was reversed accordingly.
3. **Fog-safe aftermath** — fixed-snapshot visibility was replaced with live Fog-of-War point visibility for hostile corpses/wrecks.
4. **Tower recoil into death** — structure destruction restores an active tower recoil transform before collapse so rubble does not inherit a temporary compressed scale.

## Preserved

- Unit and building HP/damage/cost values.
- Combat-role multipliers and armor.
- Attack intervals.
- Existing tower projectile speed/damage/lifetime.
- Phase-20/21 LOS.
- Phase-22 cliff movement.
- Phase-23 surface movement.
- Phase-24 visual-depth geometry.
- Wall/Gate gameplay removal behavior.
- Existing victory/destruction hook invocation through the original `removeEntity()` path.

## Explicit non-goals

- No per-soldier HP or individual casualty simulation.
- No gore.
- No persistent gameplay rubble collision.
- No new projectile mechanics for normal formations.
- No balance changes.
- No local/browser runtime-success claim from this environment.

## Verification state

Implemented and source-audited on the Phase-25 branch.

Local/browser rendering, clipping, timing feel and performance are still unverified until Mike/local runs the merged build.

## Local verification targets

1. attacks animate at real attack cadence;
2. unit motion does not alter formation gameplay position;
3. Founder combat position remains invariant;
4. tower flash/recoil matches projectile creation;
5. squad/founder death effects finish and dispose;
6. buildings/capitals visibly collapse before becoming rubble;
7. destroyed Wall/Gate visuals do not preserve collision or LOS;
8. enemy wrecks obey current Fog-of-War visibility;
9. Restart removes all combat aftermath;
10. repeated large fights do not produce unacceptable performance/memory growth.
