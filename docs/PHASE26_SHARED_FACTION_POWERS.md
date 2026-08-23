# Phase 26 — Shared Faction Powers

## Goal

Add one high-impact macro decision to each faction without creating another micro layer.

Every selectable faction receives exactly three powers:

- **Attack** — commit to pressure;
- **Defense** — survive or stabilize;
- **Economy** — greed for a temporary income window.

All three powers share **one 120-second cooldown per side**.

Using any power immediately locks the other two as well. The strategic question is therefore not "which cooldown is ready?" but "which one of my three answers am I willing to spend for the next two minutes?"

That creates the intended greed interaction: an Economy activation can be valuable, but if the opponent has kept its shared cooldown available it may answer with an Attack power while Defense is unavailable to the greedy side.

## Shared cooldown contract

- exact shared cooldown: **120 seconds**;
- all three buttons start ready;
- activating one locks Attack + Defense + Economy together;
- active effects may end before the shared cooldown does;
- cooldown time uses resettable **match time**, not browser/page uptime;
- the HUD shows READY or the remaining shared lock time;
- the enemy's last/active power and shared cooldown are also shown so the commitment can be read and punished.

## Economy power contract

Economy powers are not instant resource crates.

They create a **30-second temporary income multiplier window**. This keeps greed exposed for long enough to matter tactically while the 120-second shared lock begins immediately.

The current flat runtime has independent resource ledgers only for the primary Player and Enemy. Extra lobby seats may use Attack/Defense through the generic power API, but their Economy power is intentionally unavailable until those seats own independent economy ledgers.

If the primary Player and Enemy are configured as a mirrored same-faction matchup, the Economy button is also disabled in this phase because both sides currently reference the same faction economy definition. Attack and Defense remain available. This avoids silently buffing both sides.

## Core faction powers

### Ironvale Compact

**Attack — Warden Advance** — 18s

- +15% formation damage;
- +8% formation speed.

**Defense — Seal the Line** — 24s

- +14% formation/founder armor;
- 3.2 HP/s formation recovery;
- 5 HP/s structure/capital repair.

**Economy — Foundry Reserve** — 30s

- Food ×1.08;
- Wood ×1.34;
- Stone ×1.48;
- Gold ×1.18.

Ironvale's choice leans toward infrastructure: its Attack power is controlled, its Defense power is sturdy, and its greed window strongly favors building materials.

### Greenwake Union

**Attack — Briar Surge** — 20s

- +11% damage;
- +8% speed;
- 3.8 HP/s formation recovery.

**Defense — Shared Canopy** — 24s

- +10% armor;
- 7.5 HP/s formation recovery;
- 4.5 HP/s structure repair.

**Economy — Harvest Bloom** — 30s

- Food ×1.52;
- Wood ×1.44;
- Stone ×1.12;
- Gold ×1.10.

Greenwake remains sustain-oriented: even its Attack power wins through pressure that keeps living rather than raw burst.

### Ashwind League

**Attack — Redline March** — 16s

- +24% damage;
- +20% speed.

**Defense — Dust Screen** — 18s

- +11% armor;
- +14% speed;
- 2.5 HP/s recovery.

**Economy — Frontier Windfall** — 30s

- Food ×1.18;
- Wood ×1.16;
- Stone ×1.08;
- Gold ×1.62.

Ashwind receives the most explosive Attack window, while its Defense still protects through mobility rather than becoming a static turtle button.

### Prismkin Chorus

**Attack — Forced Focus** — 18s

- +18% damage;
- +0.35 range.

**Defense — Mend Chorus** — 22s

- +10% armor;
- 8.5 HP/s formation recovery;
- 2.5 HP/s structure repair.

**Economy — Resonant Synthesis** — 30s

- Food ×1.30;
- Wood ×1.30;
- Stone ×1.30;
- Gold ×1.34.

The power layer overlays rather than replaces Prismkin's existing deterministic Drift / Focus / Mend cycle.

## Existing legacy faction powers

These powers use the faction traits already present in `src/factions.js`; they do not redefine the factions' underlying lore or architecture.

