# Phase 31 — Co-op Defense Sectors & Match Metrics

## Goal

Improve the existing **Defend the Workshop** co-op survival mode without rebuilding it, then add an Age-of-Empires-style end-of-match statistics page grounded in metrics the runtime can actually attribute.

The existing Defend mode already provides:

- 1–4 allied seats;
- Human, Faction AI and Connected AI controllers;
- one shared Workshop objective;
- shared Workshop Supply;
- fixed Guard Tower sockets;
- escalating waves and boss waves;
- run-length/difficulty choices;
- wave-clear upgrades;
- active-seat macro commands;
- shared victory/loss state.

Phase 31 extends those systems rather than replacing them.

## Co-op defense sectors

Each active allied seat receives one default defense sector in seat order:

1. North
2. East
3. South
4. West

The mode adds four subtle sector markers around the Workshop and a mobile-visible co-op block in the left HUD.

### Macro actions

- **Hold My Sector** — sends the active seat's Founder/formations to its assigned inner defense point.
- **Assist Hot Lane** — sends the active seat toward the approach lane currently carrying the most hostile formations.
- **Reset Team Sectors** — returns every active seat to its assigned sector in one macro action.

These controls do not add per-unit micro.

## Lane-based wave pressure

The existing eight outer spawn points already naturally divide into four approach directions. Phase 31 preserves the existing wave count/scaling but assigns each hostile formation a readable lane:

- North;
- East;
- South;
- West.

Hostiles first push toward their lane approach point, then collapse on the Workshop once inside the inner perimeter.

The core enemy goal remains unchanged: destroy the shared Workshop.

## Wave telegraph

During intermission the UI previews the next wave's directional distribution using the same deterministic spawn-index pattern used by the existing wave spawner.

During an active wave the HUD shows current hostile counts per lane and highlights the hottest lane.

This gives co-op players information to divide responsibility before the breach instead of requiring frantic unit-by-unit correction.

## Match statistics

When a Defend run ends, the existing result panel expands into a tabbed statistics page:

- **Summary**
- **Military**
- **Economy**
- **Players**

### Summary

Shows:

- Victory/Defeat;
- waves cleared;
- total active match time;
- Workshop integrity;
- difficulty;
- peak hostile count;
- upgrades taken;
- peak Guard Tower count;
- wave timeline with clear time, post-clear Workshop integrity and Supply reward.

It also includes the intentionally accurate MVP line:

> MVP: Passive Supply.

Because the ticking shared income really did show up every second.

### Military

Tracks:

- enemy formations defeated;
- total enemy HP removed by the defending team;
- direct seat field damage;
- shared-defense damage;
- shared-defense kills;
- allied formation losses;
- allied surviving formations;
- recruited formations;
- Workshop damage taken;
- manual repair actions and HP restored;
- Guard Tower losses.

### Economy

Tracks the shared Workshop wallet rather than inventing per-player ownership:

- starting Supply;
- passive Supply generated;
- wave-clear rewards;
- Emergency Cache Supply;
- total earned after start;
- estimated total spent;
- final Supply;
- final passive Supply rate.

Estimated spending is derived from:

`starting supply + tracked earned supply - final supply`

This covers tower, repair and recruitment spending while respecting that Supply is a team resource.

### Players

Each active seat receives only metrics attributable to that seat:

- direct field damage;
- last-hit formation kills;
- formations recruited;
- formations lost;
- formations surviving;
- explicit macro orders.

Workshop Guard Towers are not credited to whichever Human seat happens to be selected.

Faction-AI combat contribution is still tracked because its formations carry the same seat ID, but hidden AI decision ticks are not counted as player orders.

## Damage attribution

Phase 31 wraps the final Defend combat path and records actual hostile HP reduction produced by a seat's Founder/formations.

For a direct combat kill, the seat that is actively applying the finishing hit receives the last-hit kill.

Kills caused outside a seat's direct combat call — primarily Workshop Guard Tower projectiles — are counted as **Shared Defense** kills.

Total team damage is derived from the maximum HP of every observed spawned hostile minus surviving hostile HP at the end of the run. This keeps fixed-defense damage visible without assigning it to a player.

## Repair metric source-audit repair

The first metrics listener was registered in normal bubble order, which would observe the Repair button after the game's own repair handler had already changed HP/Supply.

Phase 31 adds a capture-phase repair snapshot adapter so the metric records state before the repair action and verifies the actual successful HP/Supply change afterward.

## Mobile behavior

The co-op sector controls live inside the existing left HUD, which is the panel retained by the current mobile layout.

The compact lane ribbon reflows on smaller screens.

The end-of-match statistics page becomes scrollable and collapses its hero metrics from four columns to two on narrow screens.

## Preservation

Phase 31 does not change:

- wave count formula;
- difficulty scaling;
- Workshop base HP values;
- Guard Tower combat stats;
- recruitment costs;
- upgrade effects;
- shared-Supply ownership;
- Workshop victory/loss rule;
- Connected-AI observation information gate;
- standard Skirmish map-domination rules;
- Phase-30 Skirmish base-defense coordination.

## Local smoke focus

1. 1–4 active Defend seats receive N/E/S/W sector assignments in order.
2. Hold My Sector moves only the active seat.
3. Assist Hot Lane selects the lane with the largest live hostile count.
4. Reset Team Sectors returns every active seat to its sector.
5. next-wave lane preview counts match the actual wave spawn distribution.
6. enemies enter through their assigned lane before collapsing on the Workshop.
7. Faction AI and Connected AI behavior still function.
8. mobile left-HUD sector controls remain reachable.
9. victory and defeat both open the expanded result page.
10. Summary/Military/Economy/Players tabs all switch correctly.
11. passive Supply, wave rewards and caches reconcile sensibly with final Supply/spending.
12. successful manual repairs increment repair actions and restored HP exactly once.
13. seat direct damage and last-hit kills do not absorb Workshop Tower contribution.
14. Shared Defense damage/kills remain visible.
15. restart still reloads into a fresh run with no stale metric state.

## Verification boundary

Implemented and source-audited in chat. Local/browser gameplay and UI verification are not claimed here.
