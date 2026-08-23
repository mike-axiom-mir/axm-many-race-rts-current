# Phase 19 — More Units, Layered Defense, Non-OP Walls

## Goal

Add more battlefield content before balance tuning: two more combat formations per authored playtest faction, one additional faction-specific defensive structure, and a shared wall/gate layer that shapes movement without replacing armies.

This phase keeps the existing four-role combat language: Line, Ranged, Mobile and Siege. No fifth combat class is added.

## Roster expansion

Each authored playtest faction now has seven formations in flat Skirmish when Phase-18 scouts are included: four established combat/support formations, two Phase-19 alternatives and one dedicated scout.

### Ironvale Compact
- Vale Outriders — Mobile armored interceptors.
- Pavise Bolters — tougher, shorter-ranged missile formation.
- Bolt Bastion — slow heavy defensive tower.
- Compact Wall / Warden Gate.

### Greenwake Union
- Marsh Javelineers — light Mobile response formation with modest throwing reach.
- Rootbreaker Crew — Greenwake Siege answer to structures/walls.
- Briar Nest — fast-firing defense with a small healing aura.
- Woven Palisade / Grove Gate.

### Ashwind League
- Ember Slingers — quick-firing Ranged harassment.
- Wind Ram Crew — faster but fragile Siege formation.
- Flare Battery — extreme-range, high-vision fragile defense.
- Frontier Barricade / March Gate.

### Prismkin Chorus
- Prism Lancers — tougher Mobile commitment unit.
- Fracture Array — crystalline Siege formation.
- Mirror Battery — stable defense with a tiny nearby damage aura.
- Facet Wall / Resonant Gate.

## Wall philosophy

Walls are intentionally not a second health pool for the entire civilization.

- unlock in Expansion Age;
- cost real Wood/Stone (and a little Gold for Prismkin);
- carry modest HP and armor;
- have no attack;
- are normal structures for Siege's existing +85% structure damage;
- friendly units cannot cross a normal wall;
- friendly units can cross their Gate;
- hostile units must break either Wall or Gate to pass;
- Gates have less HP/armor than matching Walls.

This makes a wall useful for buying time, protecting a retreat, channeling an approach or covering a vulnerable economic edge, while a committed army with Siege can open it.

## Low-micro construction

The first Wall/Gate segment auto-orients tangentially around the owning capital.

If another friendly Wall/Gate is nearby, the new segment:
- inherits the existing segment angle;
- snaps to the nearest segment end;
- re-grounds itself to authored map relief.

This allows rough-click wall lines rather than pixel-perfect manual alignment.

Gates animate open when friendly formations approach. This is visual state only; friendly passability is controlled by the movement blocker contract.

## Physical movement

Phase 19 adds a lightweight rectangular fortification blocker to flat Skirmish.

- formations/founders cannot walk through Wall segments;
- friendly units ignore their own/allied Gates;
- hostile Gates block movement;
- a formation stopped by a hostile fortification retargets that structure so normal combat can break it;
- terrain grounding is re-applied after movement so support-aware movement and authored relief remain compatible.

This is not a full navmesh/pathfinding system. Armies do not yet solve complex mazes; the fortification layer is meant for readable lines and choke shaping.

## Additional defensive structures

The second tower choices intentionally differ from the original towers rather than replacing them.

- Ironvale Bolt Bastion: high impact, slow cadence.
- Greenwake Briar Nest: lower individual hits, fast cadence, light recovery support.
- Ashwind Flare Battery: extreme range and vision, very low durability.
- Prismkin Mirror Battery: balanced cadence plus small damage support.

Fog of war consumes the explicit vision radius on these defenses where supplied.

## AI behavior

The macro AI now mixes unlocked non-scout combat formations much more evenly so later roster options actually appear.

Scouts are excluded from normal combat production because the current native AI strategist does not yet reason from fog-limited information.

When selecting ordinary defensive structures, the AI favors the least-built available defense definition, allowing both tower choices to appear.

The AI deliberately does **not** author Wall/Gate lines yet. Coherent fortification planning is a later strategist problem; random self-blocking walls would be worse than no AI walls.

## Content-pack / codex integration

- Flat Skirmish registers the full Phase-19 roster before match startup.
- Faction Hall and Atlas register the same definitions before indexing.
- Defend the Workshop receives the new formation options and their detailed low-poly visuals.
- built-in Battle Map faction/unit packs apply the Phase-19 expansion before packs are generated.

## Visual identity

The eight new formations receive distinct low-poly equipment:
- armored mounts and pavises;
- javelin bundles and timber/root rams;
- ember slings and streamer rams;
- crystal lances and fracture arrays.

New defenses receive recognizable crowns/mechanisms:
- Ironvale heavy bolt assembly;
- Greenwake thorn crown;
- Ashwind rotating flare arm;
- Prismkin rotating mirror crown.

Walls/Gates use faction-colored construction materials and their own dedicated geometry.

## Verification boundary

Source integration has been reviewed in chat, but no successful local/browser smoke run is claimed from this environment.

Local smoke should specifically verify:
1. adjacent wall auto-linking;
2. friendly Gate pass-through;
3. hostile Gate/Wall blocking + retargeting;
4. Siege time-to-break is reasonable;
5. gate animation does not obstruct passability;
6. new formations retain role/counter behavior;
7. fog correctly uses Flare Battery / other explicit vision radii.
