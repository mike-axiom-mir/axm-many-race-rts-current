import { RTSWorld } from "./world.js";
import { combatMultiplier, preferredTargetWeight, resolvedCombatProfile } from "./combatRules.js";

const originalSpawnSquad = RTSWorld.prototype.spawnSquad;
const originalSpawnBuilding = RTSWorld.prototype.spawnBuilding;
const originalSpawnCapital = RTSWorld.prototype.spawnCapital;
const originalSpawnFounder = RTSWorld.prototype.spawnFounder;

function sameTeam(world, ownerA, ownerB) {
  if (ownerA === ownerB) return true;
  const teams = world.__axmTeamByOwner || {};
  return teams[ownerA] != null && teams[ownerB] != null && teams[ownerA] === teams[ownerB];
}

function targetArmor(entity) {
  return Math.max(0, Math.min(.65, Number(entity?.userData?.combatArmor || entity?.userData?.armor || 0)));
}

function selectCombatTarget(world, attacker, maxDistance = Infinity) {
  let best = null;
  let bestDistance = maxDistance;
  let bestScore = maxDistance;
  for (const target of world.entities) {
    if (!target.parent || target === attacker || target.userData.hp <= 0) continue;
    if (!target.userData.owner || sameTeam(world, attacker.userData.owner, target.userData.owner)) continue;
    const distance = attacker.position.distanceTo(target.position) - (target.userData.radius || 0);
    if (distance > maxDistance) continue;
    const score = distance * preferredTargetWeight(attacker, target);
    if (score < bestScore) {
      best = target;
      bestDistance = distance;
      bestScore = score;
    }
  }
  return best ? { entity: best, distance: bestDistance } : null;
}

function applyFormationShape(group, role) {
  if (role === "legacy") return;
  const members = group.children.filter(child => child?.isGroup);
  if (!members.length) return;

  if (role === "ranged") {
    const spacing = .92;
    members.forEach((member, index) => {
      const row = Math.floor(index / 4);
      const inRow = Math.min(4, members.length - row * 4);
      const col = index % 4;
      member.position.x = (col - (inRow - 1) / 2) * spacing;
      member.position.z = (row - .35) * .92;
    });
  } else if (role === "mobile") {
    members.forEach((member, index) => {
      if (index === 0) member.position.set(0, 0, -.9);
      else {
        const row = Math.ceil(index / 2);
        const side = index % 2 ? -1 : 1;
        member.position.set(side * row * .58, 0, -.9 + row * .72);
      }
    });
  } else if (role === "siege") {
    members.forEach((member, index) => {
      member.position.set((index - (members.length - 1) / 2) * .82, 0, 0);
      member.scale.multiplyScalar(1.08);
    });
  } else {
    members.forEach((member, index) => {
      const row = Math.floor(index / 3);
      const col = index % 3;
      member.position.x = (col - 1) * .72;
      member.position.z = (row - .45) * .76;
    });
  }
}

RTSWorld.prototype.spawnSquad = function combatDepthSquad(unitDef, faction, pos, enemy = false, countOverride = null) {
  const count = countOverride || unitDef?.squadSize || null;
  const group = originalSpawnSquad.call(this, unitDef, faction, pos, enemy, count);
  const profile = resolvedCombatProfile(unitDef);
  group.userData.combatRole = profile.role;
  group.userData.combatArmor = profile.armor;
  group.userData.attackInterval = profile.attackInterval;
  group.userData.combatSummary = profile.description;
  group.userData.unitDef = unitDef?.id || null;
  applyFormationShape(group, profile.role);
  return group;
};

RTSWorld.prototype.spawnBuilding = function combatDepthBuilding(def, faction, pos, enemy = false) {
  const building = originalSpawnBuilding.call(this, def, faction, pos, enemy);
  if (Number(def?.hp) > 0) {
    building.userData.maxHp = Math.round(Number(def.hp) * (faction.building?.health || 1));
    building.userData.hp = building.userData.maxHp;
  }
  building.userData.combatArmor = Math.max(0, Math.min(.65, Number(def?.armor || 0)));
  if (Number(def?.defenseRange) > 0) building.userData.defenseRange = Number(def.defenseRange);
  if (Number(def?.fireInterval) > 0) building.userData.fireInterval = Number(def.fireInterval);
  if (Number(def?.projectileSpeed) > 0) building.userData.projectileSpeed = Number(def.projectileSpeed);
  if (Number(def?.projectileLifetime) > 0) building.userData.projectileLifetime = Number(def.projectileLifetime);
  return building;
};

RTSWorld.prototype.spawnCapital = function combatDepthCapital(faction, pos, enemy = false) {
  const capital = originalSpawnCapital.call(this, faction, pos, enemy);
  capital.userData.combatArmor = .12;
  return capital;
};

RTSWorld.prototype.spawnFounder = function combatDepthFounder(faction, pos, enemy = false) {
  const founder = originalSpawnFounder.call(this, faction, pos, enemy);
  founder.userData.combatRole = "line";
  founder.userData.combatArmor = .07;
  founder.userData.attackInterval = .82;
  return founder;
};

RTSWorld.prototype.updateCombat = function roleAwareCombat(entity, dt) {
  const data = entity.userData;
  if (data.type !== "squad" && data.type !== "founder") return;
  data.cooldown = Math.max(0, (data.cooldown || 0) - dt);
  const range = Number(data.range || 1.2);
  const contact = selectCombatTarget(this, entity, range + 1.5);
  if (!contact) return;

  if (contact.distance <= range + .6) {
    data.target = null;
    if (data.cooldown > 0) return;
    const roleMult = combatMultiplier(entity, contact.entity);
    const armorMult = 1 - targetArmor(contact.entity);
    const variance = data.combatRole === "legacy" ? (.72 + Math.random() * .20) : (.78 + Math.random() * .14);
    const hit = Math.max(1, Number(data.damage || 0) * roleMult * armorMult * variance);
    contact.entity.userData.hp -= hit;
    data.cooldown = Math.max(.35, Number(data.attackInterval || .85));
    if (contact.entity.userData.hp <= 0) this.removeEntity(contact.entity);
  } else if (!data.target) {
    data.target = contact.entity.position.clone();
  }
};
