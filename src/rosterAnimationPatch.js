import * as THREE from "three";
import { RTSWorld } from "./world.js";

const originalSpawnBuilding = RTSWorld.prototype.spawnBuilding;
const originalSpawnSquad = RTSWorld.prototype.spawnSquad;

function material(color, emissive = 0x000000) {
  return new THREE.MeshStandardMaterial({ color, emissive, roughness: .72, metalness: .08, flatShading: true });
}

function addBuildingAnimation(building, def, faction) {
  const kind = def?.visual;
  if (!kind) return;
  if (kind === "forge") {
    const wheel = new THREE.Mesh(new THREE.TorusGeometry(.65,.12,6,14), material(faction.accent));
    wheel.rotation.y = Math.PI / 2; wheel.position.set(0,2.3,1.85); wheel.userData.spinZ = 1.25; building.add(wheel);
  } else if (kind === "waterwheel") {
    const wheel = new THREE.Mesh(new THREE.TorusGeometry(.85,.14,6,16), material(0x8a6845));
    wheel.rotation.y = Math.PI / 2; wheel.position.set(1.85,1.25,0); wheel.userData.spinZ = .72; building.add(wheel);
  } else if (kind === "grove") {
    const crown = new THREE.Mesh(new THREE.IcosahedronGeometry(.72,0), material(faction.accent, 0x112a12));
    crown.position.y = 4.0; crown.userData.pulse = true; building.add(crown);
  } else if (kind === "camp") {
    const flag = new THREE.Mesh(new THREE.PlaneGeometry(1.25,.72), new THREE.MeshStandardMaterial({color:faction.accent,side:THREE.DoubleSide,roughness:.8}));
    flag.position.set(0,3.25,0); flag.userData.wave = Math.random()*10; building.add(flag);
  } else if (kind === "signal" || kind === "beacon") {
    const arm = new THREE.Mesh(new THREE.BoxGeometry(2.4,.13,.13), material(faction.accent));
    arm.position.y = 4.2; arm.userData.spin = kind === "beacon" ? 1.4 : .7; building.add(arm);
  } else if (kind === "orbit" || kind === "crystal") {
    const pivot = new THREE.Group(); pivot.position.y = 4.0; pivot.userData.spin = kind === "orbit" ? 1.15 : .6;
    for (let i=0;i<3;i++) {
      const shard = new THREE.Mesh(new THREE.OctahedronGeometry(.24), material(faction.accent,0x11152a));
      const a=i/3*Math.PI*2; shard.position.set(Math.cos(a)*1.05,Math.sin(a*1.7)*.25,Math.sin(a)*1.05); pivot.add(shard);
    }
    building.add(pivot);
  }
}

function addUnitAnimation(group, unitDef, faction) {
  const kind = unitDef?.visual;
  if (!kind) return;
  if (kind === "banner" || kind === "streamers") {
    const pole = new THREE.Mesh(new THREE.CylinderGeometry(.025,.035,2.1,5), material(0x5d4935)); pole.position.y=1.25;
    const flag = new THREE.Mesh(new THREE.PlaneGeometry(kind === "banner" ? 1.0 : .75,.55), new THREE.MeshStandardMaterial({color:faction.accent,side:THREE.DoubleSide,roughness:.82}));
    flag.position.set(.45,2.05,0); flag.userData.wave=Math.random()*10; group.add(pole,flag);
  } else if (kind === "lantern") {
    const lamp = new THREE.Mesh(new THREE.OctahedronGeometry(.28), material(faction.accent,0x173018)); lamp.position.y=2.15; lamp.userData.pulse=true; group.add(lamp);
  } else if (kind === "orbit") {
    const pivot = new THREE.Group(); pivot.position.y=1.8; pivot.userData.spin=1.3;
    for(let i=0;i<2;i++){const shard=new THREE.Mesh(new THREE.OctahedronGeometry(.2),material(faction.accent,0x15102a));shard.position.set(i?-.75:.75,.12,0);pivot.add(shard);} group.add(pivot);
  }
}

RTSWorld.prototype.spawnBuilding = function animatedRosterBuilding(def, faction, pos, enemy = false) {
  const building = originalSpawnBuilding.call(this, def, faction, pos, enemy);
  addBuildingAnimation(building, def, faction);
  return building;
};

RTSWorld.prototype.spawnSquad = function animatedRosterSquad(unitDef, faction, pos, enemy = false, countOverride = null) {
  const squad = originalSpawnSquad.call(this, unitDef, faction, pos, enemy, countOverride);
  addUnitAnimation(squad, unitDef, faction);
  return squad;
};
