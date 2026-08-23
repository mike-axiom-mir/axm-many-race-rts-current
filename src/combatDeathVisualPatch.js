import * as THREE from "three";
import { RTSWorld } from "./world.js";
import { DefenseSystem } from "./defenseSystem.js";

const previousUpdateCombat = RTSWorld.prototype.updateCombat;
const previousRemoveEntity = RTSWorld.prototype.removeEntity;
const previousUpdateDecorations = RTSWorld.prototype.updateDecorations;
const previousResetDynamic = RTSWorld.prototype.resetDynamic;
const previousTowerFire = DefenseSystem.prototype.fire;

function clamp01(value) {
  return Math.max(0, Math.min(1, value));
}

function easeOut(value) {
  const t = clamp01(value);
  return 1 - (1 - t) * (1 - t) * (1 - t);
}

function hashString(value = "") {
  let hash = 2166136261 >>> 0;
  for (const char of String(value)) {
    hash ^= char.charCodeAt(0);
    hash = Math.imul(hash, 16777619) >>> 0;
  }
  return hash >>> 0;
}

function seeded(seed = 1337) {
  let state = seed >>> 0;
  return () => {
    state = (Math.imul(state, 1664525) + 1013904223) >>> 0;
    return state / 4294967296;
  };
}

function ensureFx(world) {
  if (world.__axmCombatDeathFx) return world.__axmCombatDeathFx;
  const group = new THREE.Group();
  group.name = "axm-combat-death-fx";
  world.scene.add(group);
  world.__axmCombatDeathFx = { group, entries: [] };
  return world.__axmCombatDeathFx;
}

function disposeRoot(world, root) {
  if (!root) return;
  root.parent?.remove(root);
  world.disposeObject?.(root);
}

function materialList(root) {
  const materials = [];
  root?.traverse?.(object => {
    if (Array.isArray(object.material)) materials.push(...object.material.filter(Boolean));
    else if (object.material) materials.push(object.material);
  });
  return [...new Set(materials)];
}

function setRootOpacity(root, alpha) {
  for (const material of materialList(root)) {
    material.userData ||= {};
    if (material.userData.__axmBaseOpacity === undefined) material.userData.__axmBaseOpacity = Number(material.opacity ?? 1);
    const base = Number(material.userData.__axmBaseOpacity || 1);
    material.transparent = alpha < .995 || material.transparent;
    material.opacity = Math.max(0, Math.min(base, base * alpha));
    if (alpha < .45) material.depthWrite = false;
  }
}

function sampleEntityColor(entity) {
  let color = null;
  entity?.traverse?.(object => {
    if (color !== null) return;
    const material = Array.isArray(object.material) ? object.material[0] : object.material;
    if (material?.color?.isColor) color = material.color.getHex();
  });
  if (color !== null) return color;
  if (entity?.userData?.owner === "enemy") return 0x754047;
  return 0x68727a;
}

function charStructure(root) {
  for (const material of materialList(root)) {
    if (material.color?.isColor) material.color.multiplyScalar(.38);
    if (material.emissive?.isColor) material.emissive.multiplyScalar(.18);
    if ("roughness" in material) material.roughness = Math.max(.9, Number(material.roughness || 0));
    if ("metalness" in material) material.metalness = Math.min(.08, Number(material.metalness || 0));
  }
}

function syncFxVisibility(world, entry) {
  if (!entry?.root) return;
  const fog = world.__axmFogSystem;
  if (!entry.owner || !fog) {
    if (entry.initialVisible !== undefined) entry.root.visible = Boolean(entry.initialVisible);
    return;
  }
  const friendly = typeof fog.friendlyToPlayer === "function"
    ? fog.friendlyToPlayer(entry.owner)
    : entry.owner === "player";
  if (friendly) {
    entry.root.visible = true;
    return;
  }
  if (typeof fog.isPointVisible === "function") {
    entry.root.visible = fog.isPointVisible(Number(entry.worldX || 0), Number(entry.worldZ || 0));
  } else {
    entry.root.visible = Boolean(entry.initialVisible);
  }
}

