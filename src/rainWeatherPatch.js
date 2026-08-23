import * as THREE from "three";
import { RTSWorld } from "./world.js";
import { DEFAULT_MAP } from "./maps.js";
import { flatHeightAt } from "./mapVisuals.js";

export const RAIN_RELOCATE_SECONDS = 120;
export const RAIN_MOVEMENT_MULTIPLIER = .90;
export const RAIN_CELL_COUNT = 3;

const previousTick = RTSWorld.prototype.tick;
const previousMovement = RTSWorld.prototype.updateMovement;
const previousResetDynamic = RTSWorld.prototype.resetDynamic;

function hashString(value = "") {
  let hash = 2166136261 >>> 0;
  for (const char of String(value)) {
    hash ^= char.charCodeAt(0);
    hash = Math.imul(hash, 16777619) >>> 0;
  }
  return hash >>> 0;
}

function seeded(seed = 1337) {
  let state = Number(seed) >>> 0;
  return () => {
    state = (Math.imul(state, 1664525) + 1013904223) >>> 0;
    return state / 4294967296;
  };
}

function mapBounds(map) {
  const width = Math.max(40, Number(map?.environment?.width || 100));
  const depth = Math.max(32, Number(map?.environment?.depth || 72));
  return { width, depth };
}

function hasLiveMatch(world) {
  return world.entities.some(entity =>
    entity.parent && entity.userData?.hp > 0 && entity.userData?.owner === "player" && entity.userData?.type === "capital"
  );
}

function makeWeatherBadge() {
  let badge = document.getElementById("rainWeatherBadge");
  if (badge) return badge;
  const age = document.getElementById("ageBadge");
  if (!age?.parentElement) return null;
  badge = document.createElement("div");
  badge.id = "rainWeatherBadge";
  badge.className = "age-badge hidden";
  badge.title = "Neutral rain cells slow formations and founders by 10%. All rain cells relocate together every two minutes.";
  age.parentElement.insertBefore(badge, age);
  return badge;
}

function formatClock(seconds) {
  const value = Math.max(0, Math.ceil(seconds));
  return `${Math.floor(value / 60)}:${String(value % 60).padStart(2, "0")}`;
}

function randomCellLayout(map, cycle) {
  const { width, depth } = mapBounds(map);
  const rng = seeded(hashString(`${map?.id || "map"}:${map?.seed || 0}:rain:${cycle}`));
  const cells = [];

  for (let index = 0; index < RAIN_CELL_COUNT; index++) {
    const radius = 7.2 + rng() * 1.8;
    const marginX = Math.min(width * .24, radius + 4.5);
    const marginZ = Math.min(depth * .24, radius + 4.5);
    let chosen = null;

    for (let attempt = 0; attempt < 24; attempt++) {
      const x = -width / 2 + marginX + rng() * Math.max(1, width - marginX * 2);
      const z = -depth / 2 + marginZ + rng() * Math.max(1, depth - marginZ * 2);
      const separated = cells.every(cell => Math.hypot(cell.x - x, cell.z - z) >= (cell.radius + radius) * .82);
      if (separated || attempt === 23) {
        chosen = { x, z, radius, phase: rng() * Math.PI * 2 };
        break;
      }
    }
    if (chosen) cells.push(chosen);
  }
  return cells;
}

export function rainMovementMultiplierAt(world, x, z) {
  const weather = world?.__axmRainWeather;
  if (!weather?.active) return 1;
  return weather.containsPoint(x, z) ? RAIN_MOVEMENT_MULTIPLIER : 1;
}

class RainWeatherSystem {
  constructor(world) {
    this.world = world;
    this.matchTime = 0;
    this.cycle = -1;
    this.active = false;
    this.cells = [];
    this.visuals = [];
    this.group = new THREE.Group();
    this.group.name = "neutral-rain-weather";
    this.group.visible = false;
    world.scene.add(this.group);

    this.cloudGeometry = new THREE.DodecahedronGeometry(1, 0);
    this.cloudMaterial = new THREE.MeshStandardMaterial({
      color: 0x56636d,
      roughness: 1,
      metalness: 0,
      transparent: true,
      opacity: .88,
      flatShading: true
    });
    this.rainGeometry = new THREE.BoxGeometry(.035, .72, .035);
    this.rainMaterial = new THREE.MeshBasicMaterial({
      color: 0xaed9ea,
      transparent: true,
      opacity: .48,
      depthWrite: false
    });
    this.wetMaterial = new THREE.MeshBasicMaterial({
      color: 0x7898a5,
      transparent: true,
      opacity: .055,
      depthWrite: false,
      side: THREE.DoubleSide
    });
    this.badge = makeWeatherBadge();
  }

  reset() {
    this.matchTime = 0;
    this.cycle = -1;
    this.active = false;
    this.cells = [];
    this.group.visible = false;
    this.clearVisuals();
    if (this.badge) this.badge.classList.add("hidden");
  }

  containsPoint(x, z) {
    for (const cell of this.cells) {
      const dx = Number(x || 0) - cell.x;
      const dz = Number(z || 0) - cell.z;
      if (dx * dx + dz * dz <= cell.radius * cell.radius) return true;
    }
    return false;
  }

  clearVisuals() {
    for (const visual of this.visuals) {
      visual.group.parent?.remove(visual.group);
      visual.wet?.geometry?.dispose?.();
    }
    this.visuals.length = 0;
  }

