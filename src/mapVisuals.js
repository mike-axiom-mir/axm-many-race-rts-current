import * as THREE from "three";
import { decorationById, skinById } from "./worldCatalog.js";

function hashString(value = "") {
  let hash = 2166136261 >>> 0;
  for (const char of String(value)) {
    hash ^= char.charCodeAt(0);
    hash = Math.imul(hash, 16777619) >>> 0;
  }
  return hash >>> 0;
}

function seeded(seed = 1337) {
  let s = Number(seed) >>> 0;
  return () => {
    s = (Math.imul(s, 1664525) + 1013904223) >>> 0;
    return s / 4294967296;
  };
}

function material(color, opts = {}) {
  return new THREE.MeshStandardMaterial({ color, roughness: .88, metalness: .03, flatShading: true, ...opts });
}

function shadow(mesh) {
  mesh.castShadow = true;
  mesh.receiveShadow = true;
  return mesh;
}

export function mapVisualEnvironment(map = {}) {
  const env = map.environment || {};
  return {
    terrainTint: env.terrainTint || "#75985f",
    skyTint: env.skyTint || "#8eb4c4",
    fogTint: env.fogTint || env.skyTint || "#8eb4c4",
    fogDensity: Math.max(0, Math.min(.04, Number(env.fogDensity ?? .0105))),
    proceduralScenery: env.proceduralScenery !== false,
    legacyRoads: env.legacyRoads !== false,
    legacyCenterpiece: env.legacyCenterpiece !== false
  };
}

export function applyMapEnvironment(scene, map) {
  const env = mapVisualEnvironment(map);
  if (scene?.background?.set) scene.background.set(env.skyTint);
  if (scene?.fog) {
    scene.fog.color?.set?.(env.fogTint);
    if ("density" in scene.fog) scene.fog.density = env.fogDensity;
  }
  return env;
}

export function baseFlatHeight(map, x, z) {
  const seedOffset = (Number(map?.seed || 0) % 997) / 997;
  const width = Number(map?.environment?.width || 100);
  const depth = Number(map?.environment?.depth || 72);
  const edgeX = Math.max(0, (Math.abs(x) - width * .32) / Math.max(1, width * .2));
  const edgeZ = Math.max(0, (Math.abs(z) - depth * .29) / Math.max(1, depth * .19));
  return Math.sin(x * .13 + seedOffset * 1.2) * .16 + Math.cos(z * .18 - seedOffset) * .12 + (edgeX + edgeZ) * .18;
}

export function terrainStampOffset(map, x, z) {
  let offset = 0;
  for (const stamp of map?.terrainStamps || []) {
    if (stamp.enabled === false || !Array.isArray(stamp.position)) continue;
    const dx = x - Number(stamp.position[0] || 0);
    const dz = z - Number(stamp.position[2] || 0);
    const radius = Math.max(.25, Number(stamp.radius || 7));
    const distance = Math.hypot(dx, dz);
    if (distance >= radius) continue;
    const falloff = Math.pow(1 - distance / radius, 2);
    const strength = Number(stamp.strength || 1);
    if (stamp.kind === "hill") offset += 1.6 * strength * falloff;
    else if (stamp.kind === "water") offset -= .62 * strength * falloff;
    else if (stamp.kind === "rough") offset += Math.sin((x + z) * .8) * .32 * strength * falloff;
    else if (stamp.kind === "forest") offset += .18 * strength * falloff;
    else if (stamp.kind === "crater") offset -= 1.15 * strength * falloff;
  }
  return offset;
}

export function flatHeightAt(map, x, z) {
  return baseFlatHeight(map, x, z) + terrainStampOffset(map, x, z);
}

export function applyTerrainStampsToGeometry(geometry, map, { additive = true } = {}) {
  const position = geometry?.attributes?.position;
  if (!position) return geometry;
  for (let i = 0; i < position.count; i++) {
    const x = position.getX(i);
    const z = position.getZ(i);
    const current = additive ? position.getY(i) : baseFlatHeight(map, x, z);
    position.setY(i, current + terrainStampOffset(map, x, z));
  }
  position.needsUpdate = true;
  geometry.computeVertexNormals?.();
  return geometry;
}

