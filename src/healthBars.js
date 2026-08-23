import * as THREE from "three";

function heightFor(entity) {
  if (entity.userData.type === "capital") return 8.6;
  if (entity.userData.type === "building") {
    if (entity.userData.role === "wall") return 2.8;
    if (entity.userData.role === "gate") return 3.8;
    return entity.userData.role === "defense" ? 6.7 : 5.5;
  }
  if (entity.userData.type === "founder") return 3.2;
  return 2.8;
}

export class HealthBarSystem {
  constructor(world) {
    this.world = world;
    this.group = new THREE.Group();
    this.group.name = "health-bars";
    this.world.scene.add(this.group);
    this.bars = new Map();
  }

  reset() {
    for (const bar of this.bars.values()) this.disposeBar(bar);
    this.bars.clear();
    this.group.clear();
  }

  disposeBar(bar) {
    bar.root.parent?.remove(bar.root);
    bar.bg.geometry.dispose();
    bar.bg.material.dispose();
    bar.fill.geometry.dispose();
    bar.fill.material.dispose();
  }

  createBar(entity) {
    const root = new THREE.Group();
    const bg = new THREE.Mesh(
      new THREE.PlaneGeometry(2.15, .22),
      new THREE.MeshBasicMaterial({ color: 0x17202a, transparent: true, opacity: .88, depthTest: false, depthWrite: false })
    );
    const fillColor = entity.userData.owner === "player" ? 0x83e6ad : 0xf18c92;
    const fill = new THREE.Mesh(
      new THREE.PlaneGeometry(2.03, .12),
      new THREE.MeshBasicMaterial({ color: fillColor, transparent: true, opacity: .96, depthTest: false, depthWrite: false })
    );
    bg.renderOrder = 100;
    fill.renderOrder = 101;
    fill.position.z = .002;
    root.add(bg, fill);
    this.group.add(root);
    const bar = { root, bg, fill, entity, lastHp: entity.userData.hp };
    this.bars.set(entity, bar);
    return bar;
  }

  update() {
    const living = new Set(this.world.entities.filter(entity => entity.parent && entity.userData.hp > 0 && entity.userData.maxHp > 0));

    for (const [entity, bar] of [...this.bars.entries()]) {
      if (living.has(entity)) continue;
      this.disposeBar(bar);
      this.bars.delete(entity);
    }

    for (const entity of living) {
      const data = entity.userData;
      const fogHidden = entity.visible === false || data.__axmFogHidden;
      let bar = this.bars.get(entity);
      if (fogHidden) {
        if (bar) bar.root.visible = false;
        continue;
      }

      const damaged = data.hp < data.maxHp * .995;
      const alwaysShow = data.type === "capital";

      if (!damaged && !alwaysShow) {
        if (bar) bar.root.visible = false;
        continue;
      }

      if (!bar) bar = this.createBar(entity);
      bar.root.visible = true;
      bar.root.position.copy(entity.position);
      bar.root.position.y += heightFor(entity);
      bar.root.quaternion.copy(this.world.camera.quaternion);

      const ratio = THREE.MathUtils.clamp(data.hp / data.maxHp, 0, 1);
      bar.fill.scale.x = Math.max(.001, ratio);
      bar.fill.position.x = -(1 - ratio) * 1.015;

      if (data.hp < bar.lastHp) bar.root.scale.setScalar(1.08);
      else bar.root.scale.lerp(new THREE.Vector3(1, 1, 1), .18);
      bar.lastHp = data.hp;
    }
  }
}
