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

## Gameplay truth vs visual aftermath

Destroyed gameplay entities remain destroyed immediately.

`removeEntity()` still performs the authoritative removal first:

- the entity leaves `world.entities`;
- its scene parent remains `null` after removal;
- the existing destruction/victory hook still runs exactly through the original removal path.

Phase 25 never re-parents the original destroyed entity. It samples its position, ownership and coarse visual identity, builds a lightweight visual-only proxy in the effects group, then disposes the original render resources.

This matters because existing game code sometimes uses an entity reference's `parent` as a fast "still present" signal. Re-parenting the original corpse or destroyed building would have silently made that gameplay signal true again.

## Unit death

When a Squad or Founder reaches zero HP:

1. the real entity is removed from gameplay immediately;
2. a lightweight death proxy is created at its last battlefield position;
3. Squad proxies preserve the formation members' last local placement closely enough for the death to read as the same formation;
4. proxy soldiers fall with small staggered timing differences;
5. the proxy fades and is disposed.

Because only the proxy enters the effects group, the death pose cannot become targetable, restore collision, alter movement logic or influence victory/economy state.

The current RTS health model is formation-level, not per-soldier HP, so the whole formation enters the death sequence when the formation entity dies.

## Building and capital destruction

Destroyed structures use a two-stage visual-only proxy lifecycle.

### Collapse proxy

After authoritative gameplay removal, Phase 25 creates a cheaper charred silhouette representing the destroyed structure:

- Capitals use a coarse base/keep/roof proxy;
- ordinary Economy/Military buildings use a hall/roof proxy;
- defensive buildings use a tower/crown proxy;
- Walls/Gates use fortification-shaped proxy geometry;
- the proxy compresses, darkens visually and leans during collapse.

Capitals collapse more slowly than ordinary buildings, while Wall/Gate collapse is shorter.

The original structure itself stays detached and is disposed; it is never placed back into the scene.

### Wreck

After the collapse proxy finishes, it is disposed and replaced with an even lighter low-poly wreck:

- collapsed slab/foundation;
- deterministic rubble pieces based on source id/position;
- dark faction-derived material language;
- smoke wisps;
- small ember pieces.

Wreck duration is longer for Capitals, moderate for buildings and shorter for Walls/Gates. Wrecks fade before final disposal.

Wrecks are deliberately absent from `world.entities`, so they do not restore destroyed collision, targetability or LOS blocking.

## Fog-of-war compatibility

Combat aftermath must not reveal information through fog.

Phase 25 stores the destroyed entity owner and battlefield point with each effect. Enemy/hostile death effects use the existing Fog-of-War visibility query:

- an off-screen death does not reveal itself;
- if the player later gains current vision over that point while the effect still exists, the aftermath can become visible;
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

A defense building can theoretically be destroyed while its fire recoil is active. Phase 25 restores its baseline visual transform before sampling the destruction state so the collapse does not inherit a temporary recoil scale.

### Destroyed-entity parent truth

A PR-level audit found that existing gameplay code can retain building references and use `building.parent` as a fast existence check. The first aftermath design would have re-parented the original destroyed entity into an effects group, temporarily making that check true again.

That design was replaced before merge: only lightweight visual proxies enter the effects group. Original destroyed entities remain parent-null after authoritative removal.

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
6. Dead squads fall/fade without the original entity regaining a scene parent.
7. Buildings char/collapse through proxies and leave rubble without blocking movement or LOS.
8. Destroyed reinforcement-point buildings remain parent-null and cannot be reused as live muster anchors.
9. Wall/Gate wrecks do not keep the old fortification collision/LOS authority.
10. Capital destruction remains visible long enough to read as a major event.
11. Off-screen hostile wrecks do not leak information through Fog of War.
12. Moving vision onto a recent wreck location can reveal it while it still exists.
13. Restart clears every corpse/wreck/smoke effect.
14. Large battles do not accumulate unacceptable geometry or material cost.
