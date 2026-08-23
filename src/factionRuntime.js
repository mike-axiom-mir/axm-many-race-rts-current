import * as THREE from "three";

function ensureBaseStats(entity) {
  const data = entity.userData;
  if (data.__axmBaseDamage === undefined) data.__axmBaseDamage = data.damage || 0;
  if (data.__axmBaseSpeed === undefined) data.__axmBaseSpeed = data.speed || 0;
  if (data.__axmBaseRange === undefined) data.__axmBaseRange = data.range || 0;
  data.damage = data.__axmBaseDamage;
  data.speed = data.__axmBaseSpeed;
  data.range = data.__axmBaseRange;
  data.__axmFactionState = null;
}

function activeSquads(world, owner) {
  return world.getLiving(owner, "squad");
}

function activeFounder(world, owner) {
  return world.getLiving(owner, "founder")[0] || null;
}

export class FactionRuntime {
  constructor(world) {
    this.world = world;
    this.time = 0;
  }

  reset() {
    this.time = 0;
  }

  factionFor(owner) {
    return this.world.__axmFactionByOwner?.[owner] || null;
  }

  update(dt, time = 0) {
    this.time = time;

    for (const entity of this.world.entities) {
      if (!entity.parent || entity.userData.hp <= 0) continue;
      if (entity.userData.type !== "squad" && entity.userData.type !== "founder") continue;
      ensureBaseStats(entity);
    }

    this.applyOwner("player", dt, time);
    this.applyOwner("enemy", dt, time);
  }

  applyOwner(owner, dt, time) {
    const faction = this.factionFor(owner);
    if (!faction) return;

    if (faction.id === "northpole") this.applyNorthpole(owner, faction, time);
    else if (faction.id === "suitcase") this.applySuitcase(owner);
    else if (faction.id === "fatfrotz") this.applyFatfrotz(owner);
    else if (faction.id === "clockworkOrchard") this.applyClockwork(owner);
  }

  applyNorthpole(owner, faction, time) {
    const founder = activeFounder(this.world, owner);
    if (!founder) return;

    this.ensureFounderAura(founder, faction);
    const ring = founder.userData.__axmInspirationRing;
    if (ring) {
      const pulse = 1 + Math.sin(time * 2.7) * .045;
      ring.scale.setScalar(pulse);
      ring.material.opacity = .24 + Math.sin(time * 2.7) * .045;
    }

    for (const squad of activeSquads(this.world, owner)) {
      if (squad.position.distanceTo(founder.position) > 8) continue;
      squad.userData.damage = squad.userData.__axmBaseDamage * 1.12;
      squad.userData.speed = squad.userData.__axmBaseSpeed * 1.05;
      squad.userData.__axmFactionState = "Inspired";
    }
  }

  ensureFounderAura(founder, faction) {
    if (founder.userData.__axmInspirationRing) return;
    const material = new THREE.MeshBasicMaterial({
      color: faction.accent,
      transparent: true,
      opacity: .25,
      depthWrite: false
    });
    const ring = new THREE.Mesh(new THREE.TorusGeometry(2.7, .065, 7, 40), material);
    ring.rotation.x = Math.PI / 2;
    ring.position.y = .05;
    ring.renderOrder = 3;
    founder.add(ring);
    founder.userData.__axmInspirationRing = ring;
  }

  applySuitcase(owner) {
    for (const squad of activeSquads(this.world, owner)) {
      const target = squad.userData.target;
      if (!target) continue;
      const distance = squad.position.distanceTo(target);
      if (distance <= 4) continue;
      squad.userData.speed = squad.userData.__axmBaseSpeed * 1.22;
      squad.userData.__axmFactionState = "Pack March";
    }
  }

  applyFatfrotz(owner) {
    const squads = activeSquads(this.world, owner);
    for (const squad of squads) {
      let nearby = 0;
      for (const other of squads) {
        if (other === squad) continue;
        if (other.position.distanceTo(squad.position) <= 6.5) nearby++;
      }
      const bonus = Math.min(.20, nearby * .05);
      if (bonus <= 0) continue;
      squad.userData.damage = squad.userData.__axmBaseDamage * (1 + bonus);
      squad.userData.__axmFactionState = `Mass +${Math.round(bonus * 100)}%`;
    }
  }

  applyClockwork(owner) {
    for (const squad of activeSquads(this.world, owner)) {
      if (squad.userData.target) continue;
      squad.userData.damage = squad.userData.__axmBaseDamage * 1.10;
      squad.userData.range = squad.userData.__axmBaseRange + .45;
      squad.userData.__axmFactionState = "Set Formation";
    }
  }
}
