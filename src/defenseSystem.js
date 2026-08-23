import * as THREE from "three";

export class DefenseSystem {
  constructor(world) {
    this.world = world;
    this.cooldowns = new Map();
    this.projectiles = [];
    this.group = new THREE.Group();
    this.world.scene.add(this.group);
    this.playerColor = 0x8de1ff;
    this.enemyColor = 0xff818a;
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
      if (entity.userData.owner === building.userData.owner) continue;
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
      new THREE.MeshBasicMaterial({ color: owner === "player" ? this.playerColor : this.enemyColor })
    );
    mesh.position.copy(building.position).add(new THREE.Vector3(0, 4.2, 0));
    this.group.add(mesh);
    this.projectiles.push({
      mesh,
      target,
      owner,
      damage: Math.max(7, building.userData.damage || 12),
      speed: 13,
      life: 2.5
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

      const target = this.nearestTarget(building, 11.5);
      if (!target) continue;

      this.fire(building, target);
      this.cooldowns.set(building, 1.25);
    }
  }

  updateProjectiles(dt) {
    for (let i = this.projectiles.length - 1; i >= 0; i--) {
      const projectile = this.projectiles[i];
      projectile.life -= dt;
      const target = projectile.target;

      if (!target?.parent || target.userData.hp <= 0 || projectile.life <= 0) {
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
