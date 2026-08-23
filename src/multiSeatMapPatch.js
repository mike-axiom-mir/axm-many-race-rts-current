import * as THREE from "three";
import { MapDirector } from "./mapDirector.js";

const OWNER_COLORS = {
  neutral: 0xd4c27b,
  player: 0x69d6ff,
  enemy: 0xe36a72,
  "seat-3": 0xffd66d,
  "seat-4": 0xc69cff
};

function ownerColor(owner) {
  return OWNER_COLORS[owner] || 0xdde7ed;
}

function teamFor(world, owner) {
  return world.__axmTeamByOwner?.[owner] ?? owner;
}

function sameTeam(world, ownerA, ownerB) {
  if (ownerA === ownerB) return true;
  return teamFor(world, ownerA) === teamFor(world, ownerB);
}

function presenceAtSite(world, site) {
  const point = new THREE.Vector3(site.def.position[0], 0, site.def.position[2]);
  const counts = new Map();
  for (const entity of world.entities) {
    if (!entity.parent || entity.userData.hp <= 0) continue;
    if (entity.userData.type !== "squad" && entity.userData.type !== "founder") continue;
    const owner = entity.userData.owner;
    if (!owner || entity.position.distanceTo(point) > site.def.radius) continue;
    counts.set(owner, (counts.get(owner) || 0) + 1);
  }
  return counts;
}

MapDirector.prototype.update = function multiSeatMapUpdate(dt, time = 0) {
  for (const site of this.sites) {
    const presence = presenceAtSite(this.world, site);
    const presentOwners = [...presence.keys()];
    const presentTeams = [...new Set(presentOwners.map(owner => teamFor(this.world, owner)))];
    site.contested = presentTeams.length > 1;

    if (!site.contested && presentOwners.length) {
      presentOwners.sort((a, b) => (presence.get(b) || 0) - (presence.get(a) || 0));
      const capturingOwner = presentOwners[0];
      const force = Math.min(2, presence.get(capturingOwner) || 1);

      if (site.owner === capturingOwner) {
        site.progress = 100;
        site.captureOwner = null;
      } else {
        if (site.captureOwner !== capturingOwner) {
          site.captureOwner = capturingOwner;
          site.progress = 0;
        }
        site.progress = THREE.MathUtils.clamp(site.progress + site.def.captureRate * force * dt, 0, 100);
        if (site.progress >= 100) {
          const previous = site.owner;
          site.owner = capturingOwner;
          site.captureOwner = null;
          site.progress = 100;
          this.events.push({ type: "ownership", site: site.def, owner: site.owner, previous });
        }
      }
    } else if (!site.contested && !presentOwners.length && site.captureOwner) {
      site.progress = Math.max(0, site.progress - 7 * dt);
      if (site.progress <= 0) site.captureOwner = null;
    }

    const visualOwner = site.contested ? "neutral" : (site.captureOwner || site.owner);
    const color = ownerColor(visualOwner);
    site.ring.material.color.setHex(color);
    site.pulse.material.color.setHex(color);
    site.pulse.material.opacity = site.contested ? .24 : .08 + Math.abs(site.progress || 0) / 100 * .12;
    site.ring.scale.setScalar(1 + Math.sin(time * 2.2 + site.def.position[0]) * .015);
    site.group.traverse(obj => {
      if (obj.userData.mapSpin) obj.rotation.y += obj.userData.mapSpin * dt;
      if (obj.userData.mapBob !== undefined) obj.position.y += Math.sin(time * 2 + obj.userData.mapBob) * .0015;
    });
  }
};

MapDirector.prototype.objectiveFor = function multiSeatObjectiveFor(owner) {
  const candidates = this.sites.filter(site => !sameTeam(this.world, owner, site.owner));
  candidates.sort((a, b) => {
    const aHostile = a.owner !== "neutral" && !sameTeam(this.world, owner, a.owner) ? 0 : 1;
    const bHostile = b.owner !== "neutral" && !sameTeam(this.world, owner, b.owner) ? 0 : 1;
    return aHostile - bHostile;
  });
  const site = candidates[0] || this.sites[0];
  return site ? new THREE.Vector3(...site.def.position) : new THREE.Vector3(0, 0, 0);
};
