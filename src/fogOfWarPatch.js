import * as THREE from "three";
import { RTSWorld } from "./world.js";
import { DEFAULT_MAP } from "./maps.js";
import { flatHeightAt } from "./mapVisuals.js";

const previousSpawnSquad = RTSWorld.prototype.spawnSquad;
const previousSpawnFounder = RTSWorld.prototype.spawnFounder;
const previousSpawnCapital = RTSWorld.prototype.spawnCapital;
const previousSpawnBuilding = RTSWorld.prototype.spawnBuilding;
const previousResetDynamic = RTSWorld.prototype.resetDynamic;
const previousTick = RTSWorld.prototype.tick;
let lastWorld = null;
let autoScoutButton = null;

function sameTeam(world, ownerA, ownerB) {
  if (ownerA === ownerB) return true;
  const teams = world.__axmTeamByOwner || {};
  return teams[ownerA] != null && teams[ownerB] != null && teams[ownerA] === teams[ownerB];
}

function visionForEntity(entity) {
  const data = entity?.userData || {};
  if (Number(data.visionRadius) > 0) return Number(data.visionRadius);
  if (data.type === "capital") return 14.5;
  if (data.type === "founder") return 11.5;
  if (data.type === "building") return data.role === "defense" ? 12 : 9;
  if (data.type === "squad") return data.isScout ? 18 : 8.2;
  return 0;
}

class FogOfWarSystem {
  constructor(world) {
    this.world = world;
    this.cellSize = 4;
    this.clock = 0;
    this.autoClock = 0;
    this.autoOwners = new Set();
    this.group = new THREE.Group();
    this.group.name = "fog-of-war";
    this.world.scene.add(this.group);
    this.configure();
  }

  configure() {
    const environment = DEFAULT_MAP.environment || {};
    this.width = Math.max(40, Number(environment.width || 100));
    this.depth = Math.max(40, Number(environment.depth || 72));
    this.minX = -this.width / 2;
    this.minZ = -this.depth / 2;
    this.cols = Math.max(8, Math.ceil(this.width / this.cellSize));
    this.rows = Math.max(8, Math.ceil(this.depth / this.cellSize));
    this.cellWidth = this.width / this.cols;
    this.cellDepth = this.depth / this.rows;
    this.explored = new Uint8Array(this.cols * this.rows);
    this.visible = new Uint8Array(this.cols * this.rows);
    this.buildTiles();
  }

  buildTiles() {
    for (const child of [...this.group.children]) this.group.remove(child);
    this.tileGeometry?.dispose?.();
    this.unexploredMaterial?.dispose?.();
    this.exploredMaterial?.dispose?.();
    this.tileGeometry = new THREE.PlaneGeometry(this.cellWidth * 1.035, this.cellDepth * 1.035);
    this.tileGeometry.rotateX(-Math.PI / 2);
    this.unexploredMaterial = new THREE.MeshBasicMaterial({ color: 0x071019, transparent: true, opacity: .86, depthWrite: false, depthTest: false });
    this.exploredMaterial = new THREE.MeshBasicMaterial({ color: 0x101820, transparent: true, opacity: .38, depthWrite: false, depthTest: false });
    this.tiles = [];
    for (let row = 0; row < this.rows; row++) {
      for (let col = 0; col < this.cols; col++) {
        const index = row * this.cols + col;
        const { x, z } = this.cellCenter(col, row);
        const tile = new THREE.Mesh(this.tileGeometry, this.unexploredMaterial);
        tile.position.set(x, flatHeightAt(DEFAULT_MAP, x, z) + .24, z);
        tile.renderOrder = 80;
        tile.frustumCulled = false;
        tile.userData.fogIndex = index;
        this.group.add(tile);
        this.tiles.push(tile);
      }
    }
  }

  reset() {
    this.explored.fill(0);
    this.visible.fill(0);
    this.autoOwners.clear();
    for (const tile of this.tiles || []) { tile.visible = true; tile.material = this.unexploredMaterial; }
    this.restoreAllEntities();
    this.refreshButton();
  }

  cellCenter(col, row) {
    return {
      x: this.minX + (col + .5) * this.cellWidth,
      z: this.minZ + (row + .5) * this.cellDepth
    };
  }

  cellFor(x, z) {
    const col = THREE.MathUtils.clamp(Math.floor((x - this.minX) / this.cellWidth), 0, this.cols - 1);
    const row = THREE.MathUtils.clamp(Math.floor((z - this.minZ) / this.cellDepth), 0, this.rows - 1);
    return { col, row, index: row * this.cols + col };
  }

