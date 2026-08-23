# Phase 11 — Play-first starter factions

## Purpose

The historical faction roster is intentionally left untouched until the older source material is recovered.

Phase 11 adds three **new, non-historical starter factions** whose job is to make the current RTS systems easier to play, compare and balance now.

They are additive. They do not rewrite, rename or replace Northpole Dominion, Suitcase Habitat Collective, Fatfrotz Empire or Clockwork Orchard Assembly.

## Starter trio

### Ironvale Compact — balanced / defense

Founder: **First Warden Mara**

Learning purpose:
- easiest baseline for economy, construction and territorial defense;
- intentionally close to neutral multipliers;
- sturdy structures and durable general-purpose formations;
- live mechanic: **Compact Discipline** gives formations a modest combat bonus while operating near friendly structures.

This is the faction to use when testing whether the base RTS itself feels good without a highly unusual faction rule dominating the match.

### Greenwake Union — economy / sustain

Founder: **Keeper Elian**

Learning purpose:
- demonstrates macro economy advantage without requiring high action speed;
- stronger Food and Wood economy;
- slightly lower burst damage;
- live mechanic: **Living Supply** slowly restores damaged formations near Greenwake economy districts.

This faction tests long territorial holds, reinforcement efficiency and the value of fighting around developed land.

### Ashwind League — mobility / aggression

Founder: **Rook of the First March**

Learning purpose:
- teaches forward pressure and map commitment;
- faster formations and stronger Gold economy;
- slightly weaker structures;
- live mechanic: **Forward Momentum** increases formation damage and speed when operating well away from the faction capital.

This faction tests whether attacking, map pressure and territorial movement feel rewarding without requiring heavy unit-level micro.

## Integration

All three factions use the normal faction data contract, so they automatically propagate into:
- Skirmish faction selection;
- Faction Hall;
- Atlas Library;
- faction/unit content packs;
- Battle Map Editor;
- Defend the Workshop;
- World Domination;
- faction NPC lookup.

`getFactionList()` surfaces starter factions first while preserving the existing factions after them.

Each starter also has a native faction NPC profile:
- Ironvale — **The Linekeeper**
- Greenwake — **The Grove Keeper**
- Ashwind — **The Forward Rook**

## Source-integrity boundary

These are play-first factions created in August 2026 so the game can move into actual gameplay and balancing before the historical faction material is recovered.

They must not be presented as recovered original factions.

When the old sources return, the historical factions can be inspected and added/updated independently. The starter trio may remain as normal factions if they prove fun, but that is a later design choice rather than an automatic canon decision.

## Local playtest focus

1. Ironvale should feel understandable and dependable, not overpowered.
2. Greenwake recovery should be visible/useful but not make formations effectively immortal.
3. Ashwind should clearly reward leaving home without becoming an automatic rush win.
4. Compare first-unit costs and first military-building timing across all three.
5. Compare economy at 3, 5 and 10 minutes.
6. Check whether each live faction state (`Compact Discipline`, `Living Supply`, `Forward Momentum`) actually appears under normal play.
7. Adjust numbers locally only after observing real matches; preserve the mechanic identities unless they are fundamentally unfun.
