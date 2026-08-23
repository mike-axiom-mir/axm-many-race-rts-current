# Phase 30 PR Notes

Battlefield and base-defense steward pass:

- active bases gain a neutral visual court, short Road approach/muster lane and small base landmarks;
- empty authored starts on larger maps are not decorated when their seats are inactive;
- court movement is exactly neutral; only the visible Road keeps the existing Road speed rule;
- defense towers within 18 units of a friendly-team capital prioritize threats closest to the core;
- Siege and already-committed capital attackers get extra target priority;
- tower raw HP/damage/range/fire cadence remain unchanged;
- every capital gains a weak 9.2-range, 12-damage, 1.9s emergency garrison shot;
- garrison uses existing projectile + fortification LOS and does not attack buildings;
- player HUD shows Base Defense state, linked towers and nearby threats;
- team/multi-seat capitals use the same rule;
- Phase-25 muzzle flash is reused while capital-only stale tower recoil state is explicitly cleared;
- no free militia, shield, repair aura, tower stat inflation or pathfinding rewrite;
- implemented/source-audited only; no local/browser runtime-success claim.
