# Phase 29 — Map Domination Momentum

## Goal

Turn map control into a visible strategic trade instead of a pure snowball.

The map now exposes a signed **Map Domination** percentage from each side/team perspective:

- `0%` = neutral/even map pressure;
- positive = your side is controlling/pushing more of the strategic map;
- negative = hostile sides are controlling/pushing more of the strategic map.

The reward deliberately changes depending on which side of zero you are on.

## Rule

### Positive domination: economy

For every full **+3% Map Domination**, the side receives **+1% economy**.

Examples:

- `+3%` -> `+1% economy`;
- `+30%` -> `+10% economy`;
- `+60%` -> `+20% economy`;
- `+100%` -> `+33% economy`.

This rewards taking and holding ground with stronger long-term production rather than more direct combat damage.

### Negative domination: comeback attack

For every full **-1% Map Domination**, combat formations receive **+1% attack**.

Examples:

- `-10%` -> `+10% attack`;
- `-30%` -> `+30% attack`;
- `-60%` -> `+60% attack`;
- `-100%` -> `+100% attack`.

This attack bonus applies to mobile combat actors / founders, not defensive towers. The intent is to help the losing side push back onto the map rather than reward sitting behind fortifications.

These are first-pass content values, not a final balance claim.

## Smooth domination percentage

Phase 29 does not calculate control only from fully owned flags.

The existing strategic-site runtime already tracks live capture progress. Phase 29 converts every site into a contribution from the current owner's/team's perspective and interpolates during a capture.

For example, if an enemy-owned site is halfway captured by your side, its contribution has moved halfway from hostile control toward friendly control. The global percentage therefore reacts while the battle for the site is happening rather than jumping only when ownership flips.

The final Map Domination percentage is the average of the strategic-site contributions.

## Multi-seat / team behavior

The current `multiSeatMapPatch` supports `player`, `enemy`, `seat-3`, `seat-4` and team relationships.

Phase 29 reads that final capture state rather than assuming the older two-sided signed-progress format.

- ally-owned sites count as friendly control;
- hostile-owned sites count as lost control;
- neutral sites count as zero;
- a live hostile/friendly capture interpolates between the current holder and capturing side;
- comeback attack can apply to extra combat seats as well.

The flat runtime still has real resource/economy ledgers only for the primary Player and Enemy. Extra seats therefore expose their domination score and can receive the combat comeback layer, but a positive economy bonus is intentionally withheld until those seats own independent economy ledgers.

## Faction-power composition

Phase 26 faction powers remain underneath this system.

Each tick:

1. normal base faction combat/economy state is restored;
2. faction passive / temporary faction power effects are applied;
3. Map Domination economy is layered on positive control;
4. Map Domination attack is layered on negative control.

This keeps temporary faction powers and map momentum composable without permanent stat drift.

A `+30%` control side can therefore combine its normal economy identity with `+10% map economy`; a `-30%` side can combine its faction combat state with `+30% map comeback attack`.

## Economy boundary

Map economy currently multiplies the faction economy stream used by the primary Skirmish workforce economy.

If primary Player and Enemy use the exact same shared faction definition, the economy component is guarded rather than cross-buffing both ledgers through one object. Attack momentum remains actor-specific and still works.

## HUD

A compact left-HUD **Map domination** block shows:

- current signed percentage from the Player perspective;
- Player reward state;
- primary Enemy reward state.

Examples:

- `You +30% • ECO +10%`
- `Enemy -30% • ATTACK +30%`

At match start it reads `0% • no bonus`.

## Preservation

- no new resource type;
- no manual activation button;
- no cooldown;
- no tower attack comeback bonus;
- no terrain/pathfinding rewrite;
- no capture-speed rewrite;
- no Phase-26 faction-power rewrite;
- no Phase-27 weather rewrite;
- no Phase-28 waypoint rewrite;
- no local/browser runtime-success claim from this chat environment.

## Local smoke focus

1. Map Domination starts at exactly 0%;
2. partial capture progress moves the percentage before ownership flips;
3. ally-held sites count as friendly in team games;
4. +3% produces +1% economy and +30% produces +10%;
5. -1% produces +1% attack and -30% produces +30%;
6. comeback attack affects formations/founders but not towers;
7. positive control does not also grant the comeback attack bonus;
8. negative control does not also grant economy bonus;
9. faction powers and map momentum reset without permanent stat/economy drift;
10. extra seats receive the actor-specific attack comeback without fake economy ledgers;
11. mirrored primary faction economy remains guarded;
12. HUD remains readable in the mobile left panel.
