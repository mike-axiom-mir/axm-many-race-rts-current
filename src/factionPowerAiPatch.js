import { FactionPowerSystem, FACTION_POWER_CATALOG } from "./factionPowerSystem.js";

const previousEnemyDecision = FactionPowerSystem.prototype.maybeUseEnemyPower;

FactionPowerSystem.prototype.maybeUseEnemyPower = function greedAwareEnemyPowerDecision() {
  const owner = "enemy";
  const faction = this.factionFor(owner);
  const powers = FACTION_POWER_CATALOG[faction?.id];
  const enemyState = this.stateFor(owner);
  const enemyCapitalAlive = this.world.entities.some(entity =>
    entity.parent && entity.userData.hp > 0 && entity.userData.owner === owner && entity.userData.type === "capital"
  );
  const playerCapitalAlive = this.world.entities.some(entity =>
    entity.parent && entity.userData.hp > 0 && entity.userData.owner === "player" && entity.userData.type === "capital"
  );
  if (!enemyCapitalAlive || !playerCapitalAlive) return;
  if (!powers || this.time < enemyState.aiNextDecision || this.cooldownRemaining(owner) > 0) {
    return previousEnemyDecision.call(this);
  }

  const playerState = this.stateFor("player");
  const playerGreed = playerState.active?.power?.kind === "eco" && playerState.active.expiresAt > this.time;
  const squads = this.world.entities.filter(entity =>
    entity.parent && entity.userData.hp > 0 && entity.userData.owner === owner && entity.userData.type === "squad"
  );

  // Economy greed is an opening, not an automatic punishment. The AI only
  // commits if it has at least a small real army and both sides can still fight.
  if (playerGreed && squads.length >= 3) {
    const result = this.activate(owner, powers.attack.id, "ai");
    enemyState.aiNextDecision = result.ok ? enemyState.cooldownUntil + .5 : this.time + 4;
    return;
  }

  return previousEnemyDecision.call(this);
};