function attackMembers(entity) {
  if (entity?.userData?.type === "founder" && Array.isArray(entity.userData.walkParts)) return [entity];
  return (entity?.children || []).filter(child => child?.isGroup && Array.isArray(child.userData?.walkParts));
}

function restoreAttackVisual(entity) {
  const attack = entity?.userData?.__axmAttackVisual;
  if (!attack) return;
  for (const entry of attack.members || []) {
    const member = entry.member;
    if (!member) continue;
    if (!entry.rootEntity) member.position.copy(entry.position);
    member.rotation.x = entry.rotationX;
    member.rotation.z = entry.rotationZ;
  }
  delete entity.userData.__axmAttackVisual;
}

function triggerAttackVisual(entity) {
  if (!entity?.userData) return;
  restoreAttackVisual(entity);
  const role = entity.userData.combatRole || "line";
  const duration = role === "siege" ? .46 : role === "ranged" ? .34 : role === "mobile" ? .25 : .30;
  const members = attackMembers(entity).map(member => ({
    member,
    rootEntity: member === entity,
    position: member.position.clone(),
    rotationX: member.rotation.x,
    rotationZ: member.rotation.z
  }));
  entity.userData.__axmAttackVisual = { age: 0, duration, role, members };
}

function animateAttackVisual(entity, dt) {
  const attack = entity?.userData?.__axmAttackVisual;
  if (!attack) return;
  attack.age += dt;
  const progress = clamp01(attack.age / Math.max(.01, attack.duration));
  const envelope = Math.sin(progress * Math.PI);

  for (let index = 0; index < attack.members.length; index++) {
    const entry = attack.members[index];
    const member = entry.member;
    if (!member) continue;
    if (!entry.rootEntity) member.position.copy(entry.position);
    member.rotation.x = entry.rotationX;
    member.rotation.z = entry.rotationZ;

    if (attack.role === "ranged") {
      if (!entry.rootEntity) member.position.z = entry.position.z - .07 * envelope;
      member.rotation.x = entry.rotationX + .10 * envelope;
    } else if (attack.role === "mobile") {
      if (!entry.rootEntity) {
        member.position.z = entry.position.z + .22 * envelope;
        member.position.y = entry.position.y + .07 * envelope;
      }
      member.rotation.x = entry.rotationX - .08 * envelope;
    } else if (attack.role === "siege") {
      if (!entry.rootEntity) member.position.z = entry.position.z + .08 * envelope;
      member.rotation.x = entry.rotationX - .13 * envelope;
      member.rotation.z = entry.rotationZ + (index % 2 ? -.04 : .04) * envelope;
    } else {
      if (!entry.rootEntity) member.position.z = entry.position.z + .16 * envelope;
      member.rotation.x = entry.rotationX - .18 * envelope;
    }

    const weapon = member.userData?.walkParts?.[3];
    if (weapon?.rotation) {
      const extra = attack.role === "ranged" ? .36 : attack.role === "siege" ? .48 : .72;
      weapon.rotation.z -= extra * envelope;
    }
  }

  if (progress >= 1) restoreAttackVisual(entity);
}

function restoreTowerVisual(building) {
  const attack = building?.userData?.__axmTowerAttackVisual;
  if (!attack) return;
  building.scale.copy(attack.scale);
  building.rotation.x = attack.rotationX;
  delete building.userData.__axmTowerAttackVisual;
}

function triggerTowerVisual(building) {
  if (!building?.userData) return;
  const previous = building.userData.__axmTowerAttackVisual;
  if (!previous) {
    building.userData.__axmTowerAttackVisual = {
      age: 0,
      duration: .24,
      scale: building.scale.clone(),
      rotationX: building.rotation.x
    };
  } else {
    previous.age = 0;
  }
}

