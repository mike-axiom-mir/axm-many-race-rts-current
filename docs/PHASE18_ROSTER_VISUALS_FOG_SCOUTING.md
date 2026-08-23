# Phase 18 — Roster Visual Identity + Fog + Macro Scouting

## Goal

Make the current authored playtest factions readable from the battlefield camera while adding meaningful scouting without turning exploration into repetitive waypoint micro.

This phase targets Ironvale Compact, Greenwake Union, Ashwind League and Prismkin Chorus. Preserved historical factions are not re-authored here.

## Current authored playtest roster

Each authored playtest faction now has five formations and five buildings.

### Ironvale Compact

Formations:
- Vale Guard — Line; durable frontline / anti-Mobile check.
- Ridgebow Cohort — Ranged; protected pressure into Line.
- Stonebreaker Crew — Siege; structure/capital breaker.
- Standard Wardens — Line support; armor aura around an elite standard.
- Vale Surveyors — Scout; cheap wide-vision recon, weak combat.

Buildings:
- Compact Commons — economy / food + stone.
- Drill Hall — military formation access.
- Vale Bastion — durable defense tower.
- Foundry Annex — upgrade hub.
- Warden Command Post — forward armor-support anchor.

### Greenwake Union

Formations:
- Grove Wardens — Line; sustainable frontline.
- River Striders — Mobile; response/flank formation.
- Canopy Slingers — Ranged; protected sustained pressure.
- Grove Tenders — Ranged support; healing aura.
- Reed Runners — Scout; high-vision light recon.

Buildings:
- Union Grove — economy and Living Supply recovery center.
- River Muster — military formation access.
- Canopy Watch — efficient faster-firing tower.
- Rest Grove — upgrade hub + healing support.
- River Mill — late food/wood economy.

### Ashwind League

Formations:
- Ashwind Marchers — Line; aggressive tempo frontline.
- Dust Riders — Mobile; fast flank/punish formation.
- Dune Arbalests — Ranged; fragile long-range pressure.
- Trailblazer Pack — Mobile support; speed aura.
- Far Runners — Scout; fastest recon, very fragile.

Buildings:
- Frontier Tradepost — gold-forward economy.
- March Yard — military formation access.
- Signal Tower — fragile long-range defense.
- Forward Camp — upgrade hub + speed aura + forward muster point.
- Ember Beacon — longer-range later defense tower.

### Prismkin Chorus

Formations:
- Facet Guard — Line; adaptable frontline.
- Refractor Flight — Ranged; Focus-phase pressure.
- Shard Runners — Mobile; Drift-phase positional swings.
- Chorus Anchors — Line support; damage aura.
- Gleam Seekers — Scout; wide resonance vision and weak combat.

Buildings:
- Resonance Reservoir — balanced economy.
- Chorus Loom — military formation access.
- Refraction Spire — stable defense tower.
- Harmonic Node — upgrade hub + damage aura.
- Prismatic Vault — late stone/gold economy.

## Visual identity

Flat Skirmish now adds low-poly equipment and architecture on top of the existing faction colors and formation shapes.

Unit examples:
- Ironvale shields, spears, bows, heavy hammers and standards.
- Greenwake leaf shields, river packs, slings and lantern/support staffs.
- Ashwind long spears, low-poly mounts, crossbows, route packs and streamers.
- Prismkin faceted shields, shoulder prisms, shard fins and orbiting anchor crystals.
- scouts use survey vanes, reeds, windsocks or sensor orbits to read as recon immediately.

Building examples:
- Ironvale receives battlements, stores, standards and fortified command silhouettes.
- Greenwake receives living canopies and grove/mill identity.
- Ashwind receives banners, awnings and moving signal arms.
- Prismkin receives orbiting crystal crowns and shard pylons.

The existing low-cost animation vocabulary (`spin`, `spinZ`, `wave`, `pulse`) is reused rather than adding an external asset dependency.

## Fog of war

Flat Skirmish now has an exploration layer:

- unexplored ground is heavily darkened;
- explored ground remains mapped but dim;
- current friendly vision clears fog;
- enemy formations/buildings/capitals outside current vision are hidden;
- enemy health bars and minimap markers obey the same visibility gate;
- friendly units/buildings always remain visible;
- capital, founder, normal formations, buildings and scouts have different vision radii.

The fog implementation uses a bounded terrain grid and shares selected-map dimensions/relief. It does not replace terrain or strategic-site state.

## Dedicated scouts

The four playtest factions receive Founding-Age scouts that require the normal faction military building.

Scouts have deliberately low HP/damage and large vision radius. Their economic purpose is information, not efficient combat.

## Auto Scout

The Skirmish army-doctrine panel now exposes an **Auto Scout** toggle.

- it activates only when at least one player scout exists;
- scouts independently seek nearby unexplored sectors;
- multiple scouts distribute their targets;
- the button reports percentage of the map explored;
- exploration stops automatically once the map is fully mapped;
- disabling Auto Scout returns control to normal formation commands.

This keeps scouting as a macro choice: invest in recon and assign the job once, rather than repeatedly issuing waypoints.

## Deliberate boundaries

- Fog/scouting in this phase targets flat Skirmish. Globe fog is a later adapter.
- Native Faction AI still uses its current world-state logic; this phase does not claim a vision-limited AI strategist.
- Connected-AI observation filtering should consume the fog visibility contract when the full seat observation bridge is completed.
- No successful browser/local runtime smoke test is claimed from this chat environment.
- Numeric balance remains intentionally secondary to content/readability in this stage.
