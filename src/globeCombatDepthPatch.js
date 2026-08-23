import * as THREE from "three";
import { GlobeRTSWorld } from "./globeWorld.js";
import { combatMultiplier, preferredTargetWeight, resolvedCombatProfile } from "./combatRules.js";

const originalSpawnSquad = GlobeRTSWorld.prototype.spawnSquad;
const originalSpawnCapital = GlobeRTSWorld.prototype.spawnCapital;
const originalSpawnFounder = GlobeRTSWorld.prototype.spawnFounder;
const originalMovement = GlobeRTSWorld.prototype.updateMovement;
const originalTick = GlobeRTSWorld.prototype.tick;

function supportEffects(world, entity) {
  const effects = { armor: 0, damage: 1, speed: 1, heal: 0 };
  for (const source of world.entities) {
    if (!source.parent || source === entity || source.userData.hp <= 0 || source.userData.owner !== entity.userData.owner) continue;
    const aura = source.userData.supportAura;
    if (!aura || world.surfaceDistance(source, entity) > Number(aura.radius || 0)) continue;
    const amount = Math.max(0, Number(aura.amount || 0));
    if (aura.kind === "armor") effects.armor = Math.min(.18, effects.armor + amount);
    if (aura.kind === "damage") effects.damage *= 1 + amount;
    if (aura.kind === "speed") effects.speed *= 1 + amount;
    if (aura.kind === "heal") effects.heal += amount;
  }
  return effects;
}

function armorMultiplier(world, target) {
  const support = supportEffects(world, target);
  const armor = Math.max(0, Math.min(.65, Number(target?.userData?.combatArmor || 0) + support.armor));
  return 1 - armor;
}

function applyFormationShape(group, role) {
  if (role === "legacy") return;
  const members = group.children.filter(child => child?.isGroup);
  if (role === "ranged") {
    members.forEach((member, index) => {
      const row = Math.floor(index / 4), inRow = Math.min(4, members.length - row * 4);
      member.position.x = (index % 4 - (inRow - 1) / 2) * .68;
      member.position.z = (row - .3) * .72;
    });
  } else if (role === "mobile") {
    members.forEach((member, index) => {
      if (index === 0) member.position.set(0, 0, -.68);
      else { const row = Math.ceil(index / 2); member.position.set((index % 2 ? -1 : 1) * row * .44, 0, -.68 + row * .56); }
    });
  } else if (role === "siege") {
    members.forEach((member, index) => { member.position.set((index - (members.length - 1) / 2) * .62, 0, 0); member.scale.multiplyScalar(1.08); });
  }
}

function selectTarget(world, attacker, maxDistance) {
  let best = null, bestDistance = maxDistance, bestScore = maxDistance;
  for (const target of world.entities) {
    if (!target.parent || target === attacker || target.userData.hp <= 0 || target.userData.owner === attacker.userData.owner) continue;
    const distance = world.surfaceDistance(attacker, target) - (target.userData.radius || 0);
    if (distance > maxDistance) continue;
    const score = distance * preferredTargetWeight(attacker, target);
    if (score < bestScore) { best = target; bestDistance = distance; bestScore = score; }
  }
  return best ? { entity: best, distance: bestDistance } : null;
}

function attachAuraRing(squad, aura) {
  if (!aura) return;
  squad.userData.supportAura = { ...aura };
  const ring = new THREE.Mesh(
    new THREE.TorusGeometry(Math.min(1.7, .38 + Number(aura.radius || 5) * .12), .03, 5, 26),
    new THREE.MeshBasicMaterial({ color: 0xb7e6ff, transparent: true, opacity: .13, depthWrite: false })
  );
  ring.rotation.x = Math.PI / 2; ring.position.y = .06; squad.add(ring); squad.userData.__axmGlobeSupportRing = ring;
}

GlobeRTSWorld.prototype.spawnSquad = function globeRoleSquad(unitDef, faction, geo, enemy = false, countOverride = null) {
  const count = countOverride || unitDef?.squadSize || null;
  const squad = originalSpawnSquad.call(this, unitDef, faction, geo, enemy, count);
  const profile = resolvedCombatProfile(unitDef);
  squad.userData.combatRole = profile.role;
  squad.userData.combatArmor = profile.armor;
  squad.userData.attackInterval = profile.role === "legacy" ? .9 : profile.attackInterval;
  applyFormationShape(squad, profile.role);
  attachAuraRing(squad, unitDef?.support);
  return squad;
};

GlobeRTSWorld.prototype.spawnCapital = function globeRoleCapital(faction, geo, enemy = false) {
  const capital = originalSpawnCapital.call(this, faction, geo, enemy); capital.userData.combatArmor = .12; return capital;
};
GlobeRTSWorld.prototype.spawnFounder = function globeRoleFounder(faction, geo, enemy = false) {
  const founder = originalSpawnFounder.call(this, faction, geo, enemy); founder.userData.combatRole = "line"; founder.userData.combatArmor = .07; founder.userData.attackInterval = .82; return founder;
};

GlobeRTSWorld.prototype.updateMovement = function globeSupportMovement(entity, dt) {
  const originalSpeed = entity?.userData?.speed;
  if (originalSpeed && entity.userData.type === "squad") entity.userData.speed = originalSpeed * supportEffects(this, entity).speed;
  const result = originalMovement.call(this, entity, dt);
  if (originalSpeed) entity.userData.speed = originalSpeed;
  return result;
};

GlobeRTSWorld.prototype.updateCombat = function globeRoleCombat(entity, dt) {
  const data = entity.userData;
  if (data.type !== "squad" && data.type !== "founder") return;
  data.cooldown = Math.max(0, (data.cooldown || 0) - dt);
  const range = Number(data.range || 1.2), contact = selectTarget(this, entity, range + 2);
  if (!contact) return;
  if (contact.distance <= range + .55) {
    data.targetNormal = null;
    if (data.cooldown > 0) return;
    const support = supportEffects(this, entity);
    const variance = data.combatRole === "legacy" ? (.68 + Math.random() * .22) : (.76 + Math.random() * .16);
    const hit = Math.max(1, Number(data.damage || 0) * support.damage * combatMultiplier(entity, contact.entity) * armorMultiplier(this, contact.entity) * variance);
    contact.entity.userData.hp -= hit;
    data.cooldown = Math.max(.35, Number(data.attackInterval || .9));
    this.flashHit(contact.entity);
    if (contact.entity.userData.hp <= 0) this.removeEntity(contact.entity);
  } else if (!data.targetNormal) data.targetNormal = contact.entity.userData.normal.clone();
};

GlobeRTSWorld.prototype.tick = function globeSupportTick(time, dt) {
  for (const entity of this.entities) {
    if (!entity.parent || entity.userData.hp <= 0 || entity.userData.type !== "squad") continue;
    const support = supportEffects(this, entity);
    if (support.heal > 0 && entity.userData.hp < entity.userData.maxHp) entity.userData.hp = Math.min(entity.userData.maxHp, entity.userData.hp + support.heal * dt);
    const ring = entity.userData.__axmGlobeSupportRing;
    if (ring) { const pulse = 1 + Math.sin(time * 3 + (entity.userData.phase || 0)) * .06; ring.scale.setScalar(pulse); }
  }
  return originalTick.call(this, time, dt);
};