function animateTowerVisual(building, dt) {
  const attack = building?.userData?.__axmTowerAttackVisual;
  if (!attack) return;
  attack.age += dt;
  const progress = clamp01(attack.age / attack.duration);
  const envelope = Math.sin(progress * Math.PI);
  building.scale.set(
    attack.scale.x * (1 + .025 * envelope),
    attack.scale.y * (1 - .045 * envelope),
    attack.scale.z * (1 + .025 * envelope)
  );
  building.rotation.x = attack.rotationX - .018 * envelope;
  if (progress >= 1) restoreTowerVisual(building);
}

function spawnMuzzleFlash(world, building) {
  const fx = ensureFx(world);
  const color = building.userData.owner === "enemy" ? 0xff7e72 : 0x9de9ff;
  const mesh = new THREE.Mesh(
    new THREE.OctahedronGeometry(.28, 0),
    new THREE.MeshBasicMaterial({ color, transparent: true, opacity: .92, depthWrite: false })
  );
  mesh.position.copy(building.position).add(new THREE.Vector3(0, 4.2, 0));
  fx.group.add(mesh);
  fx.entries.push({
    kind: "flash", root: mesh, age: 0, duration: .22,
    owner: building.userData.owner, worldX: building.position.x, worldZ: building.position.z,
    initialVisible: building.visible
  });
}

function prepareUnitDeath(world, entity) {
  const fx = ensureFx(world);
  restoreAttackVisual(entity);
  entity.userData.target = null;
  const visible = entity.visible;
  fx.group.add(entity);
  entity.visible = visible;

  const members = attackMembers(entity).map((member, index) => ({
    member,
    position: member.position.clone(),
    rotationX: member.rotation.x,
    rotationZ: member.rotation.z,
    direction: index % 2 ? -1 : 1,
    delay: Math.min(.28, index * .045)
  }));
  fx.entries.push({
    kind: "unit-death", root: entity, age: 0,
    duration: entity.userData.type === "founder" ? 2.8 : 2.3,
    members, owner: entity.userData.owner,
    worldX: entity.position.x, worldZ: entity.position.z, initialVisible: visible
  });
}

function prepareStructureDeath(world, entity) {
  const fx = ensureFx(world);
  restoreTowerVisual(entity);
  const visible = entity.visible;
  const sourceColor = sampleEntityColor(entity);
  charStructure(entity);
  fx.group.add(entity);
  entity.visible = visible;
  fx.entries.push({
    kind: "structure-collapse", root: entity, age: 0,
    duration: entity.userData.type === "capital" ? 1.55 : entity.userData.fortification ? .78 : 1.15,
    basePosition: entity.position.clone(), baseScale: entity.scale.clone(),
    baseRotationX: entity.rotation.x, baseRotationZ: entity.rotation.z,
    direction: hashString(`${entity.userData.id || entity.userData.type}:${entity.position.x}:${entity.position.z}`) % 2 ? -1 : 1,
    sourceColor, visible, sourceType: entity.userData.type, role: entity.userData.role,
    radius: Number(entity.userData.radius || 2.4), sourceId: entity.userData.id || entity.userData.type,
    owner: entity.userData.owner, worldX: entity.position.x, worldZ: entity.position.z, initialVisible: visible
  });
}

