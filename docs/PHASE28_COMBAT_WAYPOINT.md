# Phase 28 — All-Combat Waypoint

## Goal

Add one mobile-friendly army movement control without introducing AoE-style waypoint chains or individual-unit micro.

## Controls

### All Combat → Map

Press the button, then tap/click one battlefield destination.

That action:

- selects the live Player combat command group;
- excludes economy/civilian units;
- places or moves one persistent army waypoint marker;
- sends the current combat group toward a loose formation around that point.

Pressing the button again lets the same single waypoint be moved anywhere else.

### Go To Waypoint

Reissues the saved waypoint to the current combat roster without moving the marker.

This is deliberately explicit. Newly trained combat formations do not silently march away when they spawn; pressing Go To Waypoint pulls them into the existing army plan when the player chooses.

## Economy-unit exclusion

The current Skirmish economy is primarily abstract workforce plus economy buildings rather than visible worker units.

Phase 28 nevertheless establishes the exclusion contract now. A live unit is kept out of All Combat when it carries an economy/civilian classification such as:

- `economyUnit` / `isEconomyUnit`;
- `worker` / `civilian`;
- role `economy`, `worker`, `civilian`, `villager`, `gatherer`, `trader`, `merchant`, `laborer` or `labourer`.

The spawn adapter propagates those classifications from future unit definitions onto the live entity so the macro command cannot accidentally pull economy actors into battle.

## Movement behavior

The waypoint does not replace the terrain movement stack.

Each eligible combat actor receives a nearby formation target around the waypoint, then the normal runtime handles:

- cliff/passability routing;
- painted-surface movement;
- support/faction/power speed modifiers;
- Phase-27 rain slowdown.

The waypoint is a command destination, not a teleport or separate movement engine.

## Input / mobile behavior

The controls live in the left HUD because that panel remains available in the existing mobile layout.

Arming All Combat cancels active construction placement through the same Escape path already used by `game.js`, preventing the next battlefield tap from accidentally being both an army order and a building placement.

Any unrelated button press cancels an armed army-map tap.

## Visual behavior

The saved waypoint is represented by one small persistent battlefield marker with a pulsing ring and pennant.

There is intentionally only one army waypoint. Setting a new destination moves it rather than creating a waypoint chain.

## Boundaries

- no per-unit selection UI;
- no drag box required;
- no multi-waypoint queue;
- no automatic newly-trained-unit marching;
- no economy-unit movement through All Combat;
- no combat stat, cost, weather, LOS or pathfinding rewrite;
- no local/browser runtime-success claim from this chat environment.

## Local smoke focus

1. All Combat → Map arms one battlefield tap;
2. the tap places/moves one persistent waypoint;
3. current combat squads/founder move toward formation offsets around it;
4. any economy/civilian-tagged actor stays behind;
5. Go To Waypoint explicitly pulls newly trained combat formations toward the saved point;
6. moving the waypoint reorders the current combat group;
7. build placement is cancelled when All Combat is armed;
8. unrelated button presses cancel an armed map tap;
9. terrain routing/surfaces/rain still affect commanded movement normally;
10. controls remain reachable and readable on the existing mobile left HUD.
