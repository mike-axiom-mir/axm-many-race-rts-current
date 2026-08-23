import * as THREE from "three";
import { RTSWorld } from "./world.js";

const previousSpawnSquad = RTSWorld.prototype.spawnSquad;
const previousSpawnBuilding = RTSWorld.prototype.spawnBuilding;
const previousSpawnCapital = RTSWorld.prototype.spawnCapital;
const previousSpawnFounder = RTSWorld.prototype.spawnFounder;

const SUPPORTED = new Set(["ironvale", "greenwake", "ashwind", "prismkin"]);

function mat(color, emissive = 0x000000, roughness = .74, metalness = .08) {
  return new THREE.MeshStandardMaterial({ color, emissive, roughness, metalness, flatShading: true });
}
function shadow(mesh) { mesh.castShadow = true; mesh.receiveShadow = true; return mesh; }
function add(group, mesh, x = 0, y = 0, z = 0) { mesh.position.set(x, y, z); group.add(mesh); return mesh; }
function box(color, x, y, z, emissive = 0x000000) { return shadow(new THREE.Mesh(new THREE.BoxGeometry(x, y, z), mat(color, emissive))); }
function pole(color, length = 1, radius = .04) { return shadow(new THREE.Mesh(new THREE.CylinderGeometry(radius, radius * 1.15, length, 6), mat(color))); }
function shard(color, size = .25, emissive = 0x000000) { return shadow(new THREE.Mesh(new THREE.OctahedronGeometry(size), mat(color, emissive, .46, .11))); }
function disc(color, radius = .22, depth = .07) { const mesh = shadow(new THREE.Mesh(new THREE.CylinderGeometry(radius, radius, depth, 8), mat(color))); mesh.rotation.z = Math.PI / 2; return mesh; }
function ring(color, radius = .55, tube = .05) { return shadow(new THREE.Mesh(new THREE.TorusGeometry(radius, tube, 6, 16), mat(color))); }
function palette(faction, enemy = false) {
  if (enemy) return { body: 0x7a424b, accent: 0xe48a90, dark: 0x38272b, light: 0xe8c3b0 };
  if (faction?.id === "ironvale") return { body: 0x7896b8, accent: 0xd9e4ef, dark: 0x465564, light: 0xb8c8d8 };
  if (faction?.id === "greenwake") return { body: 0x74b87c, accent: 0xd8f0b8, dark: 0x405d42, light: 0xa8d29b };
  if (faction?.id === "ashwind") return { body: 0xc98b63, accent: 0xffd29f, dark: 0x6b4c38, light: 0xe4b07b };
  return { body: 0x9f8dff, accent: 0x7ff0e8, dark: 0x4b456d, light: 0xc6bcff };
}

