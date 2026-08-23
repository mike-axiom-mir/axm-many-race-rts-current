# Phase 26 PR Notes

Shared faction-power decision layer for flat Skirmish:

- 8 selectable factions × 3 powers = 24 powers;
- exactly one Attack, one Defense and one Economy power per faction;
- all three share one exact 120-second cooldown per side;
- Economy is a 30-second temporary income window, creating deliberate greed risk;
- Player and primary Enemy use the same power rules and shared cooldown;
- Enemy AI can greed, defend under threat, attack when committed, or punish a visible Player Economy window if it already has at least three squads;
- persistent Enemy power/readiness HUD makes the commitment readable;
- temporary combat effects layer after existing faction passives and restore automatically;
- extra-seat Economy is withheld until those seats have independent resource ledgers;
- mirrored primary factions disable Economy to avoid shared-definition cross-buffing;
- first-pass content values only; no final balance claim;
- no local/browser runtime-success claim from this chat environment.
