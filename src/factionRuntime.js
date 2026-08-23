import * as THREE from "three";

const PRISMKIN_PHASE_SECONDS = 14;
const PRISMKIN_PHASES = [
  { id: "drift", label: "Drift", color: 0x7ff0e8 },
  { id: "focus", label: "Focus", color: 0xffd36f },
  { id: "mend", label: "Mend", color: 0xbd9cff }
];

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

function ownerBuildings(world, owner, role = null) {
  return world.entities.filter(entity =>
    entity.parent &&
    entity.userData.hp > 0 &&
    entity.userData.owner === owner &&
    entity.userData.type === "building" &&
    (!role || entity.userData.role === role)
  );
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

    const owners = new Set([
      ...Object.keys(this.world.__axmFactionByOwner || {}),
      ...this.world.entities.map(entity => entity.userData.owner).filter(Boolean)
    ]);
    for (const owner of owners) this.applyOwner(owner, dt, time);
  }

  applyOwner(owner, dt, time) {
    const faction = this.factionFor(owner);
    if (!faction) return;

    if (faction.id === "ironvale") this.applyIronvale(owner);
    else if (faction.id === "greenwake") this.applyGreenwake(owner, dt);
    else if (faction.id === "ashwind") this.applyAshwind(owner);
    else if (faction.id === "prismkin") this.applyPrismkin(owner, dt, time);
    else if (faction.id === "northpole") this.applyNorthpole(owner, faction, time);
    else if (faction.id === "suitcase") this.applySuitcase(owner);
    else if (faction.id === "fatfrotz") this.applyFatfrotz(owner);
    else if (faction.id === "clockworkOrchard") this.applyClockwork(owner);
  }

  applyIronvale(owner) {
    const buildings = ownerBuildings(this.world, owner);
    if (!buildings.length) return;
    for (const squad of activeSquads(this.world, owner)) {
      const supported = buildings.some(building => building.position.distanceTo(squad.position) <= 7.5);
      if (!supported) continue;
      squad.userData.damage = squad.userData.__axmBaseDamage * 1.08;
      squad.userData.range = squad.userData.__axmBaseRange + .10;
      squad.userData.__axmFactionState = "Compact Discipline";
    }
  }

  applyGreenwake(owner, dt) {
    const economyBuildings = ownerBuildings(this.world, owner, "economy");
    if (!economyBuildings.length) return;
    for (const squad of activeSquads(this.world, owner)) {
      const supported = economyBuildings.some(building => building.position.distanceTo(squad.position) <= 8);
      if (!supported) continue;
      const maxHp = Number(squad.userData.maxHp || squad.userData.hp || 0);
      if (maxHp > 0 && squad.userData.hp < maxHp) {
        squad.userData.hp = Math.min(maxHp, squad.userData.hp + 4.2 * dt);
      }
      squad.userData.__axmFactionState = "Living Supply";
    }
  }

  applyAshwind(owner) {
    const capital = this.world.entities.find(entity =>
      entity.parent && entity.userData.hp > 0 && entity.userData.owner === owner && entity.userData.type === "capital"
    );
    if (!capital) return;
    for (const squad of activeSquads(this.world, owner)) {
      if (squad.position.distanceTo(capital.position) < 14) continue;
      squad.userData.damage = squad.userData.__axmBaseDamage * 1.12;
      squad.userData.speed = squad.userData.__axmBaseSpeed * 1.08;
      squad.userData.__axmFactionState = "Forward Momentum";
    }
  }

  applyPrismkin(owner, dt, time) {
    const phaseIndex = Math.floor(time / PRISMKIN_PHASE_SECONDS) % PRISMKIN_PHASES.length;
    const phase = PRISMKIN_PHASES[phaseIndex];
    const remaining = Math.max(1, Math.ceil(PRISMKIN_PHASE_SECONDS - (time % PRISMKIN_PHASE_SECONDS)));
    const formations = activeSquads(this.world, owner);
    const founder = activeFounder(this.world, owner);
    const actors = founder ? [...formations, founder] : formations;

    for (const entity of actors) {
      this.ensurePrismkinRing(entity, phase.color);
      const ring = entity.userData.__axmPrismRing;
      ring.material.color.setHex(phase.color);
      ring.material.opacity = .18 + Math.sin(time * 3.4 + (entity.userData.phase || 0)) * .04;
      const pulse = 1 + Math.sin(time * 3.4 + (entity.userData.phase || 0)) * .055;
      ring.scale.setScalar(pulse);
      entity.userData.__axmFactionState = `Resonance: ${phase.label} • ${remaining}s`;
    }

    for (const squad of formations) {
      if (phase.id === "drift") {
        squad.userData.speed = squad.userData.__axmBaseSpeed * 1.18;
      } else if (phase.id === "focus") {
        squad.userData.damage = squad.userData.__axmBaseDamage * 1.14;
        squad.userData.range = squad.userData.__axmBaseRange + .35;
      } else if (phase.id === "mend") {
        squad.userData.speed = squad.userData.__axmBaseSpeed * .94;
        const maxHp = Number(squad.userData.maxHp || squad.userData.hp || 0);
        if (maxHp > 0 && squad.userData.hp < maxHp) {
          squad.userData.hp = Math.min(maxHp, squad.userData.hp + 2.4 * dt);
        }
      }
    }
  }

  ensurePrismkinRing(entity, color) {
    if (entity.userData.__axmPrismRing) return;
    const ring = new THREE.Mesh(
      new THREE.TorusGeometry(entity.userData.type === "founder" ? 1.75 : 1.48, .045, 6, 34),
      new THREE.MeshBasicMaterial({ color, transparent: true, opacity: .2, depthWrite: false })
    );
    ring.rotation.x = Math.PI / 2;
    ring.position.y = .08;
    ring.renderOrder = 3;
    entity.add(ring);
    entity.userData.__axmPrismRing = ring;
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
