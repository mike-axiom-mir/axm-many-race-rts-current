# Phase 27 — Relocating Rain Weather

## Goal

Add a neutral moving weather layer to flat Skirmish that changes battlefield movement without adding player micro.

Three rain cells now appear over the map. Every **120 seconds of match time**, all rain cells are regenerated at new seeded-random map positions.

Any Squad or Founder physically inside a rain cell moves at **0.90× speed**.

The rule is neutral: Player, Enemy and extra seats use the same weather query.

## Weather layout

- 3 simultaneous rain cells;
- each cell uses a radius of roughly 7.2–9.0 world units;
- cells are generated inside the authored map bounds with a margin from the outer edge;
- the generator tries to keep simultaneous cells from heavily overlapping;
- positions are seeded from map id, map seed and weather-cycle number.

The seeded layout means the result feels random during play but remains reproducible for debugging/replays.

## Relocation timing

Weather owns a resettable match-local timer.

- initial layout appears when a live Player capital exists;
- cycle 0 covers match time 0:00–1:59.999;
- at 2:00 the rain cells relocate;
- they relocate again at 4:00, 6:00 and so on;
- waiting on the faction-selection screen does not advance the weather clock;
- `resetDynamic()` resets weather time and clears the previous cell visuals.

## Movement contract

The rain multiplier is applied by the final Skirmish movement wrapper:

`final movement time = existing movement time × 0.90 while inside rain`

Because it scales the existing movement chain rather than rewriting unit speed, it composes with:

- authored unit/faction speed;
- Phase-22 terrain routing;
- Phase-23 painted-surface movement;
- support speed auras;
- faction passive speed effects;
- Phase-26 temporary Attack/Defense speed effects;
- Auto Scout.

Weather does **not** change base speed values permanently.

## Routing boundary

Phase 27 does not make the route planner seek dry ground.

That is intentional. Rain changes position every two minutes and is meant to be a readable neutral battlefield condition, not another waypoint/pathfinding optimization layer. A formation follows its existing command and slows only while its current position is inside rain.

## Visual language

Each weather cell has:

- a small cluster of low-poly dark cloud puffs;
- animated falling rain streaks;
- subtle wet-ground tint beneath the cell;
- gentle cloud bob/drift so the cell reads as weather rather than static scenery.

The three visual cells share pooled cloud/rain geometry and materials to keep the cost bounded.

A compact top-bar badge shows:

- rain is active;
- time until the next 2-minute relocation;
- the `-10% speed` rule.

## Neutrality

Rain has no owner and no faction preference.

It does not change:

- damage;
- armor;
- range;
- accuracy;
- projectile behavior;
- line of sight;
- wall/gate collision;
- building production;
- resource income.

Only movement of Squads and Founders is affected.

## Boundaries

- flat Skirmish first;
- 3 rain cells fixed for this first content pass;
- exact weather density/radius is not final balance;
- no storm damage or lightning;
- no rain-driven projectile/accuracy modifier;
- no weather-aware route detour search;
- no local/browser runtime-success claim from this chat environment.

## Local smoke focus

1. three visible rain cells appear once a Skirmish starts;
2. weather does not advance while sitting on faction selection;
3. all three cells relocate at 2:00 match time and every two minutes thereafter;
4. a moving formation visibly slows by 10% inside rain and restores immediately outside;
5. Player and Enemy are affected identically;
6. Auto Scout inherits the slowdown without new controls;
7. Road/surface speed and faction/power speed stack correctly with rain;
8. weather does not change movement goals or terrain routes;
9. reset/new match clears old weather positions and restarts the 2-minute timer;
10. cloud/rain geometry remains readable without unacceptable frame-time cost.
