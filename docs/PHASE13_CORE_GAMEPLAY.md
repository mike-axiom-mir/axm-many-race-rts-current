# Phase 13 — Core Gameplay Loop

## Goal

Move the flat skirmish from a systems showcase toward an actual RTS match loop before adding more content.

This phase deliberately avoids adding another game mode or editor. It works inside the existing skirmish.

## Player progression

Formation access is now derived from real progression rather than the old `state.unlocked` set.

Default rule:

- a faction's first formation requires its military district and Founding Age;
- its second formation requires the military district and Expansion Age;
- future formations naturally fall into later ages unless they declare explicit `unlockAge` / `requiresBuilding` metadata.

This means every current second formation finally has a reachable unlock path.

If the required military district is destroyed, reinforcement access closes until the district is rebuilt. Existing formations remain on the battlefield.

The unit panel displays the missing requirement rather than simply presenting a permanently disabled button.

## Player economy readability

The strategic-state panel now reports approximate current Food / Wood / Stone / Gold income per second.

The calculation uses the same inputs as the live economy:

- workforce allocation;
- faction economy multipliers;
- age multiplier;
- economy buildings;
- strategic-site income;
- Stewarded Economy research.

It also reports how many formations in the current faction roster are presently trainable.

## Enemy macro economy

The primary enemy is no longer supplied by a free formation timer.

It now maintains its own:

- Food / Wood / Stone / Gold stores;
- workforce;
- faction-weighted macro allocation;
- age;
- district list;
- construction decisions;
- formation-production decisions;
- territory income;
- population growth cadence.

### Enemy construction

The enemy periodically evaluates its district mix and pays the faction's real construction cost before placing a new district.

Its high-level priority is:

1. obtain a military district;
2. grow the economy;
3. add defenses;
4. continue scaling economy / military infrastructure as age allows.

The initial support structures created by the existing battle extension remain valid and are included in the enemy's district state.

### Enemy age advancement

Age advancement uses the same age costs as the player, including the existing Fatfrotz research penalty.

The enemy can only advance when it can actually pay the cost. Advancing adds workforce and increases its economy multiplier.

### Enemy formations

The enemy can only train formations whose age/building requirements are satisfied and whose faction-scaled cost it can pay.

Advanced formations therefore appear because the enemy developed into them, not because a random timer selected unit index 1.

Army size is bounded by enemy age and territory ownership so growth remains strategic rather than an unlimited spawn stream.

### Enemy orders

The enemy still commands formations at the macro level. It periodically chooses between:

- contesting the next strategic site;
- attacking the player's capital when sufficiently developed;
- reacting more aggressively if the player dominates territory.

No individual-unit APM behavior was added.

## Existing faction mechanics

The Phase-11 starter factions and Phase-12 Prismkin wildcard continue using `FactionRuntime` without special-case changes in the match loop.

This means the gameplay pass tests:

- Ironvale infrastructure discipline;
- Greenwake economy-district recovery;
- Ashwind forward momentum;
- Prismkin deterministic Drift / Focus / Mend resonance cycle;
- preserved existing faction mechanics.

## Local play checklist

When the branch reaches local runtime, verify:

1. Start a starter-faction match.
2. Confirm neither formation button can be trained before the military district exists.
3. Build the military district; confirm the first formation becomes trainable.
4. Reach Expansion Age; confirm the second formation becomes trainable.
5. Destroy / lose the military district; confirm future training locks again.
6. Watch enemy development for several minutes.
7. Confirm enemy districts appear only after the enemy can pay construction costs.
8. Confirm the enemy eventually reaches Expansion Age and can field its second formation.
9. Confirm the enemy does not receive unexplained free squads on the old fixed timer.
10. Check whether the enemy is too passive or too aggressive around the first strategic-site contest.
11. Compare Ironvale / Greenwake / Ashwind / Prismkin opening pacing.
12. Verify the income-per-second HUD roughly matches visible resource growth.
13. Confirm multi-seat patches still load and extra-seat behavior is not broken.

## Truth boundary

This phase is structurally inspected but not browser-playtested in this chat environment.

Construction remains immediate. Formation production also remains immediate in this phase; a muster/build-time queue is a natural later gameplay refinement after the first local pacing run establishes whether the economy and unlock timing already feel too slow or too fast.

The larger multiplayer, Battle Map runtime injection and network/provider adapters remain separate work.
