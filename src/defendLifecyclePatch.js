let timer = null;

function attach() {
  const api = window.__AXM_DEFEND_WORKSHOP__;
  if (!api?.world || !api?.state || api.__socketLifecyclePatched) return false;
  api.__socketLifecyclePatched = true;
  const { world, state } = api;
  const original = world.removeEntity.bind(world);
  world.removeEntity = function defendLifecycleRemove(entity) {
    if (entity?.userData?.role === "defense" && entity.userData.seatId === "workshop") {
      const index = state.towers.indexOf(entity);
      if (index >= 0) {
        state.usedSockets.delete(index);
        state.towers[index] = null;
      }
    }
    return original(entity);
  };
  return true;
}

if (!attach()) {
  timer = setInterval(() => {
    if (attach() && timer) clearInterval(timer);
  }, 180);
}
