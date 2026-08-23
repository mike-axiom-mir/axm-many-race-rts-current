# Phase 30 — Battlefield & Base Defense

## Goal

Improve the battlefield around each active base and make base defense behave more intelligently without creating an unbeatable turtle.

Phase 30 deliberately avoids broad HP/damage inflation. The new defensive value comes from readable approach geometry, threat prioritization and a weak last-resort capital garrison.

## Battlefield base approaches

Every active flat-map start now receives a small authored base approach layer before the map visuals are built.

Each live base gets:

- a subtle neutral-toned **base court** around the start;
- one short **road/muster lane** pointed toward the strategic center of the map;
- two flank watch markers;
- a small banner and rear campfire landmark;
- metadata describing the base-defense sector.

The base court uses a movement multiplier of exactly `1.0`, so it is visual/readability terrain rather than a hidden movement buff.

The road uses the existing Road surface rules, including its existing movement behavior. That means defenders can reinforce outward faster, but an attacker who reaches and controls the same road can use it too.

Only runtime-active starts are enriched. Empty authored seats on larger maps are not decorated as if they were active bases.

## Base-defense coordination

A defense tower is treated as linked to a base when it is within **18 world units** of the nearest friendly-team capital.

Linked towers keep their existing faction-specific:

- damage;
- range;
- reload cadence;
- projectile speed;
- armor;
- HP;
- Line of Sight rules.

Phase 30 changes only target priority.

Instead of always firing at the nearest legal target, a linked tower now weighs:

1. how close the hostile formation is to the protected capital;
2. how close it is to the tower;
3. whether it is a **Siege** formation;
4. whether its current movement target is already committed toward the capital.

This lets a defensive cluster react to the actual breach instead of wasting all of its fire on a less important nearby formation.

LOS remains authoritative. Walls, closed gates and other existing fortification blockers can still prevent the tower from firing through them.

## Emergency capital garrison

Every living capital now has a shared neutral last-resort garrison shot:

- range: **9.2**;
- damage: **12**;
- fire interval: **1.9 seconds**;
- projectile speed: **14**;
- projectile lifetime: **1.65 seconds**.

The garrison uses the existing DefenseSystem projectile path and LOS checks.

It only attacks hostile Squads/Founders that actually enter the short garrison range. It does not attack hostile structures and it does not turn the capital into a long-range tower.

The shot is intentionally much weaker than the stronger faction defense towers. Its purpose is to make a capital breach feel defended and give a routed defender a small final response window, not to erase a successful push.

## Visual interoperability

Phase 25 already adds tower-fire recoil and muzzle flashes through `DefenseSystem.fire()`.

Capital garrison shots reuse the muzzle-flash/projectile path, but Phase 30 clears Phase 25's tower-only recoil marker after a capital fires because the existing recoil animator intentionally advances only `building/defense` entities.

This prevents stale visual state on capitals without changing the existing tower animation system.

## HUD

The left HUD now gains a compact **Base defense** block showing:

- `READY`, `ALERT` or `OFFLINE`;
- the number of linked friendly defense towers near the player capital;
- the number of hostile combat actors inside the 16-unit base alert radius.

This is informational only; there is no new micro button or manual targeting mode.

## Multi-seat behavior

The defensive logic is team-aware.

- towers can coordinate around the nearest friendly-team capital;
- every living capital, including extra seats, receives the same emergency garrison rule;
- hostile/team checks use the current multi-seat team map;
- the player HUD only reports the primary Player capital so it does not leak enemy/fog information.

## Preservation

Phase 30 does **not** change:

- wall/gate HP;
- defense tower raw stats;
- capture rates;
- map domination values;
- faction powers;
- rain weather;
- formation costs;
- terrain routing algorithms;
- fog-of-war rules;
- wall/gate LOS blocking;
- Siege structure bonus;
- the All Combat waypoint behavior.

## Local smoke focus

1. live bases have a readable court/road/landmark treatment;
2. unused large-map spawn slots are not falsely decorated as active bases;
3. the base court itself has no movement modifier;
4. the short base road uses normal Road movement for both attackers and defenders;
5. defense towers farther than 18 units from a friendly capital retain normal nearest-target behavior;
6. linked defense towers prioritize Siege/core threats while still respecting LOS;
7. a capital fires only once hostiles enter the 9.2-unit emergency range;
8. the capital garrison does not attack buildings;
9. own walls/closed gates can still block garrison/tower fire;
10. the Base defense HUD reports linked towers and nearby threats without enemy-fog leakage;
11. multi-seat capitals receive the same garrison rule;
12. repeated capital shots do not leave stale tower recoil state;
13. overall base defense remains beatable by a committed combined-arms/Siege push.

## Verification boundary

Implemented and source-audited in chat. Local/browser gameplay and visual fit are not verified here.
