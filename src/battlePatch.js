import * as THREE from "three";
import { RTSWorld } from "./world.js";
import { DefenseSystem } from "./defenseSystem.js";
import "./minimapPatch.js";

const originalTick = RTSWorld.prototype.tick;
const originalResetDynamic = RTSWorld.prototype.resetDynamic;
const originalSpawnCapital = RTSWorld.prototype.spawnCapital;

RTSWorld.prototype.tick = function patchedBattleTick(time, dt) {
  if (!this.__axmDefenseSystem) this.__axmDefenseSystem = new DefenseSystem(this);
  this.__axmDefenseSystem.update(dt);
  return originalTick.call(this, time, dt);
};

RTSWorld.prototype.resetDynamic = function patchedBattleReset() {
  this.__axmDefenseSystem?.reset();
  return originalResetDynamic.call(this);
};

RTSWorld.prototype.spawnCapital = function patchedCapital(faction, pos, enemy = false) {
  const capital = originalSpawnCapital.call(this, faction, pos, enemy);

  if (enemy && !capital.userData.supportSpawned) {
    capital.userData.supportSpawned = true;
    const direction = pos.x >= 0 ? -1 : 1;
    const economyDef = faction.buildings.find(def => def.role === "economy");
    const defenseDef = faction.buildings.find(def => def.role === "defense");

    if (economyDef) {
      this.spawnBuilding(
        economyDef,
        faction,
        pos.clone().add(new THREE.Vector3(direction * 7.2, 0, -5.8)),
        true
      );
    }

    if (defenseDef) {
      this.spawnBuilding(
        defenseDef,
        faction,
        pos.clone().add(new THREE.Vector3(direction * 5.2, 0, 6.4)),
        true
      );
    }
  }

  return capital;
};