function makeWreck(world, entry) {
  const fx = ensureFx(world);
  const wreck = new THREE.Group();
  wreck.name = `wreck-${entry.sourceId || "structure"}`;
  wreck.position.copy(entry.basePosition);
  wreck.visible = entry.visible;
  const rng = seeded(hashString(`${entry.sourceId}:${entry.basePosition.x.toFixed(2)}:${entry.basePosition.z.toFixed(2)}`));
  const base = new THREE.Color(entry.sourceColor || 0x68727a).multiplyScalar(.34);
  const dark = base.clone().multiplyScalar(.55);
  const rubbleCount = entry.sourceType === "capital" ? 12 : entry.role === "wall" || entry.role === "gate" ? 5 : 8;
  const spread = Math.max(1.4, entry.radius * .82);

  const slab = new THREE.Mesh(
    new THREE.CylinderGeometry(Math.max(.9, entry.radius * .62), Math.max(1.1, entry.radius * .78), .28, 8),
    new THREE.MeshStandardMaterial({ color: dark, roughness: 1, metalness: 0, flatShading: true })
  );
  slab.position.y = .13;
  slab.rotation.y = rng() * Math.PI;
  slab.receiveShadow = true;
  wreck.add(slab);

  for (let index = 0; index < rubbleCount; index++) {
    const size = .35 + rng() * (entry.sourceType === "capital" ? .85 : .60);
    const mesh = new THREE.Mesh(
      rng() > .45 ? new THREE.BoxGeometry(size * 1.5, size * .7, size) : new THREE.DodecahedronGeometry(size * .65, 0),
      new THREE.MeshStandardMaterial({ color: index % 3 ? base : dark, roughness: 1, metalness: .01, flatShading: true })
    );
    const angle = rng() * Math.PI * 2;
    const distance = .35 + rng() * spread;
    mesh.position.set(Math.cos(angle) * distance, .20 + rng() * .34, Math.sin(angle) * distance);
    mesh.rotation.set((rng() - .5) * .8, rng() * Math.PI, (rng() - .5) * .8);
    mesh.castShadow = true;
    mesh.receiveShadow = true;
    wreck.add(mesh);
  }

  for (let index = 0; index < 3; index++) {
    const smoke = new THREE.Mesh(
      new THREE.DodecahedronGeometry(.38 + index * .08, 0),
      new THREE.MeshBasicMaterial({ color: 0x2c3032, transparent: true, opacity: .24, depthWrite: false })
    );
    smoke.position.set((rng() - .5) * 1.3, .55 + index * .28, (rng() - .5) * 1.3);
    smoke.userData.__axmSmokeBase = smoke.position.clone();
    smoke.userData.__axmSmokePhase = rng() * Math.PI * 2;
    wreck.add(smoke);
  }

  for (let index = 0; index < 3; index++) {
    const ember = new THREE.Mesh(
      new THREE.OctahedronGeometry(.08 + rng() * .06, 0),
      new THREE.MeshBasicMaterial({ color: 0xff8b4d, transparent: true, opacity: .82, depthWrite: false })
    );
    ember.position.set((rng() - .5) * 1.25, .30 + rng() * .32, (rng() - .5) * 1.25);
    ember.userData.pulse = true;
    wreck.add(ember);
  }

  fx.group.add(wreck);
  fx.entries.push({
    kind: "wreck", root: wreck, age: 0,
    duration: entry.sourceType === "capital" ? 28 : entry.role === "wall" || entry.role === "gate" ? 13 : 20,
    owner: entry.owner, worldX: entry.worldX, worldZ: entry.worldZ, initialVisible: entry.initialVisible
  });
}

