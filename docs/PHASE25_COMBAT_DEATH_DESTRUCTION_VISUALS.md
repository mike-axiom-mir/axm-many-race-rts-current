# Phase 25 — Combat, Death and Destruction Visuals

## Goal

Give the existing RTS combat lifecycle visible motion and aftermath without changing combat balance, HP, damage, pathfinding or line-of-sight rules.

Phase 25 addresses two source-audited gaps in the current flat-Skirmish runtime:

- normal formation combat applies damage through `updateCombat()` but had no attack-state animation tied to the actual attack cadence;
- `removeEntity()` removed dead units and destroyed structures from the scene immediately, leaving no death fall, collapse or wreck state.

## Fighting animation contract

Phase 25 wraps the existing combat update rather than replacing it.

An attack visual is triggered only when the existing combat cooldown resets after a real attack event. The animation therefore follows the current combat cadence instead of running as a decorative loop unrelated to fighting.

### Line

- short forward body lunge;
- stronger weapon swing;
- compact recovery back to the authored formation pose.

### Mobile

- quicker forward surge;
- small vertical lift;
- short lean into the attack.

### Ranged

- small rear recoil/draw motion;
- lighter weapon movement;
- no fake projectile system is added for formation attacks in this phase.

### Siege

- slower equipment-bearing lean;
- heavier weapon/tool motion;
- formation members keep the existing siege equipment visuals underneath.

### Founder

The founder uses the same attack-state trigger but does not translate its gameplay root position. Founder combat motion is rotation/weapon-only so visual animation cannot alter pathing or combat distance.

## Defensive-building firing motion

The existing `DefenseSystem` already creates real tower projectiles.

Phase 25 wraps the tower fire event and adds:

- brief structure recoil;
- a short-lived muzzle flash at the same launch height used by the existing projectile system.

Projectile speed, damage, collision and LOS remain unchanged.

## Unit death

When a Squad or Founder reaches zero HP:

1. the entity is removed from the live gameplay entity list immediately through the existing removal path;
2. the same visual model is transferred to a dedicated effects group;
3. formation members fall with small staggered timing differences;
4. the dead model fades out;
5. geometry/material resources are disposed after the effect finishes.

Because the entity is no longer in `world.entities`, the death pose does not remain targetable, block movement or influence victory/economy logic.

The current RTS health model is formation-level, not per-soldier HP, so the whole formation enters the death sequence when the formation entity dies.

## Building and capital destruction

Destroyed structures now have a two-stage visual lifecycle.

### Collapse

The original building visual is removed from gameplay immediately, then temporarily reused only as a visual effect:

- materials darken/char;
- the structure compresses and leans;
- Capitals collapse more slowly than ordinary buildings;
- Wall/Gate segments use a shorter collapse.

### Wreck

After the collapse, the expensive full structure model is disposed and replaced with a lightweight low-poly wreck:

- collapsed slab/foundation;
- deterministic rubble pieces based on source id/position;
- dark faction-derived material language;
- smoke wisps;
- small ember pieces.

Wreck duration is longer for Capitals, moderate for buildings and shorter for Walls/Gates. Wrecks fade before final disposal.

Wrecks are visual-only. They are deliberately absent from `world.entities`, so they do not restore destroyed collision or LOS blocking.

## Fog-of-war compatibility

Combat aftermath must not reveal information through fog.

Phase 25 stores the destroyed entity owner and battlefield point with each effect. Enemy/hostile death effects use the existing Fog-of-War visibility query:

- an off-screen death does not reveal itself;
- if the player later gains current vision over that point while the wreck still exists, the aftermath can become visible;
- friendly/allied effects follow the existing friendly-visibility contract.

This avoids turning wreck smoke into an information leak.

## Reset lifecycle

The dedicated combat/death effects group is cleared during `resetDynamic()` so Restart/new-match state cannot retain corpses, smoke or rubble from the previous battle.

## Source-audit repairs

### Founder root movement

The first attack draft treated the Founder like a child soldier and would have translated the Founder root during the lunge. That root is the gameplay entity itself. The attack code was repaired so root founders only rotate/swing during attack motion.

### Attack direction

The world movement convention uses local positive Z as forward for the current `rotation.y = atan2(delta.x, delta.z)` orientation. The first visual draft used the opposite lunge sign. The role motions were corrected so Line/Mobile/Siege surge forward and Ranged recoil backward.

### Fog-safe wrecks

A fixed `visible` snapshot would either leak off-screen deaths or keep a wreck invisible forever. Effects now consult the live fog visibility query while they exist.

### Tower death during recoil

A defense building can theoretically be destroyed while its fire recoil is active. Phase 25 restores its baseline visual transform before starting the collapse so wreck generation does not inherit a temporary recoil scale.

## Boundaries

- flat Skirmish runtime first;
- visual lifecycle only;
- no combat-stat changes;
- no projectile-stat changes;
- no per-soldier damage model;
- no persistent gameplay rubble collision;
- no new pathfinding or LOS rule;
- no local/browser runtime-success claim from this chat environment.

## Local smoke focus

1. Line units visibly lunge only when an attack actually fires.
2. Ranged units recoil without drifting their formation position.
3. Mobile and Siege attack poses remain readable with Phase-24 equipment.
4. Founder attack animation never changes the founder's gameplay position.
5. Defense towers recoil and flash exactly when their existing projectile is created.
6. Dead squads fall/fade without remaining targetable.
7. Buildings char/collapse and leave rubble without blocking movement or LOS.
8. Wall/Gate wrecks do not keep the old fortification collision/LOS authority.
9. Capital destruction remains visible long enough to read as a major event.
10. Off-screen hostile wrecks do not leak information through Fog of War.
11. Moving vision onto a recent wreck location can reveal it while it still exists.
12. Restart clears every corpse/wreck/smoke effect.
13. Large battles do not accumulate unacceptable geometry or material cost.
