import * as THREE from "three";

function sameTeam(world, ownerA, ownerB) {
  if (ownerA === ownerB) return true;
  const teams = world.__axmTeamByOwner || {};
  return teams[ownerA] != null && teams[ownerB] != null && teams[ownerA] === teams[ownerB];
}

function ownerProjectileColor(owner) {
  if (owner === "player") return 0x8de1ff;
  if (owner === "enemy") return 0xff818a;
  if (owner === "seat-3") return 0xffd66d;
  if (owner === "seat-4") return 0xc69cff;
  return 0xdde7ed;
}

export class DefenseSystem {
  constructor(world) {
    this.world = world;
    this.cooldowns = new Map();
    this.projectiles = [];
    this.group = new THREE.Group();
    this.world.scene.add(this.group);
  }

  reset() {
    for (const projectile of this.projectiles) this.group.remove(projectile.mesh);
    this.projectiles.length = 0;
    this.cooldowns.clear();
  }

  nearestTarget(building, range) {
    let best = null;
    let bestDistance = range;
    for (const entity of this.world.entities) {
      if (!entity.parent || entity.userData.hp <= 0) continue;
      if (sameTeam(this.world, entity.userData.owner, building.userData.owner)) continue;
      if (entity.userData.type !== "squad" && entity.userData.type !== "founder") continue;
      const distance = building.position.distanceTo(entity.position);
      if (distance < bestDistance) {
        best = entity;
        bestDistance = distance;
      }
    }
    return best;
  }

  fire(building, target) {
    const owner = building.userData.owner;
    const mesh = new THREE.Mesh(
      new THREE.SphereGeometry(.18, 7, 5),
      new THREE.MeshBasicMaterial({ color: ownerProjectileColor(owner) })
    );
    mesh.position.copy(building.position).add(new THREE.Vector3(0, 4.2, 0));
    this.group.add(mesh);
    this.projectiles.push({
      mesh,
      target,
      owner,
      damage: Math.max(7, building.userData.damage || 12),
      speed: Math.max(4, Number(building.userData.projectileSpeed) || 13),
      life: Math.max(1, Number(building.userData.projectileLife) || 2.5)
    });
  }

  updateTowers(dt) {
    for (const building of this.world.entities) {
      if (!building.parent || building.userData.hp <= 0) continue;
      if (building.userData.type !== "building" || building.userData.role !== "defense") continue;
      if ((building.userData.damage || 0) <= 0) continue;

      const cooldown = Math.max(0, (this.cooldowns.get(building) || 0) - dt);
      this.cooldowns.set(building, cooldown);
      if (cooldown > 0) continue;

      const range = Math.max(2, Number(building.userData.defenseRange) || 11.5);
      const target = this.nearestTarget(building, range);
      if (!target) continue;

      this.fire(building, target);
      this.cooldowns.set(building, Math.max(.18, Number(building.userData.fireInterval) || 1.25));
    }
  }

  updateProjectiles(dt) {
    for (let i = this.projectiles.length - 1; i >= 0; i--) {
      const projectile = this.projectiles[i];
      projectile.life -= dt;
      const target = projectile.target;

      if (!target?.parent || target.userData.hp <= 0 || projectile.life <= 0 || sameTeam(this.world, projectile.owner, target.userData.owner)) {
        this.group.remove(projectile.mesh);
        projectile.mesh.geometry.dispose();
        projectile.mesh.material.dispose();
        this.projectiles.splice(i, 1);
        continue;
      }

      const aim = target.position.clone().add(new THREE.Vector3(0, 1.0, 0));
      const delta = aim.sub(projectile.mesh.position);
      const distance = delta.length();
      if (distance <= .55) {
        target.userData.hp -= projectile.damage;
        if (target.userData.hp <= 0) this.world.removeEntity(target);
        this.group.remove(projectile.mesh);
        projectile.mesh.geometry.dispose();
        projectile.mesh.material.dispose();
        this.projectiles.splice(i, 1);
        continue;
      }

      delta.normalize();
      projectile.mesh.position.addScaledVector(delta, Math.min(distance, projectile.speed * dt));
      projectile.mesh.scale.setScalar(.9 + Math.sin(performance.now() * .02) * .12);
    }
  }

  update(dt) {
    this.updateTowers(dt);
    this.updateProjectiles(dt);
  }
}
