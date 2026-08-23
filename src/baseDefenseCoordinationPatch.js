import { DefenseSystem } from "./defenseSystem.js";
import { firstLineOfSightBlocker } from "./fortificationLineOfSight.js";

export const BASE_DEFENSE_LINK_RADIUS = 18;
export const BASE_DEFENSE_ALERT_RADIUS = 16;
export const BASE_GARRISON_RANGE = 9.2;
export const BASE_GARRISON_INTERVAL = 1.9;
export const BASE_GARRISON_DAMAGE = 12;

const previousNearestTarget = DefenseSystem.prototype.nearestTarget;
const previousUpdateTowers = DefenseSystem.prototype.updateTowers;
const previousFire = DefenseSystem.prototype.fire;

function sameTeam(world, ownerA, ownerB) {
  if (ownerA === ownerB) return true;
  const teams = world?.__axmTeamByOwner || {};
  return teams[ownerA] != null && teams[ownerB] != null && teams[ownerA] === teams[ownerB];
}

function friendlyCapitals(world, owner) {
  return world.entities.filter(entity =>
    entity?.parent &&
    entity.userData?.hp > 0 &&
    entity.userData?.type === "capital" &&
    sameTeam(world, owner, entity.userData.owner)
  );
}

function nearestFriendlyCapital(world, owner, position) {
  let best = null;
  let bestDistance = Infinity;
  for (const capital of friendlyCapitals(world, owner)) {
    const distance = position.distanceTo(capital.position);
    if (distance < bestDistance) {
      best = capital;
      bestDistance = distance;
    }
  }
  return best ? { capital: best, distance: bestDistance } : null;
}

function hostileActors(world, owner) {
  return world.entities.filter(entity =>
    entity?.parent &&
    entity.userData?.hp > 0 &&
    entity.userData?.owner &&
    !sameTeam(world, owner, entity.userData.owner) &&
    (entity.userData.type === "squad" || entity.userData.type === "founder")
  );
}

function targetAimsAtCapital(target, capital) {
  const point = target?.userData?.target;
  if (!point || !capital?.position) return false;
  return Math.hypot(Number(point.x || 0) - capital.position.x, Number(point.z || 0) - capital.position.z) <= 6.5;
}

function baseThreatScore(target, towerDistance, capital) {
  const capitalDistance = capital.position.distanceTo(target.position) - Number(target.userData?.radius || 0);
  const siegePriority = target.userData?.combatRole === "siege" ? -3.2 : 0;
  const committedPriority = targetAimsAtCapital(target, capital) ? -2.0 : 0;
  return capitalDistance * .72 + towerDistance * .28 + siegePriority + committedPriority;
}

function linkedBaseTower(world, building) {
  if (building?.userData?.type !== "building" || building.userData.role !== "defense") return null;
  const link = nearestFriendlyCapital(world, building.userData.owner, building.position);
  if (!link || link.distance > BASE_DEFENSE_LINK_RADIUS) return null;
  return link.capital;
}

function playerCapital(world) {
  return world.entities.find(entity =>
    entity?.parent && entity.userData?.hp > 0 && entity.userData?.type === "capital" && entity.userData.owner === "player"
  ) || null;
}

function playerBaseSnapshot(world) {
  const capital = playerCapital(world);
  if (!capital) return { status: "OFFLINE", threats: 0, linkedTowers: 0, garrison: false };
  const threats = hostileActors(world, "player").filter(entity => capital.position.distanceTo(entity.position) <= BASE_DEFENSE_ALERT_RADIUS).length;
  const linkedTowers = world.entities.filter(entity =>
    entity?.parent && entity.userData?.hp > 0 && entity.userData?.type === "building" && entity.userData.role === "defense" &&
    sameTeam(world, "player", entity.userData.owner) && capital.position.distanceTo(entity.position) <= BASE_DEFENSE_LINK_RADIUS
  ).length;
  return {
    status: threats > 0 ? "ALERT" : "READY",
    threats,
    linkedTowers,
    garrison: threats > 0
  };
}