  friendlyToPlayer(owner) {
    return owner === "player" || sameTeam(this.world, "player", owner);
  }

  providers() {
    return this.world.entities.filter(entity =>
      entity.parent && entity.userData.hp > 0 && entity.userData.owner && this.friendlyToPlayer(entity.userData.owner) && visionForEntity(entity) > 0
    );
  }

  markCircle(x, z, radius) {
    const min = this.cellFor(x - radius, z - radius);
    const max = this.cellFor(x + radius, z + radius);
    const radiusSq = radius * radius;
    for (let row = min.row; row <= max.row; row++) {
      for (let col = min.col; col <= max.col; col++) {
        const center = this.cellCenter(col, row);
        if ((center.x - x) ** 2 + (center.z - z) ** 2 > radiusSq) continue;
        const index = row * this.cols + col;
        this.visible[index] = 1;
        this.explored[index] = 1;
      }
    }
  }

  updateVisibility() {
    this.visible.fill(0);
    for (const provider of this.providers()) this.markCircle(provider.position.x, provider.position.z, visionForEntity(provider));

    for (let index = 0; index < this.tiles.length; index++) {
      const tile = this.tiles[index];
      if (this.visible[index]) tile.visible = false;
      else {
        tile.visible = true;
        tile.material = this.explored[index] ? this.exploredMaterial : this.unexploredMaterial;
      }
    }

    for (const entity of this.world.entities) {
      if (!entity.parent || !entity.userData.owner) continue;
      if (this.friendlyToPlayer(entity.userData.owner)) {
        entity.visible = true;
        entity.userData.__axmFogHidden = false;
        continue;
      }
      const visible = this.isPointVisible(entity.position.x, entity.position.z);
      entity.visible = visible;
      entity.userData.__axmFogHidden = !visible;
    }
  }

  restoreAllEntities() {
    for (const entity of this.world.entities) {
      entity.visible = true;
      if (entity.userData) entity.userData.__axmFogHidden = false;
    }
  }

  isPointVisible(x, z) {
    return Boolean(this.visible[this.cellFor(x, z).index]);
  }

  isPointExplored(x, z) {
    return Boolean(this.explored[this.cellFor(x, z).index]);
  }

  isEntityVisibleToPlayer(entity) {
    if (!entity?.userData?.owner) return true;
    if (this.friendlyToPlayer(entity.userData.owner)) return true;
    return this.isPointVisible(entity.position.x, entity.position.z);
  }

  exploredPercent() {
    let count = 0;
    for (const value of this.explored) count += value ? 1 : 0;
    return Math.round(count / Math.max(1, this.explored.length) * 100);
  }

  playerScouts() {
    return this.world.entities.filter(entity =>
      entity.parent && entity.userData.hp > 0 && entity.userData.owner === "player" && entity.userData.type === "squad" && entity.userData.isScout
    );
  }

  nearestUnexploredPoint(entity, salt = 0) {
    let best = null;
    let bestScore = Infinity;
    for (let row = 0; row < this.rows; row++) {
      for (let col = 0; col < this.cols; col++) {
        const index = row * this.cols + col;
        if (this.explored[index]) continue;
        const center = this.cellCenter(col, row);
        const distance = Math.hypot(center.x - entity.position.x, center.z - entity.position.z);
        const spread = Math.abs(((col * 17 + row * 29 + salt * 13) % 23) - 11) * .11;
        const score = distance + spread;
        if (score < bestScore) { bestScore = score; best = center; }
      }
    }
    if (!best) return null;
    return new THREE.Vector3(best.x, flatHeightAt(DEFAULT_MAP, best.x, best.z), best.z);
  }

  updateAutoScout(dt) {
    if (!this.autoOwners.has("player")) return;
    this.autoClock += dt;
    if (this.autoClock < .75) return;
    this.autoClock = 0;
    const scouts = this.playerScouts();
    scouts.forEach((scout, index) => {
      const autoTarget = scout.userData.__axmAutoScoutTarget;
      const targetReached = autoTarget && scout.position.distanceTo(autoTarget) < 2.2;
      const targetMapped = autoTarget && this.isPointExplored(autoTarget.x, autoTarget.z);
      if (!autoTarget || !scout.userData.target || targetReached || targetMapped) {
        const next = this.nearestUnexploredPoint(scout, index);
        scout.userData.__axmAutoScoutTarget = next?.clone?.() || null;
        if (next) scout.userData.target = next;
      }
    });
    if (this.exploredPercent() >= 100) this.autoOwners.delete("player");
  }