function addPauldron(member, color, x) {
  const p = new THREE.Mesh(new THREE.SphereGeometry(.19, 6, 4), mat(color));
  p.scale.set(1.18, .72, 1.0);
  add(member, p, x, 1.10, 0);
}
function addQuiver(member, color) {
  const q = pole(color, .70, .07); q.rotation.z = .20; add(member, q, -.22, .96, .27);
  for (let i = 0; i < 3; i++) { const a = pole(0xb8a37b, .78 + i * .03, .012); a.rotation.z = .18; add(member, a, -.28 + i * .055, 1.08, .29); }
}
function addRangedKit(member, faction, p) {
  if (faction.id === "greenwake") {
    add(member, box(p.dark, .34, .30, .22), -.22, .80, .29);
    for (let i = 0; i < 3; i++) {
      const stone = shadow(new THREE.Mesh(new THREE.DodecahedronGeometry(.055, 0), mat(p.light)));
      add(member, stone, -.28 + i * .08, .90 + (i % 2) * .05, .39);
    }
    return;
  }
  if (faction.id === "prismkin") {
    for (const x of [-.22, .22]) {
      const emitter = shard(p.accent, .16, 0x11172b);
      emitter.scale.set(.45, 1.35, .40);
      emitter.rotation.z = x < 0 ? -.25 : .25;
      add(member, emitter, x, 1.10, .29);
    }
    return;
  }
  addQuiver(member, p.dark);
}
function addToolHarness(member, color) {
  add(member, box(color, .46, .16, .30), 0, .73, .30);
  const tool = pole(0x6e573d, .88, .025); tool.rotation.z = .45; add(member, tool, -.24, .90, .32);
}
function addScoutGlass(member, color) {
  const tube = pole(color, .44, .045); tube.rotation.z = Math.PI / 2; add(member, tube, .30, 1.35, -.02);
  add(member, disc(0xa8dce6, .075, .035), .51, 1.35, -.02);
}
function addRoleSilhouette(member, role, faction, enemy = false, scout = false, support = false) {
  const p = palette(faction, enemy);
  if (role === "line") {
    addPauldron(member, p.dark, -.27); addPauldron(member, p.dark, .27);
    add(member, box(p.light, .34, .18, .10), 0, 1.02, -.25);
  } else if (role === "ranged") {
    addRangedKit(member, faction, p);
    add(member, box(p.accent, .42, .08, .08), 0, .88, -.27);
  } else if (role === "mobile") {
    add(member, box(p.accent, .42, .10, .18), 0, .82, .28);
    for (const x of [-.23, .23]) add(member, box(p.dark, .12, .28, .12), x, .47, 0);
  } else if (role === "siege") {
    addPauldron(member, 0x747a7f, -.29); addPauldron(member, 0x747a7f, .29);
    addToolHarness(member, p.dark);
  }
  if (scout) addScoutGlass(member, p.accent);
  if (support) {
    const halo = ring(p.accent, .27, .025); halo.rotation.x = Math.PI / 2; halo.userData.spin = .65; add(member, halo, 0, 1.68, 0);
  }
}

function addFactionMemberIdentity(member, faction, index, enemy = false) {
  const p = palette(faction, enemy);
  if (faction.id === "ironvale") {
    add(member, box(p.dark, .42, .11, .30), 0, 1.54, 0);
    const crest = box(p.accent, .08, .34, .08); crest.rotation.z = -.08; add(member, crest, 0, 1.78, 0);
  } else if (faction.id === "greenwake") {
    const mantle = new THREE.Mesh(new THREE.SphereGeometry(.31, 6, 4), mat(p.dark)); mantle.scale.set(1.22, .38, .80); add(member, mantle, 0, 1.05, .13);
    const leaf = shard(p.accent, .15, enemy ? 0x1a090a : 0x091408); leaf.scale.set(.50, 1.25, .38); leaf.rotation.z = index % 2 ? .24 : -.24; add(member, leaf, .12, 1.71, .04);
  } else if (faction.id === "ashwind") {
    const scarf = new THREE.Mesh(new THREE.PlaneGeometry(.52, .20), new THREE.MeshStandardMaterial({ color: p.accent, side: THREE.DoubleSide, roughness: .82 }));
    scarf.userData.wave = Math.random() * 10; scarf.rotation.y = Math.PI / 2; add(member, scarf, -.24, 1.20, .22);
    for (const x of [-.10, .10]) add(member, disc(enemy ? 0x533337 : 0x6f5a43, .065, .035), x, 1.51, -.22);
  } else if (faction.id === "prismkin") {
    for (const x of [-.18, .18]) { const s = shard(p.accent, .15, enemy ? 0x241015 : 0x11172b); s.scale.set(.48, 1.28, .42); s.rotation.z = x < 0 ? -.20 : .20; add(member, s, x, 1.63, .05); }
    const back = shard(p.body, .18, enemy ? 0x281116 : 0x15112d); back.scale.set(.45, 1.45, .35); add(member, back, 0, 1.02, .31);
  }
}

