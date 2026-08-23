import * as THREE from "three";
import { RTSWorld } from "./world.js";

const originalTick = RTSWorld.prototype.tick;
const originalMovement = RTSWorld.prototype.updateMovement;

function sameTeam(world, ownerA, ownerB) {
  if (ownerA === ownerB) return true;
  const teams = world.__axmTeamByOwner || {};
  return teams[ownerA] != null && teams[ownerB] != null && teams[ownerA] === teams[ownerB];
}

export function supportEffectsFor(world, entity) {
  const effects = { armor: 0, damage: 1, speed: 1, healPerSecond: 0 };
  if (!entity?.parent || entity.userData?.hp <= 0) return effects;

  for (const source of world.entities) {
    if (!source.parent || source === entity || source.userData?.hp <= 0) continue;
    if (!sameTeam(world, source.userData?.owner, entity.userData?.owner)) continue;
    const aura = source.userData?.supportAura;
    if (!aura) continue;
    const radius = Math.max(1, Number(aura.radius || 0));
    if (source.position.distanceTo(entity.position) > radius) continue;
    const amount = Math.max(0, Number(aura.amount || 0));
    if (aura.kind === "armor") effects.armor = Math.min(.18, effects.armor + amount);
    if (aura.kind === "damage") effects.damage *= 1 + amount;
    if (aura.kind === "speed") effects.speed *= 1 + amount;
    if (aura.kind === "heal") effects.healPerSecond += amount;
  }
  return effects;
}

RTSWorld.prototype.updateMovement = function supportAwareMovement(entity, dt, time) {
  const data = entity.userData;
  if ((data.type !== "squad" && data.type !== "founder") || !data.target) return;
  const delta = data.target.clone().sub(entity.position);
  delta.y = 0;
  const dist = delta.length();
  if (dist < .65) { data.target = null; return; }
  delta.normalize();
  const support = supportEffectsFor(this, entity);
  const step = Math.min(dist, (data.speed || 3) * support.speed * dt);
  entity.position.addScaledVector(delta, step);
  entity.rotation.y = Math.atan2(delta.x, delta.z);
  const bounce = Math.sin(time * 9 + (data.phase || 0)) * .045;
  entity.position.y = Math.max(0, bounce);
};

RTSWorld.prototype.tick = function supportAuraTick(time, dt) {
  for (const entity of this.entities) {
    if (!entity.parent || entity.userData?.hp <= 0 || entity.userData?.type !== "squad") continue;
    const support = supportEffectsFor(this, entity);
    entity.userData.__axmSupportArmor = support.armor;
    entity.userData.__axmSupportDamage = support.damage;
    if (support.healPerSecond > 0 && entity.userData.hp < entity.userData.maxHp) {
      entity.userData.hp = Math.min(entity.userData.maxHp, entity.userData.hp + support.healPerSecond * dt);
    }
  }
  return originalTick.call(this, time, dt);
};

export function attachSupportAura(entity, aura) {
  if (!entity || !aura) return entity;
  entity.userData.supportAura = { ...aura };
  const radius = Math.max(1, Number(aura.radius || 5));
  const ring = new THREE.Mesh(
    new THREE.TorusGeometry(Math.min(2.8, .42 + radius * .18), .035, 5, 30),
    new THREE.MeshBasicMaterial({ color: 0xb7e6ff, transparent: true, opacity: .12, depthWrite: false })
  );
  ring.rotation.x = Math.PI / 2;
  ring.position.y = .08;
  ring.userData.pulse = true;
  entity.add(ring);
  entity.userData.__axmSupportRing = ring;
  return entity;
}