  createCellVisual(cell, index) {
    const group = new THREE.Group();
    group.name = `rain-cell-${index + 1}`;
    group.position.set(cell.x, flatHeightAt(DEFAULT_MAP, cell.x, cell.z), cell.z);

    const wet = new THREE.Mesh(new THREE.CircleGeometry(cell.radius * .92, 32), this.wetMaterial);
    wet.rotation.x = -Math.PI / 2;
    wet.position.y = .10;
    wet.renderOrder = 2;
    group.add(wet);

    const puffs = [];
    const puffLayout = [
      [-1.9, 9.25, -.2, 1.45],
      [-.7, 9.75, .35, 1.75],
      [.8, 9.55, -.15, 1.60],
      [1.95, 9.15, .45, 1.25],
      [.15, 10.25, .15, 1.35]
    ];
    for (let puffIndex = 0; puffIndex < puffLayout.length; puffIndex++) {
      const [x, y, z, scale] = puffLayout[puffIndex];
      const puff = new THREE.Mesh(this.cloudGeometry, this.cloudMaterial);
      puff.position.set(x, y, z);
      puff.scale.set(scale * 1.35, scale * .72, scale);
      puff.userData.rainPuffBase = puff.position.clone();
      puff.userData.rainPuffPhase = cell.phase + puffIndex * .83;
      group.add(puff);
      puffs.push(puff);
    }

    const drops = [];
    const rng = seeded(hashString(`${DEFAULT_MAP.id}:${this.cycle}:drops:${index}`));
    for (let dropIndex = 0; dropIndex < 20; dropIndex++) {
      const angle = rng() * Math.PI * 2;
      const radius = Math.sqrt(rng()) * cell.radius * .72;
      const drop = new THREE.Mesh(this.rainGeometry, this.rainMaterial);
      drop.position.set(Math.cos(angle) * radius, 1 + rng() * 7.2, Math.sin(angle) * radius);
      drop.userData.rainDropX = drop.position.x;
      drop.userData.rainDropZ = drop.position.z;
      drop.userData.rainDropPhase = rng();
      drop.userData.rainDropSpeed = .72 + rng() * .48;
      group.add(drop);
      drops.push(drop);
    }

    this.group.add(group);
    return { group, puffs, drops, wet };
  }

  relocate(cycle) {
    this.cycle = cycle;
    this.cells = randomCellLayout(DEFAULT_MAP, cycle);
    this.clearVisuals();
    this.visuals = this.cells.map((cell, index) => this.createCellVisual(cell, index));
    this.group.visible = true;
  }

  updateVisuals(time) {
    for (let visualIndex = 0; visualIndex < this.visuals.length; visualIndex++) {
      const visual = this.visuals[visualIndex];
      for (const puff of visual.puffs) {
        const base = puff.userData.rainPuffBase;
        const phase = puff.userData.rainPuffPhase || 0;
        puff.position.x = base.x + Math.sin(time * .33 + phase) * .18;
        puff.position.y = base.y + Math.sin(time * .52 + phase) * .12;
      }
      for (const drop of visual.drops) {
        const phase = Number(drop.userData.rainDropPhase || 0);
        const speed = Number(drop.userData.rainDropSpeed || 1);
        const cycle = (time * speed + phase) % 1;
        drop.position.x = Number(drop.userData.rainDropX || 0) + Math.sin(time * .55 + phase * 8) * .05;
        drop.position.z = Number(drop.userData.rainDropZ || 0);
        drop.position.y = 8.4 - cycle * 7.7;
      }
      visual.group.rotation.y = Math.sin(time * .09 + visualIndex) * .035;
      visual.wet.material.opacity = .045 + Math.sin(time * 1.4 + visualIndex) * .01;
    }
  }

  updateBadge() {
    if (!this.badge) this.badge = makeWeatherBadge();
    if (!this.badge) return;
    if (!this.active) {
      this.badge.classList.add("hidden");
      return;
    }
    this.badge.classList.remove("hidden");
    const untilShift = RAIN_RELOCATE_SECONDS - (this.matchTime % RAIN_RELOCATE_SECONDS);
    this.badge.textContent = `RAIN • SHIFT ${formatClock(untilShift)} • -10% SPEED`;
  }

  update(time, dt) {
    if (!hasLiveMatch(this.world)) {
      this.active = false;
      this.group.visible = false;
      this.updateBadge();
      return;
    }

    this.active = true;
    this.matchTime += Math.max(0, Number(dt || 0));
    const cycle = Math.floor(this.matchTime / RAIN_RELOCATE_SECONDS);
    if (cycle !== this.cycle) this.relocate(cycle);
    this.updateVisuals(Number(time || 0));
    this.updateBadge();
  }
}

function ensureRainWeather(world) {
  if (!world.__axmRainWeather) world.__axmRainWeather = new RainWeatherSystem(world);
  return world.__axmRainWeather;
}

RTSWorld.prototype.updateMovement = function rainAwareMovement(entity, dt, time) {
  const data = entity?.userData || {};
  if (data.type === "squad" || data.type === "founder") {
    const multiplier = rainMovementMultiplierAt(this, entity.position.x, entity.position.z);
    data.weatherMovementMultiplier = multiplier;
    data.weatherState = multiplier < 1 ? "Rain • -10% speed" : null;
    if (data.target) return previousMovement.call(this, entity, dt * multiplier, time);
  }
  return previousMovement.call(this, entity, dt, time);
};

RTSWorld.prototype.tick = function rainWeatherTick(time, dt) {
  ensureRainWeather(this).update(time, dt);
  return previousTick.call(this, time, dt);
};

RTSWorld.prototype.resetDynamic = function rainWeatherReset() {
  this.__axmRainWeather?.reset();
  return previousResetDynamic.call(this);
};