function enhanceSquad(group, unitDef, faction, enemy = false) {
  if (!group || group.userData.__axmVisualDepth24) return;
  group.userData.__axmVisualDepth24 = true;
  const role = group.userData.combatRole || unitDef?.combat?.role || "line";
  const members = group.children.filter(child => child?.isGroup && Array.isArray(child.userData?.walkParts));
  members.forEach((member, index) => {
    if (member.userData.__axmVisualDepth24) return;
    member.userData.__axmVisualDepth24 = true;
    addRoleSilhouette(member, role, faction, enemy, Boolean(unitDef?.scout), Boolean(unitDef?.support));
    addFactionMemberIdentity(member, faction, index, enemy);
  });

  const p = palette(faction, enemy);
  if (role === "siege") {
    const axle = box(p.dark, 1.55, .12, .12); add(group, axle, 0, .42, .45);
    for (const x of [-.72, .72]) { const wheel = ring(enemy ? 0x3b292d : 0x554638, .25, .07); wheel.rotation.y = Math.PI / 2; add(group, wheel, x, .42, .45); }
  } else if (role === "mobile") {
    const vane = box(p.accent, .75, .06, .06); vane.userData.spin = .75; add(group, vane, 0, 2.04, 0);
  }
}

function windowPanel(color, emissive) { return box(color, .32, .38, .07, emissive); }
function addWindows(building, p, y = 1.55) {
  for (const x of [-.85, .85]) {
    add(building, windowPanel(p.light, p.dark), x, y, 1.72);
    const back = windowPanel(p.light, p.dark); back.rotation.y = Math.PI; add(building, back, -x, y, -1.72);
  }
}
function addDoor(building, p) {
  const door = box(p.dark, .72, 1.05, .12); add(building, door, 0, .58, 1.78);
  const lintel = box(p.accent, .92, .15, .16); add(building, lintel, 0, 1.15, 1.79);
}
function addCrates(building, p) {
  for (const [x, z, s] of [[-1.55, 1.15, .52], [-1.25, 1.52, .42], [1.55, 1.25, .46]]) add(building, box(p.dark, s, s * .72, s), x, s * .36, z);
}
function addWeaponRack(building, p) {
  for (const x of [-1.28, 1.28]) {
    const rack = box(p.dark, .10, 1.15, .10); add(building, rack, x, .62, 1.55);
    for (let i = 0; i < 2; i++) { const spear = pole(p.light, 1.35, .018); spear.rotation.z = i ? -.15 : .15; add(building, spear, x + (i ? .11 : -.11), .83, 1.57); }
  }
}
function addDefenseSlits(building, p) {
  for (let i = 0; i < 4; i++) { const a = i * Math.PI / 2; const slit = box(p.dark, .12, .42, .06); slit.rotation.y = -a; slit.position.set(Math.sin(a) * 1.18, 2.65, Math.cos(a) * 1.18); building.add(slit); }
}
function addRoleBuildingDetails(building, def, faction, enemy) {
  const p = palette(faction, enemy);
  if (building.userData.fortification) return;
  addDoor(building, p);
  if (def.role === "economy") { addWindows(building, p, 1.55); addCrates(building, p); }
  else if (def.role === "military") { addWindows(building, p, 1.85); addWeaponRack(building, p); }
  else if (def.role === "defense") { addDefenseSlits(building, p); }
}