  setAutoScout(owner, enabled) {
    if (enabled) this.autoOwners.add(owner); else this.autoOwners.delete(owner);
    this.refreshButton();
  }

  autoScoutEnabled(owner = "player") { return this.autoOwners.has(owner); }

  drawMiniFog(ctx, width, height) {
    const sx = width / this.cols;
    const sy = height / this.rows;
    for (let row = 0; row < this.rows; row++) {
      for (let col = 0; col < this.cols; col++) {
        const index = row * this.cols + col;
        if (this.visible[index]) continue;
        ctx.fillStyle = this.explored[index] ? "rgba(6,12,18,.38)" : "rgba(2,6,10,.86)";
        ctx.fillRect(col * sx, row * sy, sx + .5, sy + .5);
      }
    }
  }

  refreshButton() {
    if (!autoScoutButton) return;
    const enabled = this.autoScoutEnabled("player");
    autoScoutButton.textContent = `${enabled ? "Auto Scout: ON" : "Auto Scout"} • ${this.exploredPercent()}% mapped`;
    autoScoutButton.classList.toggle("primary", enabled);
  }

  update(dt) {
    this.clock += dt;
    this.updateAutoScout(dt);
    if (this.clock < .18) return;
    this.clock = 0;
    this.updateVisibility();
    this.refreshButton();
  }
}

function ensureFog(world) {
  if (!world.__axmFogSystem) world.__axmFogSystem = new FogOfWarSystem(world);
  lastWorld = world;
  return world.__axmFogSystem;
}

RTSWorld.prototype.spawnSquad = function fogAwareSquad(unitDef, faction, pos, enemy = false, countOverride = null) {
  const squad = previousSpawnSquad.call(this, unitDef, faction, pos, enemy, countOverride);
  squad.userData.isScout = Boolean(unitDef?.scout);
  squad.userData.visionRadius = Number(unitDef?.vision || (unitDef?.scout ? 18 : 8.2));
  return squad;
};
RTSWorld.prototype.spawnFounder = function fogAwareFounder(faction, pos, enemy = false) {
  const founder = previousSpawnFounder.call(this, faction, pos, enemy);
  founder.userData.visionRadius = 11.5;
  return founder;
};
RTSWorld.prototype.spawnCapital = function fogAwareCapital(faction, pos, enemy = false) {
  const capital = previousSpawnCapital.call(this, faction, pos, enemy);
  capital.userData.visionRadius = 14.5;
  lastWorld = this;
  return capital;
};
RTSWorld.prototype.spawnBuilding = function fogAwareBuilding(def, faction, pos, enemy = false) {
  const building = previousSpawnBuilding.call(this, def, faction, pos, enemy);
  building.userData.visionRadius = def.role === "defense" ? 12 : 9;
  return building;
};
RTSWorld.prototype.resetDynamic = function fogAwareReset() {
  this.__axmFogSystem?.reset();
  return previousResetDynamic.call(this);
};
RTSWorld.prototype.tick = function fogAwareTick(time, dt) {
  const result = previousTick.call(this, time, dt);
  ensureFog(this).update(dt);
  return result;
};

function showToast(message, kind = "") {
  const toast = document.getElementById("toast");
  if (!toast) return;
  toast.textContent = message;
  toast.className = `toast ${kind}`.trim();
  clearTimeout(showToast.timer);
  showToast.timer = setTimeout(() => toast.classList.add("hidden"), 2300);
}

function installAutoScoutButton() {
  if (document.getElementById("autoScoutBtn")) return;
  const stack = document.querySelector(".command-stack");
  if (!stack) return;
  const button = document.createElement("button");
  button.id = "autoScoutBtn";
  button.type = "button";
  button.textContent = "Auto Scout • 0% mapped";
  button.title = "Automatically send dedicated scout formations toward unexplored sectors.";
  button.addEventListener("click", () => {
    const world = window.__AXM_RTS_WORLD__ || lastWorld;
    const fog = world ? ensureFog(world) : null;
    if (!fog) return;
    const scouts = fog.playerScouts();
    if (!scouts.length) return showToast("Train a dedicated scout formation first.", "bad");
    const next = !fog.autoScoutEnabled("player");
    fog.setAutoScout("player", next);
    showToast(next ? "Auto Scout enabled — recon will seek unexplored sectors." : "Auto Scout disabled.", next ? "good" : "");
  });
  stack.insertBefore(button, stack.lastElementChild || null);
  autoScoutButton = button;
}

installAutoScoutButton();
queueMicrotask(installAutoScoutButton);
