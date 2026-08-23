# Phase 25 PR Notes

Combat/death/destruction visual pass on top of Phase 24:

- real combat cooldown resets now drive role-aware formation attack poses;
- Founder attack animation is root-position safe;
- defensive-building projectile fire gains recoil and muzzle flash;
- authoritative gameplay removal still happens first through the existing `removeEntity()` path;
- Squad/Founder death uses lightweight fall/fade proxies rather than re-parenting the original dead entity;
- Buildings/Capitals/Walls/Gates use lightweight charred collapse proxies, then timed rubble with smoke/embers;
- original destroyed entities stay detached (`parent === null`) so existing gameplay existence checks remain truthful;
- wrecks remain visual-only and do not preserve collision, targetability or LOS authority;
- hostile aftermath follows current Fog-of-War point visibility rather than revealing off-screen deaths;
- reset clears all temporary combat aftermath;
- no HP, damage, cost, attack-interval, movement, collision, projectile or LOS balance changes;
- no local/browser runtime-success claim from this chat environment.
