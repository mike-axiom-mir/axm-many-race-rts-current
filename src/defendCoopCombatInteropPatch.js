let timer = null;

function attach() {
  const api = window.__AXM_DEFEND_WORKSHOP__;
  if (!api?.world || !api?.state || !api.__coopSectorPatched || api.__coopCombatInteropPatched) return false;
  api.__coopCombatInteropPatched = true;
  const { world, state } = api;
  const originalTick = world.tick.bind(world);
  world.tick = function coopCombatInteropTick(time, dt) {
    const result = originalTick(time, dt);
    if (!state.started || state.ended) return result;
    for (const entity of world.entities || []) {
      if (!entity?.parent || entity.userData?.hp <= 0 || entity.userData?.owner !== "enemy" || entity.userData.type !== "squad") continue;
      const range = Number(entity.userData.range || 1.2);
      const contact = world.nearestEnemy(entity, range + 1.7);
      if (!contact?.entity?.parent) continue;
      entity.userData.target = contact.entity.position.clone();
    }
    return result;
  };
  return true;
}

if (!attach()) {
  timer = setInterval(() => {
    if (attach() && timer) clearInterval(timer);
  }, 120);
}