function addIronvaleStructure(building, def, p) {
  for (const [x, z] of [[-1.65, 0], [1.65, 0], [0, -1.55], [0, 1.55]]) {
    const brace = box(p.dark, .34, 1.30, .48); brace.position.set(x, .72, z); brace.rotation.y = Math.abs(x) > 0 ? Math.PI / 2 : 0; building.add(brace);
  }
  if (def.role === "defense") {
    const crown = ring(p.accent, 1.18, .09); crown.rotation.x = Math.PI / 2; crown.position.y = 4.65; building.add(crown);
  }
}
function addGreenwakeStructure(building, def, p) {
  for (let i = 0; i < 5; i++) {
    const a = i / 5 * Math.PI * 2; const root = pole(0x654f36, 1.45, .09); root.rotation.z = .62; root.rotation.y = -a; root.position.set(Math.cos(a) * 1.25, .58, Math.sin(a) * 1.25); building.add(root);
  }
  if (def.role !== "defense") { const lantern = shard(p.accent, .22, 0x102218); lantern.userData.pulse = true; add(building, lantern, 0, 3.72, 0); }
}
function addAshwindStructure(building, def, p) {
  for (const z of [-1.65, 1.65]) {
    const awning = box(p.light, 2.30, .10, .78); awning.rotation.x = z > 0 ? -.12 : .12; add(building, awning, 0, 2.15, z);
  }
  const mast = pole(0x644832, 2.25, .035); add(building, mast, -1.45, 1.42, 0);
  const vane = box(p.accent, .78, .07, .07); vane.userData.spin = 1.0; add(building, vane, -1.45, 2.55, 0);
}
function addPrismStructure(building, def, p) {
  for (const [x, z] of [[-1.5, -1.35], [1.5, -1.35], [-1.5, 1.35], [1.5, 1.35]]) {
    const s = shard(p.body, .30, 0x13112d); s.scale.set(.62, 1.55, .62); add(building, s, x, .78, z);
  }
  const halo = ring(p.accent, def.role === "defense" ? 1.25 : .90, .055); halo.rotation.x = Math.PI / 2; halo.userData.spin = .55; add(building, halo, 0, def.role === "defense" ? 4.80 : 3.72, 0);
}

function addFortificationDetail(building, faction, enemy) {
  const cfg = building.userData.fortification;
  if (!cfg) return;
  const p = palette(faction, enemy);
  const width = Math.max(3.2, Number(cfg.width || 5.4));
  for (const x of [-width * .32, width * .32]) {
    const brace = box(p.dark, .18, 1.35, .16); brace.rotation.z = x < 0 ? -.35 : .35; add(building, brace, x, .72, .38);
  }
  if (building.userData.role === "gate") {
    const crest = faction.id === "prismkin" ? shard(p.accent, .28, enemy ? 0x241015 : 0x11172b) : box(p.accent, .75, .28, .14);
    crest.userData.pulse = faction.id === "greenwake" || faction.id === "prismkin"; add(building, crest, 0, 3.13, 0);
  } else {
    for (const x of [-width * .38, 0, width * .38]) add(building, box(p.accent, .42, .14, .10), x, 1.42, .47);
  }
}

function enhanceBuilding(building, def, faction, enemy) {
  if (!building || building.userData.__axmVisualDepth24) return;
  building.userData.__axmVisualDepth24 = true;
  if (building.userData.fortification) { addFortificationDetail(building, faction, enemy); return; }
  const p = palette(faction, enemy);
  addRoleBuildingDetails(building, def, faction, enemy);
  if (faction.id === "ironvale") addIronvaleStructure(building, def, p);
  else if (faction.id === "greenwake") addGreenwakeStructure(building, def, p);
  else if (faction.id === "ashwind") addAshwindStructure(building, def, p);
  else if (faction.id === "prismkin") addPrismStructure(building, def, p);
}

