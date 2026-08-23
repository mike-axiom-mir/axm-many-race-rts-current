let timer = null;

function visibleEntity(entity) {
  return {
    type: entity.userData.type,
    label: entity.userData.label || entity.userData.id || entity.userData.type,
    owner: entity.userData.owner,
    seatId: entity.userData.seatId || null,
    hp: Math.max(0, Math.ceil(entity.userData.hp || 0)),
    maxHp: Math.max(0, Math.ceil(entity.userData.maxHp || 0)),
    position: [Number(entity.position.x.toFixed(2)), Number(entity.position.y.toFixed(2)), Number(entity.position.z.toFixed(2))]
  };
}

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

  api.sameInformationGate = true;
  api.getSeatObservation = seatId => {
    const seat = state.seats.find(item => item.id === seatId);
    if (!seat || seat.controller !== "connected-ai") return null;
    const workshop = state.workshop?.parent ? visibleEntity(state.workshop) : null;
    const allies = world.entities.filter(entity => entity.parent && entity.userData.hp > 0 && entity.userData.owner === "player").map(visibleEntity);
    const hostiles = world.entities.filter(entity => entity.parent && entity.userData.hp > 0 && entity.userData.owner === "enemy").map(visibleEntity);
    return {
      mode: "defend-workshop",
      seatId,
      factionId: seat.factionId,
      wave: state.wave,
      waveActive: state.waveActive,
      workshop,
      sharedSupply: Math.floor(state.supply),
      passiveSupplyPerSecond: Number(state.passiveRate.toFixed(2)),
      upgrades: [...state.upgrades],
      alliedEntities: allies,
      visibleHostiles: hostiles,
      note: "Survival currently uses shared team vision; this observation intentionally contains only state visible to the defending team."
    };
  };
  return true;
}

if (!attach()) {
  timer = setInterval(() => {
    if (attach() && timer) clearInterval(timer);
  }, 180);
}