### Northpole Dominion

- **Attack — Prepared Offensive** — 20s: +16% damage, +10% speed.
- **Defense — Whiteout Bastion** — 24s: +14% armor, 2.5 HP/s recovery, 6 HP/s structure repair.
- **Economy — Open the Stores** — 30s: Food ×1.58, Wood ×1.40, Stone ×1.12, Gold ×1.08.

### Suitcase Habitat Collective

- **Attack — Rapid Unpack** — 16s: +16% damage, +24% speed.
- **Defense — Foldout Shelter** — 20s: +11% armor, +12% speed, 3 HP/s structure repair.
- **Economy — Trade Route** — 30s: Food ×1.10, Wood ×1.34, Stone ×1.08, Gold ×1.58.

### Fatfrotz Empire

- **Attack — Mass Charge** — 20s: +20% damage, +12% speed.
- **Defense — Dig In & Eat** — 24s: +16% armor, 6 HP/s formation recovery, 2.5 HP/s structure repair.
- **Economy — Grand Feast** — 30s: Food ×1.66, Wood ×1.16, Stone ×1.10, Gold ×1.08.

### Clockwork Orchard Assembly

- **Attack — Overclock Precision** — 18s: +20% damage, +10% speed, +0.25 range.
- **Defense — Lockwork Formation** — 22s: +14% armor, 4.5 HP/s recovery, 4 HP/s structure repair.
- **Economy — Perfect Harvest** — 30s: Food ×1.08, Wood ×1.38, Stone ×1.16, Gold ×1.52.

## Runtime layering

Phase 26 does not replace the existing faction runtime.

The normal faction passive is evaluated first. The active power layer is then applied on top of the resulting temporary combat stats for that tick.

This means examples such as Compact Discipline, Forward Momentum and Prismkin resonance continue to exist and can combine with a chosen power window.

Defense armor uses the existing faction-armor channel already read by unit combat and tower projectile damage calculations.

## Enemy AI choice

The primary Enemy owns the same shared cooldown and uses the same faction power definitions.

Its first decision does not happen before roughly 20 seconds of match time.

The decision is state-driven:

- threatened capital / nearby hostile pressure -> **Defense**;
- engaged army or sufficiently large army -> **Attack**;
- otherwise -> **Economy**.

A separate greed-read rule exists: if the Player currently has an Economy power active and the Enemy already has at least three real squads, the Enemy may spend its ready cooldown on Attack instead of greedily mirroring the Economy choice.

This is intentionally conditional, not an automatic hard-counter. An opponent without an army cannot magically punish greed just because it detected the button press.

## Visual/UI feedback

- three power buttons live in the left HUD, so they remain accessible in the mobile layout;
- Attack / Defense / Economy have separate border language;
- the active button shows its effect timer;
- all buttons visibly lock together after activation;
- activation creates a short faction-side battlefield pulse;
- the Enemy power row persists after the activation toast and shows active/last-used power plus remaining shared lock.

## Boundaries

- first-pass content values, not final balance;
- no per-unit ability buttons;
- no targeting reticle or skill-shot micro;
- no mana/energy resource;
- no separate cooldown for each power;
- no silent extra-seat economy simulation;
- no local/browser runtime-success claim from this chat environment.

## Local smoke focus

1. all three buttons are ready at match start;
2. pressing one immediately locks all three for exactly two minutes;
3. active timers end before the shared cooldown where intended;
4. Attack values stack on top of existing faction passives without permanently altering base stats;
5. Defense armor/recovery ends cleanly after expiry;
6. Economy values return exactly to the faction baseline after 30 seconds;
7. Restart/reset clears power state and economy mutations;
8. Player Economy followed by a prepared Enemy Attack creates the intended punish window;
9. Enemy Economy can be noticed through the persistent readout and punished by the Player if their cooldown is ready;
10. duplicate extra-seat factions do not cancel a primary Economy window;
11. mirrored primary factions visibly disable Economy rather than buffing both sides;
12. mobile HUD can reach all three power buttons;
13. no unacceptable frame-time or DOM update cost appears in larger battles.
