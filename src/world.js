import * as THREE from "three";
import { Canvas2DRenderer } from "./canvas2dRenderer.js";

const UP = new THREE.Vector3(0, 1, 0);

function seeded(seed = 1337) {
  let s = seed >>> 0;
  return () => {
    s = (s * 1664525 + 1013904223) >>> 0;
    return s / 4294967296;
  };
}

function material(color, roughness = .88) {
  return new THREE.MeshStandardMaterial({ color, roughness, metalness: .04, flatShading: true });
}

function shadow(mesh) {
  mesh.castShadow = true;
  mesh.receiveShadow = true;
  return mesh;
}

export class RTSWorld {
  constructor(container, hooks = {}) {
    this.container = container;
    this.hooks = hooks;
    this.scene = new THREE.Scene();
    this.scene.background = new THREE.Color(0x8eb4c4);
    this.scene.fog = new THREE.FogExp2(0x8eb4c4, .0105);

    try {
      this.renderer = new THREE.WebGLRenderer({ antialias: true, powerPreference: "high-performance" });
      this.presentationMode = "webgl";
    } catch (error) {
      console.warn("AXM RTS: WebGL unavailable; activating Canvas 2D presentation fallback.", error);
      this.renderer = new Canvas2DRenderer(() => this);
      this.presentationMode = "canvas2d";
    }
    this.renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 1.75));
    this.renderer.shadowMap.enabled = true;
    this.renderer.shadowMap.type = THREE.PCFSoftShadowMap;
    this.renderer.outputColorSpace = THREE.SRGBColorSpace;
    container.appendChild(this.renderer.domElement);

    this.camera = new THREE.OrthographicCamera(-30, 30, 22, -22, .1, 300);
    this.camera.position.set(32, 42, 34);
    this.cameraTarget = new THREE.Vector3(0, 0, 0);
    this.cameraZoom = 1;

    this.raycaster = new THREE.Raycaster();
    this.pointer = new THREE.Vector2();
    this.keys = new Set();
    this.drag = null;
    this.entities = [];
    this.dynamic = new THREE.Group();
    this.scene.add(this.dynamic);

    this.makeLights();
    this.makeTerrain();
    this.makeScenery();
    this.bindInput();
    this.resize();
    window.addEventListener("resize", () => this.resize());
  }

  makeLights() {
    const hemi = new THREE.HemisphereLight(0xe9f7ff, 0x43543b, 2.0);
    this.scene.add(hemi);
    const sun = new THREE.DirectionalLight(0xfff0cf, 3.3);
    sun.position.set(-28, 48, 22);
    sun.castShadow = true;
    sun.shadow.mapSize.set(2048, 2048);
    sun.shadow.camera.left = -55;
    sun.shadow.camera.right = 55;
    sun.shadow.camera.top = 45;
    sun.shadow.camera.bottom = -45;
    sun.shadow.camera.near = 1;
    sun.shadow.camera.far = 120;
    this.scene.add(sun);
  }

  makeTerrain() {
    const groundGeo = new THREE.PlaneGeometry(100, 72, 32, 24);
    groundGeo.rotateX(-Math.PI / 2);
    const pos = groundGeo.attributes.position;
    for (let i = 0; i < pos.count; i++) {
      const x = pos.getX(i), z = pos.getZ(i);
      const edge = Math.max(0, (Math.abs(x) - 32) / 20) + Math.max(0, (Math.abs(z) - 21) / 14);
      const y = Math.sin(x * .13) * .16 + Math.cos(z * .18) * .12 + edge * .18;
      pos.setY(i, y);
    }
    groundGeo.computeVertexNormals();
    this.ground = shadow(new THREE.Mesh(groundGeo, material(0x76985f)));
    this.ground.name = "ground";
    this.scene.add(this.ground);

    const grid = new THREE.GridHelper(100, 50, 0x537044, 0x658454);
    grid.position.y = .035;
    grid.material.opacity = .14;
    grid.material.transparent = true;
    this.scene.add(grid);

    const roadMat = new THREE.MeshStandardMaterial({ color: 0xb09b73, roughness: 1, transparent: true, opacity: .7 });
    const road1 = new THREE.Mesh(new THREE.PlaneGeometry(78, 4), roadMat);
    road1.rotation.x = -Math.PI / 2;
    road1.rotation.z = -.16;
    road1.position.y = .06;
    this.scene.add(road1);

    const road2 = new THREE.Mesh(new THREE.PlaneGeometry(4, 50), roadMat.clone());
    road2.rotation.x = -Math.PI / 2;
    road2.rotation.z = .12;
    road2.position.y = .065;
    this.scene.add(road2);

    this.controlPoint = new THREE.Group();
    const ring = new THREE.Mesh(new THREE.TorusGeometry(4.2, .28, 8, 36), material(0xd6c585));
    ring.rotation.x = Math.PI / 2;
    ring.position.y = .18;
    this.controlPoint.add(ring);
    const pillar = new THREE.Mesh(new THREE.CylinderGeometry(.7, 1.05, 3.2, 8), material(0x7b725e));
    pillar.position.y = 1.65;
    this.controlPoint.add(shadow(pillar));
    const crystal = new THREE.Mesh(new THREE.OctahedronGeometry(.9), material(0x8bd9ff, .35));
    crystal.position.y = 3.7;
    crystal.userData.spin = .55;
    this.controlPoint.add(shadow(crystal));
    this.controlPoint.position.set(0, 0, 0);
    this.scene.add(this.controlPoint);
  }

  makeScenery() {
    const rng = seeded(20260623);
    const staticGroup = new THREE.Group();
    const treeTrunk = material(0x684c31);
    const treeLeaf = [material(0x365f38), material(0x416f3d), material(0x527c45)];
    const rockMat = [material(0x777b78), material(0x8b8d87), material(0x676e71)];

    for (let i = 0; i < 90; i++) {
      const side = i % 2 ? -1 : 1;
      const x = side * (25 + rng() * 22) + (rng() - .5) * 5;
      const z = (rng() - .5) * 62;
      if (Math.abs(z) < 8 && Math.abs(x) < 34) continue;
      const tree = new THREE.Group();
      const trunk = shadow(new THREE.Mesh(new THREE.CylinderGeometry(.18, .28, 1.7, 6), treeTrunk));
      trunk.position.y = .85;
      const crown = shadow(new THREE.Mesh(new THREE.ConeGeometry(1.05 + rng() * .5, 2.6, 7), treeLeaf[i % treeLeaf.length]));
      crown.position.y = 2.35;
      tree.add(trunk, crown);
      tree.position.set(x, 0, z);
      tree.rotation.y = rng() * Math.PI;
      tree.scale.setScalar(.75 + rng() * .55);
      staticGroup.add(tree);
    }

    for (let i = 0; i < 34; i++) {
      const rock = shadow(new THREE.Mesh(new THREE.DodecahedronGeometry(.55 + rng() * .75, 0), rockMat[i % rockMat.length]));
      const angle = rng() * Math.PI * 2;
      const radius = 11 + rng() * 32;
      rock.position.set(Math.cos(angle) * radius, .45, Math.sin(angle) * radius * .72);
      rock.rotation.set(rng(), rng(), rng());
      rock.scale.y = .65 + rng() * .5;
      staticGroup.add(rock);
    }
    this.scene.add(staticGroup);
  }

  bindInput() {
    const canvas = this.renderer.domElement;
    window.addEventListener("keydown", e => this.keys.add(e.key.toLowerCase()));
    window.addEventListener("keyup", e => this.keys.delete(e.key.toLowerCase()));

    canvas.addEventListener("wheel", e => {
      e.preventDefault();
      this.cameraZoom = THREE.MathUtils.clamp(this.cameraZoom * (e.deltaY > 0 ? .90 : 1.10), .62, 1.9);
      this.camera.zoom = this.cameraZoom;
      this.camera.updateProjectionMatrix();
    }, { passive: false });

    canvas.addEventListener("pointerdown", e => {
      canvas.setPointerCapture?.(e.pointerId);
      this.drag = { id: e.pointerId, x: e.clientX, y: e.clientY, sx: e.clientX, sy: e.clientY };
    });

    canvas.addEventListener("pointermove", e => {
      if (!this.drag || this.drag.id !== e.pointerId) return;
      const dx = e.clientX - this.drag.x;
      const dy = e.clientY - this.drag.y;
      if (Math.hypot(e.clientX - this.drag.sx, e.clientY - this.drag.sy) > 5) {
        const scale = .045 / this.cameraZoom;
        this.cameraTarget.x -= (dx - dy) * scale;
        this.cameraTarget.z -= (dx + dy) * scale;
        this.clampCamera();
      }
      this.drag.x = e.clientX;
      this.drag.y = e.clientY;
    });

    canvas.addEventListener("pointerup", e => {
      if (!this.drag || this.drag.id !== e.pointerId) return;
      const wasTap = Math.hypot(e.clientX - this.drag.sx, e.clientY - this.drag.sy) < 5;
      if (wasTap) {
        const point = this.pickGround(e.clientX, e.clientY);
        if (point && this.hooks.onGroundClick) this.hooks.onGroundClick(point);
      }
      this.drag = null;
    });
  }

  resize() {
    const w = Math.max(1, this.container.clientWidth);
    const h = Math.max(1, this.container.clientHeight);
    const aspect = w / h;
    const view = 24;
    this.camera.left = -view * aspect;
    this.camera.right = view * aspect;
    this.camera.top = view;
    this.camera.bottom = -view;
    this.camera.updateProjectionMatrix();
    this.renderer.setSize(w, h, false);
  }

  pickGround(clientX, clientY) {
    const r = this.renderer.domElement.getBoundingClientRect();
    this.pointer.x = ((clientX - r.left) / r.width) * 2 - 1;
    this.pointer.y = -((clientY - r.top) / r.height) * 2 + 1;
    this.raycaster.setFromCamera(this.pointer, this.camera);
    return this.raycaster.intersectObject(this.ground, false)[0]?.point?.clone() || null;
  }

  clampCamera() {
    this.cameraTarget.x = THREE.MathUtils.clamp(this.cameraTarget.x, -31, 31);
    this.cameraTarget.z = THREE.MathUtils.clamp(this.cameraTarget.z, -21, 21);
  }

  resetDynamic() {
    for (const child of [...this.dynamic.children]) this.disposeObject(child);
    this.dynamic.clear();
    this.entities.length = 0;
  }

  disposeObject(root) {
    root.traverse(obj => {
      obj.geometry?.dispose?.();
      if (Array.isArray(obj.material)) obj.material.forEach(m => m.dispose?.());
      else obj.material?.dispose?.();
    });
  }

  makeBanner(color, enemy = false) {
    const group = new THREE.Group();
    const pole = shadow(new THREE.Mesh(new THREE.CylinderGeometry(.045, .06, 2.5, 6), material(0x4b4035)));
    pole.position.y = 1.25;
    const flag = new THREE.Mesh(new THREE.PlaneGeometry(1.05, .7, 3, 1), new THREE.MeshStandardMaterial({ color: enemy ? 0xb93e4b : color, side: THREE.DoubleSide, roughness: .8 }));
    flag.position.set(.52, 2.05, 0);
    flag.userData.wave = Math.random() * 10;
    group.add(pole, flag);
    return group;
  }

  spawnCapital(faction, pos, enemy = false) {
    const group = new THREE.Group();
    const baseColor = enemy ? 0x6f3940 : faction.color;
    const wall = material(baseColor);
    const dark = material(enemy ? 0x3b2428 : 0x31424b);
    const base = shadow(new THREE.Mesh(new THREE.CylinderGeometry(3.8, 4.5, 1.2, 8), dark));
    base.position.y = .6;
    const keep = shadow(new THREE.Mesh(new THREE.BoxGeometry(4.8, 4.2, 4.8), wall));
    keep.position.y = 3.0;
    const roof = shadow(new THREE.Mesh(new THREE.ConeGeometry(3.5, 2.2, 8), material(enemy ? 0x542b31 : faction.accent)));
    roof.position.y = 6.1;
    group.add(base, keep, roof);
    for (const [x, z] of [[-2.4,-2.4],[2.4,-2.4],[-2.4,2.4],[2.4,2.4]]) {
      const tower = shadow(new THREE.Mesh(new THREE.CylinderGeometry(.72,.85,4.8,8), wall));
      tower.position.set(x, 2.6, z);
      group.add(tower);
    }
    const banner = this.makeBanner(faction.color, enemy);
    banner.position.set(0, 4.0, 0);
    group.add(banner);
    group.position.copy(pos);
    group.userData = { type: "capital", owner: enemy ? "enemy" : "player", hp: 1300, maxHp: 1300, damage: 0, radius: 4.5 };
    this.dynamic.add(group);
    this.entities.push(group);
    return group;
  }

  spawnBuilding(def, faction, pos, enemy = false) {
    const group = new THREE.Group();
    const ownerColor = enemy ? 0x8d3f4a : faction.color;
    const bodyMat = material(ownerColor);
    const darkMat = material(enemy ? 0x38262a : 0x354650);
    const role = def.role || "economy";

    const pad = shadow(new THREE.Mesh(new THREE.CylinderGeometry(2.15, 2.4, .5, 8), darkMat));
    pad.position.y = .25;
    group.add(pad);

    if (role === "defense") {
      const tower = shadow(new THREE.Mesh(new THREE.CylinderGeometry(1.15, 1.5, 4.8, 8), bodyMat));
      tower.position.y = 2.65;
      group.add(tower);
      const crown = shadow(new THREE.Mesh(new THREE.ConeGeometry(1.65, 1.5, 8), material(faction.accent)));
      crown.position.y = 5.6;
      group.add(crown);
    } else if (role === "military") {
      const hall = shadow(new THREE.Mesh(new THREE.BoxGeometry(3.7, 2.5, 3.2), bodyMat));
      hall.position.y = 1.5;
      group.add(hall);
      const roof = shadow(new THREE.Mesh(new THREE.ConeGeometry(3.0, 1.8, 4), material(faction.accent)));
      roof.position.y = 3.7;
      roof.rotation.y = Math.PI / 4;
      group.add(roof);
      const rotor = shadow(new THREE.Mesh(new THREE.BoxGeometry(.18, 3.0, .18), darkMat));
      rotor.position.set(2.0, 3.0, 0);
      rotor.rotation.z = Math.PI / 2;
      rotor.userData.spinZ = .9;
      group.add(rotor);
    } else {
      const hall = shadow(new THREE.Mesh(new THREE.BoxGeometry(3.8, 2.2, 3.3), bodyMat));
      hall.position.y = 1.35;
      group.add(hall);
      const roof = shadow(new THREE.Mesh(new THREE.ConeGeometry(2.8, 1.5, 4), material(faction.accent)));
      roof.position.y = 3.2;
      roof.rotation.y = Math.PI / 4;
      group.add(roof);
      const chimney = shadow(new THREE.Mesh(new THREE.CylinderGeometry(.25,.35,2.0,6), darkMat));
      chimney.position.set(1.2, 3.0, .8);
      chimney.userData.pulse = true;
      group.add(chimney);
    }

    group.position.copy(pos);
    group.rotation.y = Math.round(Math.random() * 3) * Math.PI / 2;
    const maxHp = Math.round((role === "defense" ? 650 : 480) * (faction.building?.health || 1));
    group.userData = { type: "building", role, id: def.id, owner: enemy ? "enemy" : "player", hp: maxHp, maxHp, damage: def.defense || 0, radius: 2.4 };
    this.dynamic.add(group);
    this.entities.push(group);
    return group;
  }

  makeSoldier(color, accent, founder = false) {
    const unit = new THREE.Group();
    const body = shadow(new THREE.Mesh(new THREE.CylinderGeometry(founder ? .32 : .24, founder ? .38 : .3, founder ? 1.15 : .9, 7), material(color)));
    body.position.y = founder ? .85 : .68;
    const head = shadow(new THREE.Mesh(new THREE.SphereGeometry(founder ? .31 : .23, 7, 5), material(0xe0b48b)));
    head.position.y = founder ? 1.62 : 1.28;
    const hat = shadow(new THREE.Mesh(new THREE.ConeGeometry(founder ? .42 : .3, founder ? .55 : .36, 7), material(accent)));
    hat.position.y = founder ? 2.0 : 1.6;
    const weapon = shadow(new THREE.Mesh(new THREE.BoxGeometry(.09, founder ? 1.25 : .9, .09), material(0x6f5a42)));
    weapon.position.set(.34, founder ? .85 : .7, 0);
    weapon.rotation.z = -.28;
    weapon.userData.swing = Math.random() * Math.PI * 2;
    unit.add(body, head, hat, weapon);
    unit.userData.walkParts = [body, head, hat, weapon];
    return unit;
  }

  spawnFounder(faction, pos, enemy = false) {
    const group = this.makeSoldier(enemy ? 0xa74752 : faction.color, enemy ? 0xf0a0a8 : faction.accent, true);
    group.scale.setScalar(1.35);
    group.position.copy(pos);
    group.userData = { ...group.userData, type: "founder", owner: enemy ? "enemy" : "player", hp: 320, maxHp: 320, damage: 22, speed: 3.2, radius: .8, target: null, label: enemy ? "Enemy Founder" : faction.founder, phase: Math.random() * 10 };
    this.dynamic.add(group);
    this.entities.push(group);
    return group;
  }

  spawnSquad(unitDef, faction, pos, enemy = false, countOverride = null) {
    const group = new THREE.Group();
    const count = countOverride || faction.military?.squadSize || 5;
    for (let i = 0; i < count; i++) {
      const soldier = this.makeSoldier(enemy ? 0xa94752 : faction.color, enemy ? 0xf0abb0 : faction.accent, false);
      const row = Math.floor(i / 3), col = i % 3;
      soldier.position.set((col - 1) * .75 + (Math.random()-.5)*.08, 0, (row - .5) * .8 + (Math.random()-.5)*.08);
      soldier.userData.phase = i * .7 + Math.random();
      group.add(soldier);
    }
    group.position.copy(pos);
    const scale = faction.military || { health:1, damage:1, speed:1 };
    const maxHp = Math.round(unitDef.hp * count * (scale.health || 1));
    group.userData = {
      type: "squad", id: unitDef.id, owner: enemy ? "enemy" : "player", hp: maxHp, maxHp,
      damage: unitDef.damage * count * (scale.damage || 1), speed: unitDef.speed * (scale.speed || 1),
      range: unitDef.range || 1.2, radius: 1.3, target: null, label: unitDef.name, phase: Math.random() * 10,
      cooldown: 0
    };
    this.dynamic.add(group);
    this.entities.push(group);
    return group;
  }

  command(owner, point) {
    for (const e of this.entities) {
      if (e.userData.owner !== owner) continue;
      if (e.userData.type !== "squad" && e.userData.type !== "founder") continue;
      e.userData.target = point.clone();
    }
  }

  getLiving(owner, type = null) {
    return this.entities.filter(e => e.parent && e.userData.owner === owner && (!type || e.userData.type === type) && e.userData.hp > 0);
  }

  removeEntity(entity) {
    const idx = this.entities.indexOf(entity);
    if (idx >= 0) this.entities.splice(idx, 1);
    if (entity.parent) entity.parent.remove(entity);
    this.hooks.onEntityDestroyed?.(entity);
  }

  nearestEnemy(entity, maxDistance = Infinity) {
    let best = null, bestD = maxDistance;
    for (const other of this.entities) {
      if (!other.parent || other === entity || other.userData.hp <= 0 || other.userData.owner === entity.userData.owner) continue;
      const d = entity.position.distanceTo(other.position) - (other.userData.radius || 0);
      if (d < bestD) { best = other; bestD = d; }
    }
    return best ? { entity: best, distance: bestD } : null;
  }

  updateCombat(entity, dt) {
    const data = entity.userData;
    if (data.type !== "squad" && data.type !== "founder") return;
    data.cooldown = Math.max(0, (data.cooldown || 0) - dt);
    const contact = this.nearestEnemy(entity, (data.range || 1.2) + 1.5);
    if (!contact) return;
    if (contact.distance <= (data.range || 1.2) + .6) {
      data.target = null;
      if (data.cooldown <= 0) {
        const hit = data.damage * (.72 + Math.random() * .2);
        contact.entity.userData.hp -= hit;
        data.cooldown = .85;
        if (contact.entity.userData.hp <= 0) this.removeEntity(contact.entity);
      }
    } else if (!data.target) {
      data.target = contact.entity.position.clone();
    }
  }

  updateMovement(entity, dt, time) {
    const data = entity.userData;
    if ((data.type !== "squad" && data.type !== "founder") || !data.target) return;
    const delta = data.target.clone().sub(entity.position);
    delta.y = 0;
    const dist = delta.length();
    if (dist < .65) { data.target = null; return; }
    delta.normalize();
    const step = Math.min(dist, (data.speed || 3) * dt);
    entity.position.addScaledVector(delta, step);
    entity.rotation.y = Math.atan2(delta.x, delta.z);
    const bounce = Math.sin(time * 9 + (data.phase || 0)) * .045;
    entity.position.y = Math.max(0, bounce);
  }

  updateDecorations(root, time, dt) {
    root.traverse(obj => {
      if (obj.userData.spin) obj.rotation.y += obj.userData.spin * dt;
      if (obj.userData.spinZ) obj.rotation.z += obj.userData.spinZ * dt;
      if (obj.userData.wave !== undefined) obj.rotation.y = Math.sin(time * 2 + obj.userData.wave) * .10;
      if (obj.userData.swing !== undefined) obj.rotation.z = -.28 + Math.sin(time * 8 + obj.userData.swing) * .16;
      if (obj.userData.pulse) obj.scale.y = .96 + Math.sin(time * 2.2) * .04;
    });
  }

  updateCamera(dt) {
    const speed = 15 * dt / this.cameraZoom;
    if (this.keys.has("w") || this.keys.has("arrowup")) this.cameraTarget.z -= speed;
    if (this.keys.has("s") || this.keys.has("arrowdown")) this.cameraTarget.z += speed;
    if (this.keys.has("a") || this.keys.has("arrowleft")) this.cameraTarget.x -= speed;
    if (this.keys.has("d") || this.keys.has("arrowright")) this.cameraTarget.x += speed;
    this.clampCamera();
    const offset = new THREE.Vector3(32, 42, 34);
    this.camera.position.copy(this.cameraTarget).add(offset);
    this.camera.lookAt(this.cameraTarget);
  }

  tick(time, dt) {
    this.updateCamera(dt);
    this.updateDecorations(this.scene, time, dt);
    for (const entity of [...this.entities]) {
      if (!entity.parent || entity.userData.hp <= 0) continue;
      this.updateMovement(entity, dt, time);
      this.updateCombat(entity, dt);
    }
    this.renderer.render(this.scene, this.camera);
  }
}