function enhanceCapital(capital, faction, enemy) {
  if (!capital || capital.userData.__axmVisualDepth24) return;
  capital.userData.__axmVisualDepth24 = true;
  const p = palette(faction, enemy);
  for (let i = 0; i < 8; i++) {
    const a = i / 8 * Math.PI * 2;
    const light = box(i % 2 ? p.accent : p.light, .34, .44, .12, i % 2 ? p.dark : 0x000000);
    light.rotation.y = -a; light.position.set(Math.sin(a) * 3.75, 1.45, Math.cos(a) * 3.75); capital.add(light);
  }
  for (const x of [-3.0, 3.0]) {
    const standard = pole(p.dark, 3.1, .045); add(capital, standard, x, 2.05, 0);
    const flag = new THREE.Mesh(new THREE.PlaneGeometry(1.15, .65), new THREE.MeshStandardMaterial({ color: p.accent, side: THREE.DoubleSide, roughness: .80 })); flag.userData.wave = Math.random() * 10; add(capital, flag, x + .50, 3.18, 0);
  }
  if (faction.id === "ironvale") {
    const crown = ring(p.accent, 2.15, .12); crown.rotation.x = Math.PI / 2; add(capital, crown, 0, 6.95, 0);
  } else if (faction.id === "greenwake") {
    for (let i = 0; i < 5; i++) { const a = i / 5 * Math.PI * 2; const leaf = shard(p.accent, .42, enemy ? 0x1a090a : 0x102218); leaf.scale.set(.55, 1.55, .45); leaf.rotation.z = .35; leaf.rotation.y = -a; leaf.position.set(Math.cos(a) * 1.75, 6.78, Math.sin(a) * 1.75); capital.add(leaf); }
  } else if (faction.id === "ashwind") {
    const vane = box(p.accent, 4.2, .11, .11); vane.userData.spin = .72; add(capital, vane, 0, 7.15, 0);
  } else if (faction.id === "prismkin") {
    const pivot = new THREE.Group(); pivot.position.y = 7.0; pivot.userData.spin = .48;
    for (let i = 0; i < 5; i++) { const a = i / 5 * Math.PI * 2; const s = shard(p.accent, .36, enemy ? 0x241015 : 0x11172b); s.position.set(Math.cos(a) * 2.0, Math.sin(a * 2) * .25, Math.sin(a) * 2.0); pivot.add(s); }
    capital.add(pivot);
  }
}

function enhanceFounder(founder, faction, enemy) {
  if (!founder || founder.userData.__axmVisualDepth24) return;
  founder.userData.__axmVisualDepth24 = true;
  const p = palette(faction, enemy);
  const cape = new THREE.Mesh(new THREE.PlaneGeometry(.72, 1.05), new THREE.MeshStandardMaterial({ color: p.dark, side: THREE.DoubleSide, roughness: .88 }));
  cape.rotation.x = .10; add(founder, cape, 0, 1.15, .18);
  const crest = faction.id === "prismkin" ? shard(p.accent, .20, enemy ? 0x241015 : 0x11172b) : box(p.accent, .12, .42, .12);
  crest.userData.pulse = faction.id === "greenwake" || faction.id === "prismkin"; add(founder, crest, 0, 2.22, 0);
  addPauldron(founder, p.light, -.30); addPauldron(founder, p.light, .30);
}

RTSWorld.prototype.spawnSquad = function phase24VisualSquad(unitDef, faction, pos, enemy = false, countOverride = null) {
  const squad = previousSpawnSquad.call(this, unitDef, faction, pos, enemy, countOverride);
  if (SUPPORTED.has(faction?.id)) enhanceSquad(squad, unitDef, faction, enemy);
  return squad;
};

RTSWorld.prototype.spawnBuilding = function phase24VisualBuilding(def, faction, pos, enemy = false) {
  const building = previousSpawnBuilding.call(this, def, faction, pos, enemy);
  if (SUPPORTED.has(faction?.id)) enhanceBuilding(building, def, faction, enemy);
  return building;
};

RTSWorld.prototype.spawnCapital = function phase24VisualCapital(faction, pos, enemy = false) {
  const capital = previousSpawnCapital.call(this, faction, pos, enemy);
  if (SUPPORTED.has(faction?.id)) enhanceCapital(capital, faction, enemy);
  return capital;
};

RTSWorld.prototype.spawnFounder = function phase24VisualFounder(faction, pos, enemy = false) {
  const founder = previousSpawnFounder.call(this, faction, pos, enemy);
  if (SUPPORTED.has(faction?.id)) enhanceFounder(founder, faction, enemy);
  return founder;
};