function ensureHud(world) {
  let root = document.getElementById("baseDefenseStatus");
  if (!root) {
    const domination = document.getElementById("mapDominationMomentum");
    const waypoint = document.getElementById("combatWaypointControls");
    const powers = document.getElementById("factionPowerButtons");
    const leftHud = document.getElementById("leftHud");
    const anchor = domination || waypoint || powers || leftHud;
    if (!anchor) return null;
    root = document.createElement("div");
    root.id = "baseDefenseStatus";
    root.innerHTML = `
      <div class="section-title"><span>Base defense</span><strong id="baseDefenseState">READY</strong></div>
      <div class="state-row"><span>Linked towers</span><b id="baseDefenseTowers">0</b></div>
      <div class="state-row"><span>Threats near capital</span><b id="baseDefenseThreats">0</b></div>
      <p class="hint">Nearby defense towers prioritize core threats. The capital has a weak 9.2-range emergency garrison shot.</p>`;
    if (anchor === leftHud) leftHud.appendChild(root);
    else anchor.insertAdjacentElement("afterend", root);
  }
  world.__axmBaseDefenseHud = root;
  return root;
}

function renderHud(world) {
  const root = ensureHud(world);
  if (!root) return;
  const snapshot = playerBaseSnapshot(world);
  const signature = `${snapshot.status}:${snapshot.threats}:${snapshot.linkedTowers}`;
  if (world.__axmBaseDefenseHudSignature === signature) return;
  world.__axmBaseDefenseHudSignature = signature;
  const state = root.querySelector("#baseDefenseState");
  const towers = root.querySelector("#baseDefenseTowers");
  const threats = root.querySelector("#baseDefenseThreats");
  if (state) state.textContent = snapshot.status;
  if (towers) towers.textContent = String(snapshot.linkedTowers);
  if (threats) threats.textContent = String(snapshot.threats);
}

DefenseSystem.prototype.nearestTarget = function baseDefenseNearestTarget(building, range) {
  const capital = linkedBaseTower(this.world, building);
  if (!capital) return previousNearestTarget.call(this, building, range);

  let best = null;
  let bestScore = Infinity;
  for (const entity of hostileActors(this.world, building.userData.owner)) {
    const towerDistance = building.position.distanceTo(entity.position);
    if (towerDistance >= range) continue;
    const blocker = firstLineOfSightBlocker(this.world, building, entity, { ignore: [building, entity] });
    if (blocker) continue;
    const score = baseThreatScore(entity, towerDistance, capital);
    if (score < bestScore) {
      best = entity;
      bestScore = score;
    }
  }
  return best;
};

DefenseSystem.prototype.fire = function baseDefenseFire(source, target) {
  const isCapital = source?.userData?.type === "capital";
  if (!isCapital) return previousFire.call(this, source, target);

  const savedDamage = source.userData.damage;
  const savedSpeed = source.userData.projectileSpeed;
  const savedLifetime = source.userData.projectileLifetime;
  source.userData.damage = BASE_GARRISON_DAMAGE;
  source.userData.projectileSpeed = 14;
  source.userData.projectileLifetime = 1.65;
  const result = previousFire.call(this, source, target);
  source.userData.damage = savedDamage;
  source.userData.projectileSpeed = savedSpeed;
  source.userData.projectileLifetime = savedLifetime;
  return result;
};

DefenseSystem.prototype.updateTowers = function coordinatedBaseDefenseUpdate(dt) {
  previousUpdateTowers.call(this, dt);

  for (const capital of this.world.entities) {
    if (!capital?.parent || capital.userData?.hp <= 0 || capital.userData?.type !== "capital") continue;
    const cooldown = Math.max(0, Number(this.cooldowns.get(capital) || 0) - dt);
    this.cooldowns.set(capital, cooldown);
    if (cooldown > 0) continue;
    const target = previousNearestTarget.call(this, capital, BASE_GARRISON_RANGE);
    if (!target) continue;
    this.fire(capital, target);
    this.cooldowns.set(capital, BASE_GARRISON_INTERVAL);
  }

  renderHud(this.world);
};

window.AXMBaseDefense = {
  constants: {
    linkRadius: BASE_DEFENSE_LINK_RADIUS,
    alertRadius: BASE_DEFENSE_ALERT_RADIUS,
    garrisonRange: BASE_GARRISON_RANGE,
    garrisonInterval: BASE_GARRISON_INTERVAL,
    garrisonDamage: BASE_GARRISON_DAMAGE
  },
  snapshot() {
    const world = window.__AXM_RTS_WORLD__;
    return world ? playerBaseSnapshot(world) : null;
  }
};
