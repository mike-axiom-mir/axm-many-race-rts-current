import * as THREE from "three";

function mat(color, roughness = .9) {
  return new THREE.MeshStandardMaterial({ color, roughness, metalness: .03, flatShading: true });
}

function shadow(mesh) {
  mesh.castShadow = true;
  mesh.receiveShadow = true;
  return mesh;
}

function ownerColor(owner) {
  if (owner === "player") return 0x69d6ff;
  if (owner === "enemy") return 0xe36a72;
  return 0xd4c27b;
}

export class MapDirector {
  constructor(world) {
    this.world = world;
    this.group = new THREE.Group();
    this.world.scene.add(this.group);
    this.map = null;
    this.sites = [];
    this.events = [];
  }

  reset(map) {
    this.group.clear();
    this.map = map;
    this.sites = map.strategicSites.map(def => this.createSite(def));
    this.events.length = 0;
  }

  createSite(def) {
    const group = new THREE.Group();
    group.position.set(...def.position);

    const ringMat = new THREE.MeshStandardMaterial({ color: 0xd4c27b, transparent: true, opacity: .76, roughness: .85 });
    const ring = new THREE.Mesh(new THREE.TorusGeometry(def.radius * .66, .17, 7, 36), ringMat);
    ring.rotation.x = Math.PI / 2;
    ring.position.y = .13;
    group.add(ring);

    const pulseMat = new THREE.MeshBasicMaterial({ color: 0xd4c27b, transparent: true, opacity: .10, side: THREE.DoubleSide });
    const pulse = new THREE.Mesh(new THREE.CircleGeometry(def.radius * .62, 32), pulseMat);
    pulse.rotation.x = -Math.PI / 2;
    pulse.position.y = .08;
    group.add(pulse);

    if (def.kind === "forest") this.buildForestLandmark(group);
    else if (def.kind === "quarry") this.buildQuarryLandmark(group);
    else this.buildMonumentLandmark(group);

    this.group.add(group);
    return {
      def,
      group,
      ring,
      pulse,
      owner: "neutral",
      progress: 0,
      contested: false,
      lastOwner: "neutral"
    };
  }

  buildMonumentLandmark(group) {
    const base = shadow(new THREE.Mesh(new THREE.CylinderGeometry(1.55, 1.9, .65, 8), mat(0x6e6958)));
    base.position.y = .34;
    const pillar = shadow(new THREE.Mesh(new THREE.CylinderGeometry(.62, .88, 3.3, 8), mat(0x817966)));
    pillar.position.y = 2.0;
    const crown = shadow(new THREE.Mesh(new THREE.OctahedronGeometry(.82), mat(0x9adfff, .35)));
    crown.position.y = 4.05;
    crown.userData.mapSpin = .65;
    group.add(base, pillar, crown);
  }

  buildForestLandmark(group) {
    const stump = shadow(new THREE.Mesh(new THREE.CylinderGeometry(1.15, 1.35, .55, 10), mat(0x795538)));
    stump.position.y = .3;
    group.add(stump);
    for (let i = 0; i < 7; i++) {
      const a = (i / 7) * Math.PI * 2;
      const log = shadow(new THREE.Mesh(new THREE.CylinderGeometry(.27, .31, 2.6, 7), mat(0x8b603b)));
      log.rotation.z = Math.PI / 2;
      log.rotation.y = a;
      log.position.set(Math.cos(a) * 1.45, .42 + (i % 2) * .28, Math.sin(a) * 1.45);
      group.add(log);
    }
    const marker = shadow(new THREE.Mesh(new THREE.ConeGeometry(.72, 2.15, 7), mat(0x4e7b43)));
    marker.position.y = 1.45;
    marker.userData.mapBob = Math.random() * Math.PI;
    group.add(marker);
  }