function surfaceMaterial(paint = {}) {
  const skin = skinById(paint.skin || "grassland");
  const tint = paint.tint && paint.tint !== "#ffffff" ? paint.tint : skin.color;
  const opacity = Math.max(.08, Math.min(.92, Number(paint.opacity ?? .62)));
  return new THREE.MeshStandardMaterial({
    color: tint,
    roughness: Number(skin.roughness ?? 1),
    metalness: 0,
    transparent: opacity < .99,
    opacity,
    depthWrite: opacity > .9,
    side: THREE.DoubleSide,
    polygonOffset: true,
    polygonOffsetFactor: -2,
    polygonOffsetUnits: -2
  });
}

export function makeSurfacePaintMesh(paint = {}, map = {}) {
  const shape = paint.shape || "circle";
  let geometry;
  if (shape === "strip") {
    geometry = new THREE.PlaneGeometry(Math.max(.5, Number(paint.length || 16)), Math.max(.5, Number(paint.width || 3.5)), 1, 1);
  } else {
    geometry = new THREE.CircleGeometry(Math.max(.4, Number(paint.radius || 5)), 40);
  }
  geometry.rotateX(-Math.PI / 2);
  const mesh = new THREE.Mesh(geometry, surfaceMaterial(paint));
  const point = Array.isArray(paint.position) ? paint.position : [0, 0, 0];
  mesh.position.set(Number(point[0] || 0), flatHeightAt(map, Number(point[0] || 0), Number(point[2] || 0)) + .055, Number(point[2] || 0));
  mesh.rotation.y = THREE.MathUtils.degToRad(-Number(paint.rotation || 0));
  mesh.renderOrder = 1;
  mesh.userData.mapVisual = "surface";
  return mesh;
}

function tintFor(object, def) {
  return object.tint && object.tint !== "#ffffff" ? object.tint : def.tint;
}