function updateFx(world, time, dt) {
  const fx = world.__axmCombatDeathFx;
  if (!fx) return;
  for (let index = fx.entries.length - 1; index >= 0; index--) {
    const entry = fx.entries[index];
    entry.age += dt;
    syncFxVisibility(world, entry);
    const progress = clamp01(entry.age / Math.max(.01, entry.duration));

    if (entry.kind === "flash") {
      entry.root.scale.setScalar(1 + progress * 1.6);
      entry.root.material.opacity = .92 * (1 - progress);
      if (progress >= 1) {
        disposeRoot(world, entry.root);
        fx.entries.splice(index, 1);
      }
      continue;
    }

    if (entry.kind === "unit-death") {
      for (const memberEntry of entry.members) {
        const local = clamp01((entry.age - memberEntry.delay) / .68);
        const fall = easeOut(local);
        const member = memberEntry.member;
        member.position.set(memberEntry.position.x + memberEntry.direction * .10 * fall, memberEntry.position.y - .12 * fall, memberEntry.position.z);
        member.rotation.x = memberEntry.rotationX + .12 * fall;
        member.rotation.z = memberEntry.rotationZ + memberEntry.direction * 1.34 * fall;
      }
      const fade = progress < .55 ? 1 : 1 - (progress - .55) / .45;
      setRootOpacity(entry.root, fade);
      if (progress >= 1) {
        disposeRoot(world, entry.root);
        fx.entries.splice(index, 1);
      }
      continue;
    }

    if (entry.kind === "structure-collapse") {
      const collapse = easeOut(progress);
      entry.root.position.copy(entry.basePosition);
      entry.root.position.y -= .22 * collapse;
      entry.root.scale.set(entry.baseScale.x * (1 + .05 * collapse), entry.baseScale.y * (1 - .44 * collapse), entry.baseScale.z * (1 + .04 * collapse));
      entry.root.rotation.x = entry.baseRotationX + .06 * collapse;
      entry.root.rotation.z = entry.baseRotationZ + entry.direction * .14 * collapse;
      if (progress >= 1) {
        makeWreck(world, entry);
        disposeRoot(world, entry.root);
        fx.entries.splice(index, 1);
      }
      continue;
    }

    if (entry.kind === "wreck") {
      entry.root.traverse(object => {
        if (!object.userData?.__axmSmokeBase) return;
        const base = object.userData.__axmSmokeBase;
        const phase = object.userData.__axmSmokePhase || 0;
        const cycle = (entry.age * .28 + phase / (Math.PI * 2)) % 1;
        object.position.set(base.x + Math.sin(time * .7 + phase) * .16, base.y + cycle * 2.3, base.z + Math.cos(time * .6 + phase) * .14);
        if (object.material) object.material.opacity = .24 * (1 - cycle) * (progress > .78 ? (1 - progress) / .22 : 1);
        object.scale.setScalar(.8 + cycle * 1.45);
      });
      if (progress > .78) setRootOpacity(entry.root, Math.max(0, (1 - progress) / .22));
      if (progress >= 1) {
        disposeRoot(world, entry.root);
        fx.entries.splice(index, 1);
      }
    }
  }
}

RTSWorld.prototype.updateCombat = function combatAnimatedUpdate(entity, dt) {
  const beforeCooldown = Number(entity?.userData?.cooldown || 0);
  const result = previousUpdateCombat.call(this, entity, dt);
  const afterCooldown = Number(entity?.userData?.cooldown || 0);
  if (afterCooldown > beforeCooldown + .12) triggerAttackVisual(entity);
  return result;
};

DefenseSystem.prototype.fire = function combatAnimatedTowerFire(building, target) {
  const result = previousTowerFire.call(this, building, target);
  triggerTowerVisual(building);
  spawnMuzzleFlash(this.world, building);
  return result;
};

RTSWorld.prototype.removeEntity = function deathVisualRemove(entity) {
  if (!entity?.userData || entity.userData.__axmDeathVisualQueued) return;
  const type = entity.userData.type;
  const supported = type === "squad" || type === "founder" || type === "building" || type === "capital";
  if (!supported) return previousRemoveEntity.call(this, entity);

  entity.userData.__axmDeathVisualQueued = true;
  previousRemoveEntity.call(this, entity);
  if (type === "squad" || type === "founder") prepareUnitDeath(this, entity);
  else prepareStructureDeath(this, entity);
};

RTSWorld.prototype.updateDecorations = function combatDeathDecorations(root, time, dt) {
  const result = previousUpdateDecorations.call(this, root, time, dt);
  for (const entity of this.entities) {
    if (!entity.parent || entity.userData.hp <= 0) continue;
    animateAttackVisual(entity, dt);
    if (entity.userData.type === "building" && entity.userData.role === "defense") animateTowerVisual(entity, dt);
  }
  updateFx(this, time, dt);
  return result;
};

RTSWorld.prototype.resetDynamic = function combatDeathReset() {
  const fx = this.__axmCombatDeathFx;
  if (fx) {
    for (const child of [...fx.group.children]) disposeRoot(this, child);
    fx.entries.length = 0;
  }
  return previousResetDynamic.call(this);
};