  buildQuarryLandmark(group) {
    const rockMat = mat(0x747b7c);
    for (let i = 0; i < 9; i++) {
      const a = (i / 9) * Math.PI * 2;
      const rock = shadow(new THREE.Mesh(new THREE.DodecahedronGeometry(.55 + (i % 3) * .16, 0), rockMat));
      rock.position.set(Math.cos(a) * (1.0 + (i % 2) * .65), .48, Math.sin(a) * (1.0 + (i % 2) * .65));
      rock.rotation.set(i * .3, i * .5, i * .2);
      group.add(rock);
    }
    const marker = shadow(new THREE.Mesh(new THREE.CylinderGeometry(.35, .52, 2.5, 6), mat(0xb8a16a)));
    marker.position.y = 1.35;
    group.add(marker);
  }

  unitsInside(owner, site) {
    const p = new THREE.Vector3(site.def.position[0], 0, site.def.position[2]);
    return this.world.getLiving(owner).filter(e => {
      if (e.userData.type !== "squad" && e.userData.type !== "founder") return false;
      return e.position.distanceTo(p) <= site.def.radius;
    }).length;
  }

  update(dt, time = 0) {
    for (const site of this.sites) {
      const player = this.unitsInside("player", site);
      const enemy = this.unitsInside("enemy", site);
      site.contested = player > 0 && enemy > 0;
      let delta = 0;
      if (!site.contested) {
        if (player > 0) delta = site.def.captureRate * Math.min(2, player) * dt;
        else if (enemy > 0) delta = -site.def.captureRate * Math.min(2, enemy) * dt;
        else if (site.owner === "neutral") {
          if (site.progress > 0) delta = -Math.min(site.progress, 5 * dt);
          if (site.progress < 0) delta = Math.min(-site.progress, 5 * dt);
        }
      }

      if (delta !== 0) site.progress = THREE.MathUtils.clamp(site.progress + delta, -100, 100);

      const previous = site.owner;
      if (site.progress >= 100) site.owner = "player";
      else if (site.progress <= -100) site.owner = "enemy";
      else if ((site.owner === "player" && site.progress < 15) || (site.owner === "enemy" && site.progress > -15)) site.owner = "neutral";

      if (previous !== site.owner) {
        this.events.push({ type: "ownership", site: site.def, owner: site.owner, previous });
      }

      const color = ownerColor(site.owner);
      site.ring.material.color.setHex(color);
      site.pulse.material.color.setHex(color);
      site.pulse.material.opacity = site.contested ? .22 : .08 + Math.abs(site.progress) / 100 * .10;
      site.ring.scale.setScalar(1 + Math.sin(time * 2.2 + site.def.position[0]) * .015);
      site.group.traverse(obj => {
        if (obj.userData.mapSpin) obj.rotation.y += obj.userData.mapSpin * dt;
        if (obj.userData.mapBob !== undefined) obj.position.y += Math.sin(time * 2 + obj.userData.mapBob) * .0015;
      });
    }
  }

  drainEvents() {
    const out = [...this.events];
    this.events.length = 0;
    return out;
  }

  incomeBonus(owner) {
    const total = {};
    for (const site of this.sites) {
      if (site.owner !== owner) continue;
      for (const [key, value] of Object.entries(site.def.bonus || {})) total[key] = (total[key] || 0) + value;
    }
    return total;
  }

  ownershipCount(owner) {
    return this.sites.filter(s => s.owner === owner).length;
  }

  centralOwner() {
    return this.sites.find(s => s.def.id === "crossing")?.owner || "neutral";
  }

  objectiveFor(owner) {
    const enemyOwner = owner === "player" ? "enemy" : "player";
    const candidates = this.sites.filter(s => s.owner !== owner);
    candidates.sort((a, b) => {
      const aPriority = a.owner === enemyOwner ? 0 : 1;
      const bPriority = b.owner === enemyOwner ? 0 : 1;
      return aPriority - bPriority;
    });
    const site = candidates[0] || this.sites[0];
    return new THREE.Vector3(...site.def.position);
  }

  summary() {
    return this.sites.map(site => ({
      id: site.def.id,
      name: site.def.name,
      owner: site.owner,
      contested: site.contested,
      progress: site.progress,
      bonus: site.def.bonus
    }));
  }
}
