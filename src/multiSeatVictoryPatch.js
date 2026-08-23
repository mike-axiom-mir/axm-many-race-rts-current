import { RTSWorld } from "./world.js";

const previousRemoveEntity = RTSWorld.prototype.removeEntity;

function sameTeam(world, ownerA, ownerB) {
  if (ownerA === ownerB) return true;
  const teams = world.__axmTeamByOwner || {};
  return teams[ownerA] != null && teams[ownerB] != null && teams[ownerA] === teams[ownerB];
}

function removeWithoutGameHook(world, entity) {
  const hook = world.hooks?.onEntityDestroyed;
  if (world.hooks) world.hooks.onEntityDestroyed = null;
  try {
    previousRemoveEntity.call(world, entity);
  } finally {
    if (world.hooks) world.hooks.onEntityDestroyed = hook;
  }
}

RTSWorld.prototype.removeEntity = function teamAwareRemoveEntity(entity) {
  const data = entity?.userData || {};
  if (data.type !== "capital" || !data.owner || data.owner === "player") {
    return previousRemoveEntity.call(this, entity);
  }

  const hostileToPlayer = !sameTeam(this, "player", data.owner);
  if (!hostileToPlayer) {
    removeWithoutGameHook(this, entity);
    return;
  }

  const remainingHostileCapitals = this.entities.filter(other =>
    other !== entity &&
    other.parent &&
    other.userData?.hp > 0 &&
    other.userData?.type === "capital" &&
    other.userData?.owner &&
    !sameTeam(this, "player", other.userData.owner)
  );

  if (remainingHostileCapitals.length > 0) {
    removeWithoutGameHook(this, entity);
    return;
  }

  if (data.owner === "enemy") {
    return previousRemoveEntity.call(this, entity);
  }

  // The legacy game closure only recognizes owner="enemy" as a victory.
  // Remove the actual final hostile capital silently, then report one synthetic
  // enemy-capital destruction event to the unchanged two-side end-game handler.
  removeWithoutGameHook(this, entity);
  this.hooks?.onEntityDestroyed?.({ userData: { type: "capital", owner: "enemy" } });
};