function makeDecorationPrimitive(object = {}) {
  const def = decorationById(object.asset);
  const color = tintFor(object, def);
  const group = new THREE.Group();
  const dark = material(0x554b3c);
  const body = material(color);

  if (def.shape === "tree") {
    const trunk = shadow(new THREE.Mesh(new THREE.CylinderGeometry(.16, .28, 1.6, 6), dark));
    trunk.position.y = .8;
    const crown = shadow(new THREE.Mesh(new THREE.DodecahedronGeometry(.92, 0), body));
    crown.scale.set(1.1, 1.35, 1.0);
    crown.position.y = 2.05;
    group.add(trunk, crown);
  } else if (def.shape === "pine") {
    const trunk = shadow(new THREE.Mesh(new THREE.CylinderGeometry(.14, .24, 1.35, 6), dark));
    trunk.position.y = .67;
    const lower = shadow(new THREE.Mesh(new THREE.ConeGeometry(.92, 1.7, 7), body));
    lower.position.y = 1.65;
    const upper = shadow(new THREE.Mesh(new THREE.ConeGeometry(.66, 1.35, 7), body.clone()));
    upper.position.y = 2.55;
    group.add(trunk, lower, upper);
  } else if (def.shape === "rock") {
    const rock = shadow(new THREE.Mesh(new THREE.DodecahedronGeometry(.72, 0), body));
    rock.position.y = .48;
    rock.scale.set(1.2, .78, 1);
    group.add(rock);
  } else if (def.shape === "flowers") {
    for (let i = 0; i < 7; i++) {
      const flower = new THREE.Mesh(new THREE.OctahedronGeometry(.09), material(i % 2 ? color : 0xf0d86d));
      flower.position.set((i % 3 - 1) * .28, .11 + (i % 2) * .04, (Math.floor(i / 3) - .7) * .3);
      group.add(flower);
    }
  } else if (def.shape === "pillar") {
    const base = shadow(new THREE.Mesh(new THREE.CylinderGeometry(.44, .55, .28, 6), dark));
    base.position.y = .14;
    const pillar = shadow(new THREE.Mesh(new THREE.CylinderGeometry(.25, .34, 2.25, 6), body));
    pillar.position.y = 1.28;
    pillar.rotation.z = .08;
    group.add(base, pillar);
  } else if (def.shape === "arch") {
    for (const x of [-.62, .62]) {
      const pillar = shadow(new THREE.Mesh(new THREE.BoxGeometry(.38, 2.2, .48), body));
      pillar.position.set(x, 1.1, 0);
      group.add(pillar);
    }
    const lintel = shadow(new THREE.Mesh(new THREE.BoxGeometry(1.7, .42, .52), body.clone()));
    lintel.position.y = 2.15;
    group.add(lintel);
  } else if (def.shape === "campfire") {
    for (const r of [-.45, .45]) {
      const log = shadow(new THREE.Mesh(new THREE.CylinderGeometry(.12, .12, 1.05, 6), dark));
      log.rotation.z = Math.PI / 2;
      log.rotation.y = r > 0 ? .55 : -.55;
      log.position.y = .13;
      group.add(log);
    }
    const flame = new THREE.Mesh(new THREE.ConeGeometry(.32, .78, 7), new THREE.MeshBasicMaterial({ color, transparent: true, opacity: .88 }));
    flame.position.y = .55;
    flame.userData.pulse = true;
    group.add(flame);
  } else if (def.shape === "banner") {
    const pole = shadow(new THREE.Mesh(new THREE.CylinderGeometry(.045, .06, 2.65, 6), dark));
    pole.position.y = 1.32;
    const flag = new THREE.Mesh(new THREE.PlaneGeometry(1.15, .72), new THREE.MeshStandardMaterial({ color, side: THREE.DoubleSide, roughness: .8 }));
    flag.position.set(.57, 2.05, 0);
    flag.userData.wave = Math.random() * 10;
    group.add(pole, flag);
  } else if (def.shape === "stall") {
    const counter = shadow(new THREE.Mesh(new THREE.BoxGeometry(1.7, .78, 1.15), dark));
    counter.position.y = .42;
    const canopy = shadow(new THREE.Mesh(new THREE.BoxGeometry(2.1, .18, 1.55), body));
    canopy.position.y = 1.55;
    for (const x of [-.82, .82]) for (const z of [-.55, .55]) {
      const post = shadow(new THREE.Mesh(new THREE.CylinderGeometry(.045, .055, 1.35, 5), dark));
      post.position.set(x, .88, z);
      group.add(post);
    }
    group.add(counter, canopy);
  } else if (def.shape === "bridge") {
    const deck = shadow(new THREE.Mesh(new THREE.BoxGeometry(3.1, .24, 1.45), body));
    deck.position.y = .22;
    const rail1 = shadow(new THREE.Mesh(new THREE.BoxGeometry(3.1, .25, .12), dark));
    rail1.position.set(0, .55, .65);
    const rail2 = rail1.clone();
    rail2.position.z = -.65;
    group.add(deck, rail1, rail2);
  } else if (def.shape === "crystal") {
    const crystal = shadow(new THREE.Mesh(new THREE.OctahedronGeometry(.72), material(color, { roughness: .35, metalness: .08 })));
    crystal.position.y = .78;
    crystal.userData.spin = .52;
    group.add(crystal);
  } else if (def.shape === "obelisk") {
    const obelisk = shadow(new THREE.Mesh(new THREE.CylinderGeometry(.2, .48, 2.7, 4), body));
    obelisk.position.y = 1.35;
    group.add(obelisk);
  } else if (def.shape === "windmill") {
    const tower = shadow(new THREE.Mesh(new THREE.CylinderGeometry(.62, .82, 2.2, 7), body));
    tower.position.y = 1.1;
    const roof = shadow(new THREE.Mesh(new THREE.ConeGeometry(.88, .8, 7), dark));
    roof.position.y = 2.55;
    const rotor = new THREE.Group();
    rotor.position.set(.74, 2.0, 0);
    rotor.rotation.y = Math.PI / 2;
    rotor.userData.spinZ = .65;
    for (const angle of [0, Math.PI / 2]) {
      const blade = shadow(new THREE.Mesh(new THREE.BoxGeometry(.12, 2.35, .08), material(0xd7c69a)));
      blade.rotation.z = angle;
      rotor.add(blade);
    }
    group.add(tower, roof, rotor);
  } else if (def.shape === "waterwheel") {
    const stand = shadow(new THREE.Mesh(new THREE.BoxGeometry(1.6, .7, .8), body));
    stand.position.y = .38;
    const wheel = new THREE.Mesh(new THREE.TorusGeometry(.82, .11, 6, 16), dark);
    wheel.position.set(.95, .85, 0);
    wheel.rotation.y = Math.PI / 2;
    wheel.userData.spinZ = .58;
    group.add(stand, wheel);
  } else if (def.shape === "reeds") {
    for (let i = 0; i < 11; i++) {
      const reed = new THREE.Mesh(new THREE.CylinderGeometry(.025, .035, .75 + (i % 4) * .12, 4), body);
      reed.position.set((i % 4 - 1.5) * .16, reed.geometry.parameters.height / 2, (Math.floor(i / 4) - 1) * .18);
      group.add(reed);
    }
  } else if (def.shape === "wall") {
    const blocks = [
      [-.75, .3], [0, .3], [.75, .3], [-.38, .82], [.38, .82]
    ];
    for (const [x, y] of blocks) {
      const block = shadow(new THREE.Mesh(new THREE.BoxGeometry(.72, .52, .55), body));
      block.position.set(x, y, 0);
      block.rotation.y = (x + y) * .08;
      group.add(block);
    }
  } else if (def.shape === "beacon") {
    const tower = shadow(new THREE.Mesh(new THREE.CylinderGeometry(.25, .48, 2.5, 7), body));
    tower.position.y = 1.25;
    const arm = shadow(new THREE.Mesh(new THREE.BoxGeometry(2.1, .12, .12), material(0xe6d9a7)));
    arm.position.y = 2.55;
    arm.userData.spin = .75;
    group.add(tower, arm);
  } else if (def.shape === "dead-tree") {
    const trunk = shadow(new THREE.Mesh(new THREE.CylinderGeometry(.13, .28, 1.9, 6), body));
    trunk.position.y = .95;
    trunk.rotation.z = .08;
    for (const side of [-1, 1]) {
      const branch = shadow(new THREE.Mesh(new THREE.CylinderGeometry(.055, .085, .9, 5), body.clone()));
      branch.position.set(side * .28, 1.55, 0);
      branch.rotation.z = side * .72;
      group.add(branch);
    }
    group.add(trunk);
  } else {
    const box = shadow(new THREE.Mesh(new THREE.BoxGeometry(1, .8, 1), body));
    box.position.y = .4;
    group.add(box);
  }

  return group;
}

