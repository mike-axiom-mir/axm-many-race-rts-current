# Phase 15 — Expanded roster, animated identity and compact upgrades

## Goal

Deepen the four current playtest factions without turning the game into a large technology-management simulator.

The surface rule stays simple:

- small formation roster;
- a few buildings with obvious jobs;
- age progression reveals complexity gradually;
- support is visible on the battlefield;
- three normal upgrade lanes, two levels each;
- one faction-signature upgrade.

The older preserved factions remain outside this authored balance pass.

## Playtest roster size

Each current playtest faction now has:

- 4 formations;
- 5 faction buildings;
- 1 upgrade-hub/support building;
- 1 faction signature upgrade.

Existing Phase-14 formations remain unchanged in role identity.

### Ironvale Compact

New structure: **Foundry Annex** (Expansion Age)
- upgrade hub;
- durable support infrastructure;
- animated forge wheel.

New structure: **Warden Command Post** (Dominion Age)
- armor support aura;
- durable forward anchor;
- animated signal arm.

New formation: **Standard Wardens** (Legacy Age)
- Line;
- 4-person formation;
- strong armor;
- small allied armor aura;
- visible animated standard.

### Greenwake Union

New structure: **Rest Grove** (Expansion Age)
- upgrade hub;
- nearby formation recovery aura;
- pulsing grove crown.

New structure: **River Mill** (Dominion Age)
- high-value food + wood economy district;
- animated water wheel.

New formation: **Grove Tenders** (Legacy Age)
- Ranged support;
- low direct damage;
- small healing aura;
- visible pulsing lantern.

### Ashwind League

New structure: **Forward Camp** (Expansion Age)
- upgrade hub;
- nearby speed aura;
- forward formation muster point;
- animated camp banner.

New structure: **Ember Beacon** (Dominion Age)
- long-range defense;
- low durability;
- animated signal component.

New formation: **Trailblazer Pack** (Legacy Age)
- Mobile;
- fast and fragile;
- nearby allied speed aura;
- animated route streamers.

### Prismkin Chorus

New structure: **Harmonic Node** (Expansion Age)
- upgrade hub;
- nearby damage aura;
- orbiting crystalline animation.

New structure: **Prismatic Vault** (Dominion Age)
- stone + gold economy;
- orbiting/pulsing crystalline identity.

New formation: **Chorus Anchors** (Legacy Age)
- Line;
- small, heavily armored formation;
- nearby damage aura;
- orbiting crystal animation.

## Support-aura rule

Support is deliberately not a fifth counter class.

A support unit remains Line/Ranged/Mobile and can still be countered through the normal combat language. The aura adds a positional reason to protect it.

Supported effects currently include:

- armor;
- healing;
- damage;
- movement speed.

Support effects are small and spatial. They are intended to reward formation composition, not create mandatory death-ball stacking.

Support effects are consumed in flat Skirmish, Defend the Workshop, and the spherical Globe combat adapter.

## Compact upgrade system

A faction must build its Expansion-Age upgrade hub before normal upgrades can be purchased.

### Efficient Supply — 2 levels

Each level increases total Food/Wood/Stone/Gold income by 7%.

### Veteran Formations — 2 levels

Each level increases formation health and damage by 6%.

Upgrading affects both existing and future formations.

### Fortified Works — 2 levels

Each level increases building health by 10% and defensive-tower damage by 5%.

Upgrading affects both existing and future buildings.

### Signature upgrade — 1 level

Available from Dominion Age through the same upgrade hub.

- Ironvale: **Deep Anchors** — Compact Discipline reaches farther, deals slightly more damage and supplies a small armor bonus.
- Greenwake: **Shared Canopy** — Living Supply reaches farther and heals faster.
- Ashwind: **Long March** — Forward Momentum activates closer to home and grants a little more speed.
- Prismkin: **Perfect Cadence** — Drift/Focus/Mend become modestly stronger without changing the 14-second rhythm.

## AI parity

The primary two-side macro AI uses the same compact upgrade definitions:

- it must reach the required age;
- it must build its faction upgrade hub;
- it must afford the actual resource cost;
- it upgrades existing and future entities through the same multipliers.

The AI does not receive hidden free upgrade tiers.

## Building age gates

New playtest buildings are not all available at match start.

- Founding Age keeps the original three-building core readable.
- Expansion Age reveals the support/upgrade hub.
- Dominion Age reveals the fifth faction building.

Building buttons state the missing age requirement rather than silently disabling.

## Forward muster

Ashwind's Forward Camp is currently the first explicit forward-muster structure.

When a living Forward Camp exists, newly trained Ashwind formations assemble near the newest Forward Camp instead of at the capital. Destroying the camp naturally returns future assembly to the capital.

This is intentionally a faction-specific positional advantage, not a universal barracks-management system.

## Animation layer

Phase 15 adds small low-poly animations using existing Three.js primitives only:

- rotating forge machinery;
- water wheel;
- pulsing grove/lantern elements;
- waving banners/streamers;
- rotating signal arms;
- orbiting Prismkin crystals;
- visible pulsing support rings.

Animations are designed to communicate function and identity rather than add visual noise.

## Atlas / Faction Hall

The expanded unit/building data automatically flows into Atlas and Faction Hall.

Atlas now also receives entries for all six normal Skirmish upgrade levels plus the four faction-signature upgrades.

Faction Hall exposes support aura, unlock age, upgrade-hub status and forward-muster status alongside existing combat statistics.

## Source-integrity boundary

Northpole Dominion, Suitcase Habitat Collective, Fatfrotz Empire and Clockwork Orchard Assembly are not expanded or re-authored in this phase.

The new roster/support/upgrade work is intentionally targeted at:

- Ironvale Compact;
- Greenwake Union;
- Ashwind League;
- Prismkin Chorus.

## Local play checklist

When this build reaches local runtime, verify in this order:

1. Start each playtest faction in Founding Age and confirm only the original core buildings are constructible.
2. Reach Expansion Age and confirm the upgrade-hub/support building unlocks.
3. Build the hub and verify upgrade buttons become purchasable only when resources are sufficient.
4. Buy one level of each generic upgrade and verify existing entities change as well as future spawns.
5. Reach Dominion Age and test the fifth building + faction signature upgrade.
6. Reach Legacy Age and train the fourth specialist formation.
7. Visually inspect each new building/unit animation.
8. Verify support aura effects disappear when the support source is destroyed or moves out of range.
9. Verify Ashwind formations muster from the newest living Forward Camp.
10. Watch the primary AI build an upgrade hub and purchase upgrades without free resources.
11. Test support specialists in Defend the Workshop.
12. Test unit support aura distance across Globe Conquest surface movement.

## Tuning hold

Do not heavily rebalance percentages before the first real matches.

The current numbers are intended as a readable baseline. First local play should answer:

- Are support auras noticeable but optional?
- Does five buildings feel like choice rather than clutter?
- Do fourth formations arrive late enough to feel special?
- Are two upgrade levels per lane enough?
- Is the AI economically capable of upgrading without stalling its army?

Tune those observed outcomes rather than adding more upgrade categories.
