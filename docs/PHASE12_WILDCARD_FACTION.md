# Phase 12 — Wildcard Playtest Faction

## Purpose

Add one deliberately strange faction beside the three play-first starter factions before local gameplay/balance work begins.

This faction is new August-2026 content. It is not a recovered historical faction and does not rewrite Northpole Dominion, Suitcase Habitat Collective, Fatfrotz Empire or Clockwork Orchard Assembly.

## Prismkin Chorus

Role: **Wildcard / rhythm**

Founder: **First Refraction**

Native strategist: **The Phase Conductor**

The Prismkin Chorus is a crystalline civilization built around one deterministic global mechanic rather than stronger baseline numbers.

### Resonance Cycle

The Chorus shifts phase every 14 seconds:

1. **Drift**
   - formations gain +18% movement speed;
   - intended for repositioning, pursuit and disengagement.

2. **Focus**
   - formations gain +14% damage;
   - formations gain +0.35 range;
   - intended as the commitment/attack window.

3. **Mend**
   - formations move 6% slower;
   - damaged formations recover 2.4 HP per second;
   - intended for preservation and reset.

The sequence repeats deterministically: Drift → Focus → Mend.

There is no random phase selection.

Each Prismkin formation/founder receives a visible resonance ring whose color changes with the active phase, so the faction mechanic should be readable directly on the battlefield.

## Content

Buildings:
- Resonance Reservoir — economy
- Chorus Loom — military
- Refraction Spire — defense

Formations:
- Facet Guard — adaptive line formation
- Refractor Flight — faster ranged formation

## Integration

Prismkin uses the normal `FACTIONS` and `FACTION_NPCS` contracts.

It therefore automatically enters:
- Skirmish faction selection;
- Faction Hall;
- Atlas Library;
- faction/unit packs;
- Battle Map Editor;
- Defend the Workshop;
- World Domination territory production and faction selection.

Faction-list ordering is:
1. three starter factions;
2. Prismkin wildcard;
3. preserved existing factions.

## Local playtest targets

When the project goes local, verify:
- resonance rings render correctly;
- phase changes occur every ~14 seconds;
- Drift speed is noticeable without being overwhelming;
- Focus produces a clear attack window;
- Mend recovery is useful but cannot erase sustained damage;
- phase modifiers reset correctly when the next phase begins;
- AI-controlled Prismkin remains functional even before deeper Phase Conductor timing logic exists.

No successful browser/runtime test is claimed from this chat environment.
