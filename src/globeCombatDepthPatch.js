import { GlobeRTSWorld } from "./globeWorld.js";
import { combatMultiplier, preferredTargetWeight, resolvedCombatProfile } from "./combatRules.js";

const originalSpawnSquad = GlobeRTSWorld.prototype.spawnSquad;
const originalSpawnCapital = GlobeRTSWorld.prototype.spawnCapital;
const originalSpawnFounder = GlobeRTSWorld.prototype.spawnFounder;

function armorMultiplier(target) {
  const armor = Math.max(0, Math.min(.65, Number(target?.userData?.combatArmor || 0)));
  return 1 - armor;
}

function applyFormationShape(group, role) {
  if (role === "legacy") return;
  const members = group.children.filter(child => child?.isGroup);
  if (role === "ranged") {
    members.forEach((member, index) => {
      const row = Math.floor(index / 4);
      const inRow = Math.min(4, members.length - row * 4);
      member.position.x = (index % 4 - (inRow - 1) / 2) * .68;
      member.position.z = (row - .3) * .72;
    });
  } else if (role === "mobile") {
    members.forEach((member, index) => {
      if (index === 0) member.position.set(0, 0, -.68);
      else {
        const row = Math.ceil(index / 2);
        member.position.set((index % 2 ? -1 : 1) * row * .44, 0, -.68 + row * .56);
      }
    });
  } else if (role === "siege") {
    members.forEach((member, index) => {
      member.position.set((index - (members.length - 1) / 2) * .62, 0, 0);
      member.scale.multiplyScalar(1.08);
    });
  }
}

function selectTarget(world, attacker, maxDistance) {
  let best = null;
  let bestDistance = maxDistance;
  let bestScore = maxDistance;
  for (const target of world.entities) {
    if (!target.parent || target === attacker || target.userData.hp <= 0) continue;
    if (target.userData.owner === attacker.userData.owner) continue;
    const distance = world.surfaceDistance(attacker, target) - (target.userData.radius || 0);
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

GlobeRTSWorld.prototype.spawnSquad = function globeRoleSquad(unitDef, faction, geo, enemy = false, countOverride = null) {
  const count = countOverride || unitDef?.squadSize || null;
  const squad = originalSpawnSquad.call(this, unitDef, faction, geo, enemy, count);
  const profile = resolvedCombatProfile(unitDef);
  squad.userData.combatRole = profile.role;
  squad.userData.combatArmor = profile.armor;
  squad.userData.attackInterval = profile.role === "legacy" ? .9 : profile.attackInterval;
  applyFormationShape(squad, profile.role);
  return squad;
};

GlobeRTSWorld.prototype.spawnCapital = function globeRoleCapital(faction, geo, enemy = false) {
  const capital = originalSpawnCapital.call(this, faction, geo, enemy);
  capital.userData.combatArmor = .12;
  return capital;
};

GlobeRTSWorld.prototype.spawnFounder = function globeRoleFounder(faction, geo, enemy = false) {
  const founder = originalSpawnFounder.call(this, faction, geo, enemy);
  founder.userData.combatRole = "line";
  founder.userData.combatArmor = .07;
  founder.userData.attackInterval = .82;
  return founder;
};

GlobeRTSWorld.prototype.updateCombat = function globeRoleCombat(entity, dt) {
  const data = entity.userData;
  if (data.type !== "squad" && data.type !== "founder") return;
  data.cooldown = Math.max(0, (data.cooldown || 0) - dt);
  const range = Number(data.range || 1.2);
  const contact = selectTarget(this, entity, range + 2);
  if (!contact) return;

  if (contact.distance <= range + .55) {
    data.targetNormal = null;
    if (data.cooldown > 0) return;
    const variance = data.combatRole === "legacy" ? (.68 + Math.random() * .22) : (.76 + Math.random() * .16);
    const hit = Math.max(1,
      Number(data.damage || 0) *
      combatMultiplier(entity, contact.entity) *
      armorMultiplier(contact.entity) *
      variance
    );
    contact.entity.userData.hp -= hit;
    data.cooldown = Math.max(.35, Number(data.attackInterval || .9));
    this.flashHit(contact.entity);
    if (contact.entity.userData.hp <= 0) this.removeEntity(contact.entity);
  } else if (!data.targetNormal) {
    data.targetNormal = contact.entity.userData.normal.clone();
  }
};
