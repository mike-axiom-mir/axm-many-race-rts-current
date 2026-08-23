import { FactionPowerSystem } from "./factionPowerSystem.js";

FactionPowerSystem.prototype.updateActiveOwners = function safeFactionPowerLifecycle(dt) {
  const owners = new Set([
    ...Object.keys(this.world.__axmFactionByOwner || {}),
    ...this.world.entities.map(entity => entity.userData.owner).filter(Boolean)
  ]);

  for (const owner of owners) {
    const faction = this.factionFor(owner);
    if (!faction) continue;
    this.rememberEconomy(faction);
    const state = this.stateFor(owner);

    for (const actor of this.world.entities) {
      if (!actor.parent || actor.userData.hp <= 0 || actor.userData.owner !== owner) continue;
      if (actor.userData.type !== "squad" && actor.userData.type !== "founder") continue;
      this.clearActorPower(actor);
    }

    if (state.active && state.active.expiresAt <= this.time) {
      if (state.active.power.kind === "eco" && (owner === "player" || owner === "enemy")) this.restoreEconomy(faction);
      state.active = null;
    }

    this.applyEconomyLayer(owner, state.active);
    this.applyCombatLayer(owner, state.active, dt);
  }
};
