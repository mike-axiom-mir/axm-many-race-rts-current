# Phase 27 Action Report

## Implemented

- Added `src/rainWeatherPatch.js` as a neutral weather/movement layer.
- Added 3 simultaneous rain cells on the selected flat Skirmish map.
- Added exact 120-second match-local relocation cadence.
- Added seeded map/cycle placement so weather feels random but is reproducible.
- Added roughly 7.2–9.0 unit radius per rain cell with overlap-avoidance attempts.
- Added low-poly cloud clusters, animated rain streaks and subtle wet-ground tint.
- Added a top-bar weather badge with next-shift timer and `-10% speed` rule.
- Added 0.90× movement scaling for Squads and Founders inside rain.
- Added `weatherMovementMultiplier` and `weatherState` diagnostics on actors.
- Imported weather after the existing movement/faction/multi-seat stack so it composes as the final neutral movement modifier.
- Added reset cleanup and per-cell wet-geometry disposal.

## Existing behavior reused

- `DEFAULT_MAP` already reflects the selected flat map through `selectedMapPatch.js`.
- map environment width/depth already provide a shared map-bound contract.
- `flatHeightAt()` already provides the selected map's authored terrain height.
- the current movement wrapper stack already composes unit speed, support effects, terrain passability and painted-surface speed.

## Source-audit repairs

1. **Stationary stale status** — the first pass only refreshed weather diagnostics while an actor had a movement target. The wrapper now refreshes rain state for all live Squad/Founder movement calls, even when stationary.
2. **Reset geometry cleanup** — the first reset detached weather cell groups without disposing their unique wet-zone circle geometries. Reset now uses the shared `clearVisuals()` lifecycle so those geometries are disposed.
3. **Match-time clock** — weather only advances after a live Player capital exists, so faction-selection/page idle time cannot consume the two-minute weather cycle.
4. **Wrapper order** — weather is imported after the existing multi-seat and movement stack, so the rain multiplier scales the final movement call instead of bypassing terrain/support/faction speed logic.

## Preserved

- Unit/faction base speed values.
- Phase-22 cliff routing.
- Phase-23 painted-surface movement.
- Support-aura speed effects.
- Faction passives and Phase-26 powers.
- Auto Scout command behavior.
- Combat damage/armor/range/projectiles.
- Fog of War.
- Wall/Gate collision and LOS.

## Explicit non-goals

- No rain damage.
- No lightning.
- No combat accuracy/range penalty.
- No weather-aware pathfinding detours.
- No permanent puddle/surface mutation.
- No final weather balance claim.
- No local/browser runtime-success claim from this environment.

## Verification state

Implemented and source-audited on the Phase-27 branch.

Local/browser visual timing, readability and performance remain unverified until Mike/local runs the merged build.

## Local verification targets

1. exactly three rain zones appear;
2. visible rain/clouds correspond to the slowdown area;
3. 0.90× speed applies equally to all sides;
4. surface/faction/power speed stacks remain correct;
5. cells move together at 2:00/4:00/etc.;
6. weather timer resets on a new match;
7. no stale rain status remains after leaving a cell;
8. Auto Scout slows/restores automatically;
9. cloud/rain visuals do not obscure unit readability;
10. repeated weather relocation does not leak geometry or create unacceptable frame-time cost.