export function createDecorationLayer(map = {}) {
  const layer = new THREE.Group();
  layer.name = "axm-map-decoration-layer";
  for (const object of map.decorations || []) {
    if (object.enabled === false || !Array.isArray(object.position)) continue;
    const count = Math.max(1, Math.min(48, Math.round(Number(object.scatterCount || 1))));
    const spread = Math.max(0, Number(object.scatterRadius || 0));
    const rng = seeded((Number(map.seed || 0) ^ hashString(object.id || object.asset)) >>> 0);
    for (let i = 0; i < count; i++) {
      const item = makeDecorationPrimitive(object);
      const angle = rng() * Math.PI * 2;
      const radius = i === 0 && count === 1 ? 0 : Math.sqrt(rng()) * spread;
      const x = Number(object.position[0] || 0) + Math.cos(angle) * radius;
      const z = Number(object.position[2] || 0) + Math.sin(angle) * radius;
      const scale = Math.max(.1, Number(object.scale || decorationById(object.asset).scale || 1)) * (.88 + rng() * .24);
      item.position.set(x, flatHeightAt(map, x, z) + .03, z);
      item.rotation.y = THREE.MathUtils.degToRad(Number(object.rotation || 0)) + (count > 1 ? rng() * Math.PI * 2 : 0);
      item.scale.setScalar(scale);
      item.userData.mapVisual = "decoration";
      item.userData.sourceDecorationId = object.id || object.asset;
      layer.add(item);
    }
  }
  return layer;
}

export function createSurfacePaintLayer(map = {}) {
  const layer = new THREE.Group();
  layer.name = "axm-map-surface-layer";
  for (const paint of map.surfacePaint || []) {
    if (paint.enabled === false || !Array.isArray(paint.position)) continue;
    layer.add(makeSurfacePaintMesh(paint, map));
  }
  return layer;
}

export function animateMapVisualLayer(root, time, dt) {
  root?.traverse?.(object => {
    if (object.userData.spin) object.rotation.y += object.userData.spin * dt;
    if (object.userData.spinZ) object.rotation.z += object.userData.spinZ * dt;
    if (object.userData.wave !== undefined) object.rotation.y = Math.sin(time * 2 + object.userData.wave) * .1;
    if (object.userData.pulse) object.scale.y = .94 + Math.sin(time * 3.1) * .08;
  });
}
