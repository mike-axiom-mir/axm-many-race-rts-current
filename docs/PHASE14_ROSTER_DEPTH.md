# Phase 14 — Roster Depth Without Micro Bloat

## Purpose

Give the current playtest roster meaningful unit/building depth while keeping the game readable at a glance.

This phase targets the three new starter factions plus Prismkin Chorus. The preserved older factions remain source-preserved and are not re-authored before their historical source material is recovered.

## Simple combat language

The game now uses four readable formation roles:

- **Line** — durable frontline. Receives a bonus against Mobile formations.
- **Ranged** — longer reach. Receives a bonus against Line formations.
- **Mobile** — fast pressure/flanking. Receives a bonus against Ranged formations.
- **Siege** — slower specialist. Receives a large bonus against Structures and reduced efficiency against normal formations.

These are soft counters, not immunities. Positioning, faction mechanics, cost, formation health and numbers still matter.

### Base role tuning

| Role | Base armor | Base attack interval | Primary bonus |
|---|---:|---:|---|
| Line | 8% | 0.90s | +22% vs Mobile |
| Ranged | 2% | 1.05s | +20% vs Line |
| Mobile | 4% | 0.78s | +26% vs Ranged |
| Siege | 10% | 1.22s | +85% vs Structures |

Individual faction units may override armor and attack interval.

## Formation readability

Roles also use different battlefield silhouettes:

- Line: compact block
- Ranged: wider firing line
- Mobile: wedge
- Siege: small heavy block

This is intended to let players read composition without opening a stat panel.

## Ironvale Compact

### Vale Guard — Line, Founding Age
Durable baseline formation. 5 members. High formation durability and above-average armor.

### Ridgebow Cohort — Ranged, Expansion Age
Protected ranged support. 5 members. Longer range, lower armor, strong into Line.

### Stonebreaker Crew — Siege, Dominion Age
3-member heavy specialist. Slow and inefficient in open formation combat but significantly stronger against structures.

### Structures

- Compact Commons: durable economy anchor; Food + Stone income.
- Drill Hall: durable military access building.
- Vale Bastion: highest starter-faction tower durability; slower reliable fire and medium-long range.

Ironvale's simple plan is readable: build a line, protect ranged support, then add Siege when structures become the problem.

## Greenwake Union

### Grove Wardens — Line, Founding Age
Sustainable frontline that benefits strongly from Living Supply near Union Groves.

### River Striders — Mobile, Expansion Age
Response/flanking formation. Strong against exposed Ranged formations.

### Canopy Slingers — Ranged, Dominion Age
Efficient late support with strong reach and lower durability.

### Structures

- Union Grove: highest starter economy output and Living Supply recovery anchor.
- River Muster: relatively light but affordable military district.
- Canopy Watch: lighter tower with good reach and faster fire cadence.

Greenwake wins through staying power and economy, not burst damage.

## Ashwind League

### Ashwind Marchers — Line, Founding Age
Fast aggressive frontline with lower durability.

### Dust Riders — Mobile, Expansion Age
4-member high-speed flanking formation with high burst output and low staying power.

### Dune Arbalests — Ranged, Dominion Age
4-member fragile long-range pressure formation. Strong range, high damage, very low armor.

### Structures

- Frontier Tradepost: inexpensive Gold-forward economy.
- March Yard: light military infrastructure.
- Signal Tower: longest starter tower range but lowest durability and lower sustained tower damage.

Ashwind's depth is positional: the units are dangerous when momentum is maintained, but losing the front or being forced into prolonged defense should hurt.

## Prismkin Chorus

### Facet Guard — Line, Founding Age
Moderate baseline line formation whose performance shifts with Resonance.

### Refractor Flight — Ranged, Expansion Age
4-member ranged formation. Drift helps reposition; Focus increases pressure; Mend restores losses.

### Shard Runners — Mobile, Dominion Age
4-member flanking formation. Especially dangerous when a Drift window is used to close before Focus arrives.

### Structures

- Resonance Reservoir: balanced Gold/Wood economy.
- Chorus Loom: balanced military access.
- Refraction Spire: deliberately stable defense tower, contrasting with the army's changing cycle.

Prismkin's complexity comes from timing one global rule rather than from a large unit roster.

## Building statistics

The playtest factions now provide explicit building HP/armor metadata. Defense structures may also define:

- tower damage
- tower range
- fire interval
- projectile speed
- projectile lifetime

The generic defense system reads these values. Unit/tower damage now respects combat armor.

Capital structures receive a baseline 12% combat armor in the shared combat-depth adapters.

## AI composition

The primary macro AI now samples from every currently unlocked formation instead of assuming a two-unit roster. Core formations remain common while specialist formations are mixed in rather than replacing earlier units entirely.

## Player information

Faction Hall now shows:

- combat role / strong-against summary
- formation size
- HP and damage per member
- speed and range
- armor
- attack interval
- unlock age
- building scaled HP/armor
- defense range/fire cadence when applicable

Atlas enriches built-in unit/building entries with the same combat and structure metadata and supports searching by role.

## Cross-mode adapters

The shared combat role system is loaded in:

- flat Skirmish
- Defend the Workshop
- Globe Conquest

Globe battles keep their spherical movement and geodesic distance calculations while consuming the same role/counter data.

## Explicit hold

The four preserved older factions are not manually rewritten to fit the new role system in this phase. Their original definitions remain untouched until historical source material is recovered. New playtest factions are the authoritative balance target.

## Local play checklist

When this reaches local runtime, test these before doing numeric balance edits:

1. A Line formation should usually win an otherwise comparable direct engagement into Mobile.
2. Mobile should visibly punish exposed Ranged formations if it closes distance.
3. Ranged should be valuable behind a Line formation rather than functioning as a replacement for Line.
4. Stonebreaker Crew should remove structures meaningfully faster than normal formations but feel inefficient when intercepted by ordinary troops.
5. Ashwind should feel threatening but fragile.
6. Greenwake should feel difficult to grind down around its economy districts.
7. Ironvale should be the easiest faction to understand without being the strongest at everything.
8. Prismkin phase timing should change *when* the player wants to move/fight/recover rather than simply being a permanent statistical advantage.
9. Tower ranges/cadence should feel different enough to notice visually.
10. Check performance with the new target scoring and formation shapes.

No successful browser/runtime smoke test is claimed from the chat environment.
