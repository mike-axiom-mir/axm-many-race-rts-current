import * as THREE from "three";
import {
  createBlankMap,
  normalizeMapDefinition,
  validateMapDefinition,
  exportMapJSON,
  toLegacyFlatMap,
  geoToCartesian,
  cartesianToGeo,
  isGlobeMap
} from "./mapSchema.js";

const $ = id => document.getElementById(id);
const ui = {
  viewport: $("viewport"), projectionBadge: $("projectionBadge"), coord: $("coordReadout"), hint: $("toolHint"),
  projectionSwitch: $("projectionSwitch"), mapName: $("mapName"), mapId: $("mapId"), mapDescription: $("mapDescription"),
  mapSeed: $("mapSeed"), radiusField: $("radiusField"), globeRadius: $("globeRadius"), flatSettings: $("flatSettings"),
  globeSettings: $("globeSettings"), flatWidth: $("flatWidth"), flatDepth: $("flatDepth"), atmosphere: $("atmosphereToggle"),
  terrainTint: $("terrainTint"), oceanTintField: $("oceanTintField"), oceanTint: $("oceanTint"), toolGrid: $("toolGrid"),
  objectCount: $("objectCount"), objectList: $("objectList"), inspector: $("inspector"), inspectorBody: $("inspectorBody"),
  validation: $("validation"), undo: $("undoBtn"), newBtn: $("newBtn"), importBtn: $("importBtn"), exportBtn: $("exportBtn"),
  copyBtn: $("copyBtn"), legacyBtn: $("legacyBtn"), clearBtn: $("clearBtn"), deleteSelectedBtn: $("deleteSelectedBtn"), fileInput: $("fileInput")
};

const state = {
  map: createBlankMap("flat"),
  tool: "select",
  selected: null,
  history: [],
  markerRecords: [],
  pointerDown: null,
  dragging: false,
  globeRotation: { x: -0.18, y: 0.45 },
  flatTarget: new THREE.Vector3(0, 0, 0),
  flatZoom: 1
};

const scene = new THREE.Scene();
scene.background = new THREE.Color(0x8eb4c4);
scene.fog = new THREE.FogExp2(0x8eb4c4, .009);
const renderer = new THREE.WebGLRenderer({ antialias: true, powerPreference: "high-performance" });
renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 1.75));
renderer.shadowMap.enabled = true;
renderer.shadowMap.type = THREE.PCFSoftShadowMap;
renderer.outputColorSpace = THREE.SRGBColorSpace;
ui.viewport.appendChild(renderer.domElement);

const flatCamera = new THREE.OrthographicCamera(-34, 34, 25, -25, .1, 300);
const globeCamera = new THREE.PerspectiveCamera(42, 1, .1, 500);
globeCamera.position.set(0, 6, 66);
const raycaster = new THREE.Raycaster();
const pointer = new THREE.Vector2();
const markerGroup = new THREE.Group();
const modeGroup = new THREE.Group();
const globeRoot = new THREE.Group();
scene.add(modeGroup, markerGroup, globeRoot);
let flatGround = null;
let globeSurface = null;
let atmosphereMesh = null;

const hemi = new THREE.HemisphereLight(0xe7f6ff, 0x354737, 2.0);
scene.add(hemi);
const sun = new THREE.DirectionalLight(0xffefd0, 3.2);
sun.position.set(-35, 55, 30);
sun.castShadow = true;
sun.shadow.mapSize.set(2048, 2048);
sun.shadow.camera.left = -65;
sun.shadow.camera.right = 65;
sun.shadow.camera.top = 60;
sun.shadow.camera.bottom = -60;
scene.add(sun);

function mat(color, opts = {}) {
  return new THREE.MeshStandardMaterial({ color, roughness: .82, metalness: .03, flatShading: true, ...opts });
}

function remember() {
  state.history.push(exportMapJSON(state.map));
  if (state.history.length > 40) state.history.shift();
  ui.undo.disabled = state.history.length === 0;
}

function undo() {
  const previous = state.history.pop();
  if (!previous) return;
  state.map = normalizeMapDefinition(JSON.parse(previous));
  state.selected = null;
  syncUIFromMap();
  rebuildWorld();
  renderPanels();
  ui.undo.disabled = state.history.length === 0;
}

function slugify(text) {
  return String(text || "map").toLowerCase().trim().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "") || "map";
}

function uniqueId(prefix) {
  const used = new Set([
    ...state.map.strategicSites.map(x => x.id),
    ...state.map.resourceZones.map(x => x.id),
    ...state.map.terrainStamps.map(x => x.id)
  ]);
  let n = 1;
  let id = `${prefix}-${n}`;
  while (used.has(id)) id = `${prefix}-${++n}`;
  return id;
}

function currentCamera() {
  return isGlobeMap(state.map) ? globeCamera : flatCamera;
}

function disposeGroup(group) {
  for (const child of [...group.children]) {
    child.traverse(obj => {
      obj.geometry?.dispose?.();
      if (Array.isArray(obj.material)) obj.material.forEach(m => m.dispose?.());
      else obj.material?.dispose?.();
    });
    group.remove(child);
  }
}

function rebuildWorld() {
  disposeGroup(modeGroup);
  disposeGroup(markerGroup);
  disposeGroup(globeRoot);
  state.markerRecords = [];
  flatGround = null;
  globeSurface = null;
  atmosphereMesh = null;

  if (isGlobeMap(state.map)) buildGlobe();
  else buildFlat();
  buildMarkers();
  resize();
}

function buildFlat() {
  scene.background.setHex(0x8eb4c4);
  scene.fog.density = .009;
  const width = Number(state.map.environment.width) || 100;
  const depth = Number(state.map.environment.depth) || 72;
  const geo = new THREE.PlaneGeometry(width, depth, 36, 28);
  geo.rotateX(-Math.PI / 2);
  const pos = geo.attributes.position;
  const seedOffset = (Number(state.map.seed) % 997) / 997;
  for (let i = 0; i < pos.count; i++) {
    const x = pos.getX(i), z = pos.getZ(i);
    const y = Math.sin(x * .12 + seedOffset * 5) * .15 + Math.cos(z * .15 - seedOffset * 3) * .12;
    pos.setY(i, y);
  }
  geo.computeVertexNormals();
  flatGround = new THREE.Mesh(geo, mat(state.map.environment.terrainTint || "#75985f"));
  flatGround.receiveShadow = true;
  flatGround.name = "builder-flat-ground";
  modeGroup.add(flatGround);

  const grid = new THREE.GridHelper(Math.max(width, depth), Math.round(Math.max(width, depth) / 2), 0x516d43, 0x638050);
  grid.position.y = .03;
  grid.material.transparent = true;
  grid.material.opacity = .16;
  modeGroup.add(grid);

  const border = new THREE.LineSegments(
    new THREE.EdgesGeometry(new THREE.BoxGeometry(width, .1, depth)),
    new THREE.LineBasicMaterial({ color: 0xc7d9c0, transparent: true, opacity: .4 })
  );
  border.position.y = .06;
  modeGroup.add(border);
}

function buildGlobe() {
  scene.background.setHex(0x07111a);
  scene.fog.density = .0035;
  const radius = Number(state.map.environment.radius) || 24;
  const sphereGeo = new THREE.IcosahedronGeometry(radius, 5);
  const surfaceMat = mat(state.map.environment.terrainTint || "#75985f", { roughness: .9 });
  globeSurface = new THREE.Mesh(sphereGeo, surfaceMat);
  globeSurface.castShadow = true;
  globeSurface.receiveShadow = true;
  globeSurface.name = "builder-globe-surface";
  globeRoot.add(globeSurface);

  const ocean = new THREE.Mesh(
    new THREE.SphereGeometry(radius * .997, 64, 32),
    new THREE.MeshStandardMaterial({ color: state.map.environment.oceanTint || "#315f79", roughness: .45, metalness: .05, transparent: true, opacity: .58 })
  );
  globeRoot.add(ocean);

  if (state.map.environment.atmosphere !== false) {
    atmosphereMesh = new THREE.Mesh(
      new THREE.SphereGeometry(radius * 1.045, 48, 24),
      new THREE.MeshBasicMaterial({ color: 0x78c9ff, transparent: true, opacity: .075, side: THREE.BackSide, depthWrite: false })
    );
    globeRoot.add(atmosphereMesh);
  }

  const equator = new THREE.Mesh(
    new THREE.TorusGeometry(radius * 1.003, .035, 5, 96),
    new THREE.MeshBasicMaterial({ color: 0xc6e7f7, transparent: true, opacity: .22 })
  );
  equator.rotation.x = Math.PI / 2;
  globeRoot.add(equator);
  globeRoot.rotation.set(state.globeRotation.x, state.globeRotation.y, 0);
}

function markerMaterial(color) {
  return new THREE.MeshStandardMaterial({ color, roughness: .55, metalness: .08, emissive: new THREE.Color(color).multiplyScalar(.08), flatShading: true });
}

function makeStartMarker(color, label) {
  const group = new THREE.Group();
  const ring = new THREE.Mesh(new THREE.TorusGeometry(.95, .10, 7, 28), markerMaterial(color));
  ring.rotation.x = Math.PI / 2;
  ring.position.y = .08;
  const pin = new THREE.Mesh(new THREE.ConeGeometry(.42, 1.6, 7), markerMaterial(color));
  pin.position.y = 1.0;
  const halo = new THREE.Mesh(new THREE.RingGeometry(1.15, 1.3, 32), new THREE.MeshBasicMaterial({ color, transparent: true, opacity: .28, side: THREE.DoubleSide, depthWrite: false }));
  halo.rotation.x = -Math.PI / 2;
  halo.position.y = .05;
  halo.userData.pulse = Math.random() * 10;
  group.add(ring, pin, halo);
  group.userData.builderLabel = label;
  return group;
}

function makeSiteMarker(kind = "monument") {
  const group = new THREE.Group();
  const color = kind === "forest" ? 0x7cc66f : kind === "quarry" ? 0xc9b28c : 0xf0d36d;
  const ring = new THREE.Mesh(new THREE.TorusGeometry(1.05, .11, 7, 30), markerMaterial(color));
  ring.rotation.x = Math.PI / 2;
  ring.position.y = .08;
  const core = kind === "forest"
    ? new THREE.Mesh(new THREE.ConeGeometry(.48, 1.4, 7), markerMaterial(color))
    : kind === "quarry"
      ? new THREE.Mesh(new THREE.DodecahedronGeometry(.62), markerMaterial(color))
      : new THREE.Mesh(new THREE.OctahedronGeometry(.62), markerMaterial(color));
  core.position.y = .85;
  core.userData.spin = kind === "monument" ? .6 : 0;
  group.add(ring, core);
  return group;
}

function makeResourceMarker(resource = "food") {
  const colors = { food: 0xe2a56d, wood: 0x6db66a, stone: 0xaeb6ba, gold: 0xf4d15a };
  const color = colors[resource] || 0x8dd9ff;
  const group = new THREE.Group();
  const crystal = new THREE.Mesh(new THREE.OctahedronGeometry(.55), markerMaterial(color));
  crystal.position.y = .7;
  crystal.userData.spin = .45;
  const ring = new THREE.Mesh(new THREE.RingGeometry(.85, 1.05, 26), new THREE.MeshBasicMaterial({ color, transparent: true, opacity: .32, side: THREE.DoubleSide }));
  ring.rotation.x = -Math.PI / 2;
  ring.position.y = .05;
  group.add(crystal, ring);
  return group;
}

function makeTerrainMarker(kind = "hill") {
  const color = kind === "water" ? 0x5dabc8 : kind === "forest" ? 0x5b9460 : 0xb89a6e;
  const group = new THREE.Group();
  const disk = new THREE.Mesh(new THREE.RingGeometry(.85, 1.15, 28), new THREE.MeshBasicMaterial({ color, transparent: true, opacity: .4, side: THREE.DoubleSide, depthWrite: false }));
  disk.rotation.x = -Math.PI / 2;
  disk.position.y = .05;
  const mound = new THREE.Mesh(new THREE.ConeGeometry(.7, .8, 8), new THREE.MeshStandardMaterial({ color, transparent: true, opacity: .72, roughness: .9, flatShading: true }));
  mound.position.y = .4;
  group.add(disk, mound);
  return group;
}

function pointForObject(record) {
  if (record.type === "playerStart") return state.map.playerStart;
  if (record.type === "enemyStart") return state.map.enemyStart;
  return isGlobeMap(state.map) ? record.object.geo : record.object.position;
}

function setMarkerPosition(marker, point) {
  if (!isGlobeMap(state.map)) {
    marker.position.set(point[0], .15, point[2]);
    marker.quaternion.identity();
    return;
  }
  const radius = Number(state.map.environment.radius) || 24;
  const p = geoToCartesian(point, radius + .12);
  marker.position.copy(p);
  const normal = p.clone().normalize();
  marker.quaternion.setFromUnitVectors(new THREE.Vector3(0, 1, 0), normal);
}

function addMarker(record, marker) {
  marker.userData.builderRecord = record;
  setMarkerPosition(marker, pointForObject(record));
  if (isGlobeMap(state.map)) globeRoot.add(marker);
  else markerGroup.add(marker);
  record.marker = marker;
  state.markerRecords.push(record);
}

function buildMarkers() {
  addMarker({ type: "playerStart", key: "playerStart", object: null }, makeStartMarker(0x65d6ff, "Player start"));
  addMarker({ type: "enemyStart", key: "enemyStart", object: null }, makeStartMarker(0xef6973, "Enemy start"));
  state.map.strategicSites.forEach((site, index) => addMarker({ type: "strategic", key: `strategic:${index}`, object: site, index }, makeSiteMarker(site.kind)));
  state.map.resourceZones.forEach((zone, index) => addMarker({ type: "resource", key: `resource:${index}`, object: zone, index }, makeResourceMarker(zone.resource)));
  state.map.terrainStamps.forEach((stamp, index) => addMarker({ type: "terrain", key: `terrain:${index}`, object: stamp, index }, makeTerrainMarker(stamp.kind)));
}

function rebuildMarkersOnly() {
  for (const record of state.markerRecords) {
    const marker = record.marker;
    if (marker?.parent) marker.parent.remove(marker);
  }
  disposeGroup(markerGroup);
  const globeMarkers = globeRoot.children.filter(c => c.userData?.builderRecord);
  for (const marker of globeMarkers) {
    marker.traverse(obj => { obj.geometry?.dispose?.(); obj.material?.dispose?.(); });
    globeRoot.remove(marker);
  }
  state.markerRecords = [];
  buildMarkers();
}

function pickWorld(clientX, clientY) {
  const rect = renderer.domElement.getBoundingClientRect();
  pointer.x = ((clientX - rect.left) / rect.width) * 2 - 1;
  pointer.y = -((clientY - rect.top) / rect.height) * 2 + 1;
  const camera = currentCamera();
  raycaster.setFromCamera(pointer, camera);

  if (isGlobeMap(state.map)) {
    if (!globeSurface) return null;
    const hit = raycaster.intersectObject(globeSurface, false)[0];
    if (!hit) return null;
    const local = globeRoot.worldToLocal(hit.point.clone());
    const geo = cartesianToGeo(local, Number(state.map.environment.radius) || 24);
    geo.elevation = 0;
    return { point: geo, world: hit.point.clone() };
  }

  const hit = flatGround ? raycaster.intersectObject(flatGround, false)[0] : null;
  if (!hit) return null;
  return { point: [round1(hit.point.x), 0, round1(hit.point.z)], world: hit.point.clone() };
}

function nearestRecord(hit) {
  if (!hit) return null;
  let best = null;
  let bestDistance = Infinity;
  for (const record of state.markerRecords) {
    const markerWorld = new THREE.Vector3();
    record.marker.getWorldPosition(markerWorld);
    const d = markerWorld.distanceTo(hit.world);
    const threshold = isGlobeMap(state.map) ? 3.0 : 3.5;
    if (d < threshold && d < bestDistance) { best = record; bestDistance = d; }
  }
  return best;
}

function placeAt(hit) {
  if (!hit) return;
  if (state.tool === "select") {
    selectRecord(nearestRecord(hit));
    return;
  }
  if (state.tool === "erase") {
    const record = nearestRecord(hit);
    if (record) deleteRecord(record);
    return;
  }

  remember();
  if (state.tool === "playerStart") state.map.playerStart = clonePoint(hit.point);
  else if (state.tool === "enemyStart") state.map.enemyStart = clonePoint(hit.point);
  else if (state.tool === "strategic") {
    const id = uniqueId("site");
    const object = {
      id,
      name: `Strategic Site ${state.map.strategicSites.length + 1}`,
      kind: "monument",
      ...(isGlobeMap(state.map) ? { geo: clonePoint(hit.point) } : { position: clonePoint(hit.point) }),
      radius: isGlobeMap(state.map) ? 9 : 6.5,
      captureRate: 25,
      bonus: { gold: 1 },
      description: "Custom strategic site."
    };
    state.map.strategicSites.push(object);
    state.selected = { type: "strategic", object };
  } else if (state.tool === "resource") {
    const id = uniqueId("resource");
    const object = {
      id,
      name: `Resource Zone ${state.map.resourceZones.length + 1}`,
      resource: "food",
      ...(isGlobeMap(state.map) ? { geo: clonePoint(hit.point) } : { position: clonePoint(hit.point) }),
      radius: isGlobeMap(state.map) ? 7 : 5,
      richness: 1
    };
    state.map.resourceZones.push(object);
    state.selected = { type: "resource", object };
  } else if (state.tool === "terrain") {
    const id = uniqueId("terrain");
    const object = {
      id,
      name: `Terrain Stamp ${state.map.terrainStamps.length + 1}`,
      kind: "hill",
      ...(isGlobeMap(state.map) ? { geo: clonePoint(hit.point) } : { position: clonePoint(hit.point) }),
      radius: isGlobeMap(state.map) ? 9 : 7,
      strength: 1
    };
    state.map.terrainStamps.push(object);
    state.selected = { type: "terrain", object };
  }
  rebuildMarkersOnly();
  renderPanels();
}

function clonePoint(point) {
  return Array.isArray(point) ? [...point] : { ...point };
}

function deleteRecord(record) {
  if (!record) return;
  if (record.type === "playerStart" || record.type === "enemyStart") return;
  remember();
  if (record.type === "strategic") state.map.strategicSites = state.map.strategicSites.filter(x => x !== record.object);
  if (record.type === "resource") state.map.resourceZones = state.map.resourceZones.filter(x => x !== record.object);
  if (record.type === "terrain") state.map.terrainStamps = state.map.terrainStamps.filter(x => x !== record.object);
  state.selected = null;
  rebuildMarkersOnly();
  renderPanels();
}

function selectRecord(record) {
  state.selected = record ? { type: record.type, object: record.object, key: record.key } : null;
  renderPanels();
}

function allObjectRecords() {
  const records = [
    { type: "playerStart", key: "playerStart", name: "Player Start", icon: "◆", object: null },
    { type: "enemyStart", key: "enemyStart", name: "Enemy Start", icon: "◆", object: null },
    ...state.map.strategicSites.map((object, i) => ({ type: "strategic", key: `strategic:${i}`, name: object.name, icon: "◎", object })),
    ...state.map.resourceZones.map((object, i) => ({ type: "resource", key: `resource:${i}`, name: object.name, icon: "⬢", object })),
    ...state.map.terrainStamps.map((object, i) => ({ type: "terrain", key: `terrain:${i}`, name: object.name, icon: "▲", object }))
  ];
  return records;
}

function locationText(record) {
  const point = record.type === "playerStart" ? state.map.playerStart : record.type === "enemyStart" ? state.map.enemyStart : isGlobeMap(state.map) ? record.object.geo : record.object.position;
  if (isGlobeMap(state.map)) return `${round1(point.lat)}°, ${round1(point.lon)}°`;
  return `x ${round1(point[0])} · z ${round1(point[2])}`;
}

function renderPanels() {
  const records = allObjectRecords();
  ui.objectCount.textContent = `${records.length} object${records.length === 1 ? "" : "s"}`;
  ui.objectList.innerHTML = "";
  for (const record of records) {
    const item = document.createElement("div");
    item.className = `object-item ${selectedMatches(record) ? "active" : ""}`;
    item.innerHTML = `<div class="object-icon">${record.icon}</div><div><b>${escapeHtml(record.name)}</b><small>${record.type} · ${locationText(record)}</small></div><span class="chip">${record.type}</span>`;
    item.addEventListener("click", () => {
      state.selected = { type: record.type, object: record.object, key: record.key };
      renderPanels();
      focusRecord(record);
    });
    ui.objectList.appendChild(item);
  }
  renderInspector();
  renderValidation();
  ui.legacyBtn.disabled = isGlobeMap(state.map);
  ui.undo.disabled = state.history.length === 0;
}

function selectedMatches(record) {
  if (!state.selected) return false;
  if (state.selected.type !== record.type) return false;
  if (record.type === "playerStart" || record.type === "enemyStart") return state.selected.key === record.key;
  return state.selected.object === record.object;
}

function renderInspector() {
  if (!state.selected) {
    ui.inspector.classList.add("hidden");
    return;
  }
  ui.inspector.classList.remove("hidden");
  const type = state.selected.type;
  const obj = state.selected.object;
  if (type === "playerStart" || type === "enemyStart") {
    const point = type === "playerStart" ? state.map.playerStart : state.map.enemyStart;
    ui.inspectorBody.innerHTML = `<div class="coords">${formatPoint(point)}</div><p class="hint">Use the matching placement tool to move this start location.</p>`;
    ui.deleteSelectedBtn.classList.add("hidden");
    return;
  }
  ui.deleteSelectedBtn.classList.remove("hidden");
  const common = `
    <label>Name<input data-field="name" value="${escapeAttr(obj.name || "")}"></label>
    <label>ID<input data-field="id" value="${escapeAttr(obj.id || "")}"></label>
    <div class="coords">${formatPoint(isGlobeMap(state.map) ? obj.geo : obj.position)}</div>`;
  if (type === "strategic") {
    ui.inspectorBody.innerHTML = common + `
      <div class="inspector-grid">
        <label>Kind<select data-field="kind"><option>monument</option><option>forest</option><option>quarry</option></select></label>
        <label>Radius<input data-number="radius" type="number" min="1" step="0.5" value="${obj.radius}"></label>
        <label>Capture rate<input data-number="captureRate" type="number" min="1" value="${obj.captureRate}"></label>
        <label>Bonus value<input data-number="bonusValue" type="number" min="0" step="0.05" value="${Object.values(obj.bonus || {})[0] || 1}"></label>
      </div>
      <label>Bonus resource<select data-field="bonusResource"><option>food</option><option>wood</option><option>stone</option><option>gold</option></select></label>
      <label>Description<textarea data-field="description" rows="2">${escapeHtml(obj.description || "")}</textarea></label>`;
    ui.inspectorBody.querySelector('[data-field="kind"]').value = obj.kind || "monument";
    ui.inspectorBody.querySelector('[data-field="bonusResource"]').value = Object.keys(obj.bonus || {})[0] || "gold";
  } else if (type === "resource") {
    ui.inspectorBody.innerHTML = common + `
      <div class="inspector-grid">
        <label>Resource<select data-field="resource"><option>food</option><option>wood</option><option>stone</option><option>gold</option></select></label>
        <label>Radius<input data-number="radius" type="number" min="1" step="0.5" value="${obj.radius}"></label>
        <label>Richness<input data-number="richness" type="number" min="0.1" step="0.1" value="${obj.richness || 1}"></label>
      </div>`;
    ui.inspectorBody.querySelector('[data-field="resource"]').value = obj.resource || "food";
  } else if (type === "terrain") {
    ui.inspectorBody.innerHTML = common + `
      <div class="inspector-grid">
        <label>Kind<select data-field="kind"><option>hill</option><option>forest</option><option>water</option><option>rough</option></select></label>
        <label>Radius<input data-number="radius" type="number" min="1" step="0.5" value="${obj.radius}"></label>
        <label>Strength<input data-number="strength" type="number" min="0.1" step="0.1" value="${obj.strength || 1}"></label>
      </div>`;
    ui.inspectorBody.querySelector('[data-field="kind"]').value = obj.kind || "hill";
  }
  bindInspectorFields(type, obj);
}

function bindInspectorFields(type, obj) {
  for (const input of ui.inspectorBody.querySelectorAll("[data-field]")) {
    input.addEventListener("change", () => {
      remember();
      const field = input.dataset.field;
      if (field === "bonusResource") {
        const value = Object.values(obj.bonus || {})[0] || 1;
        obj.bonus = { [input.value]: value };
      } else if (field === "kind" || field === "resource") {
        obj[field] = input.value;
        rebuildMarkersOnly();
      } else obj[field] = input.value;
      renderPanels();
    });
  }
  for (const input of ui.inspectorBody.querySelectorAll("[data-number]")) {
    input.addEventListener("change", () => {
      remember();
      const field = input.dataset.number;
      const value = Number(input.value) || 0;
      if (field === "bonusValue") {
        const key = Object.keys(obj.bonus || {})[0] || "gold";
        obj.bonus = { [key]: value };
      } else obj[field] = value;
      renderPanels();
    });
  }
}

function renderValidation() {
  const result = validateMapDefinition(state.map);
  const lines = [];
  if (result.valid) lines.push(`<div class="ok">✓ Map schema is valid.</div>`);
  result.errors.forEach(x => lines.push(`<div class="bad">× ${escapeHtml(x)}</div>`));
  result.warnings.forEach(x => lines.push(`<div class="warn">! ${escapeHtml(x)}</div>`));
  if (state.map.strategicSites.length > 0) lines.push(`<div>◎ ${state.map.strategicSites.length} strategic site(s)</div>`);
  if (state.map.resourceZones.length > 0) lines.push(`<div>⬢ ${state.map.resourceZones.length} resource zone(s)</div>`);
  if (state.map.terrainStamps.length > 0) lines.push(`<div>▲ ${state.map.terrainStamps.length} terrain stamp(s)</div>`);
  if (isGlobeMap(state.map)) lines.push(`<div>◉ Geographic coordinates ready for globe-runtime adapter.</div>`);
  else lines.push(`<div>▦ Flat map can export current skirmish-compatible legacy data.</div>`);
  ui.validation.innerHTML = lines.join("");
}

function formatPoint(point) {
  if (isGlobeMap(state.map)) return `lat ${round1(point.lat)}° · lon ${round1(point.lon)}°`;
  return `x ${round1(point[0])} · y ${round1(point[1])} · z ${round1(point[2])}`;
}

function focusRecord(record) {
  const point = record.type === "playerStart" ? state.map.playerStart : record.type === "enemyStart" ? state.map.enemyStart : isGlobeMap(state.map) ? record.object.geo : record.object.position;
  if (!isGlobeMap(state.map)) {
    state.flatTarget.set(point[0], 0, point[2]);
    return;
  }
  const geo = point;
  state.globeRotation.y = THREE.MathUtils.degToRad(-geo.lon);
  state.globeRotation.x = THREE.MathUtils.degToRad(geo.lat) * .75;
}

function syncUIFromMap() {
  ui.mapName.value = state.map.name;
  ui.mapId.value = state.map.id;
  ui.mapDescription.value = state.map.description || "";
  ui.mapSeed.value = state.map.seed;
  ui.terrainTint.value = normalizeColor(state.map.environment.terrainTint, "#75985f");
  const globe = isGlobeMap(state.map);
  ui.projectionBadge.textContent = globe ? "GLOBE MAP" : "FLAT MAP";
  ui.radiusField.classList.toggle("hidden", !globe);
  ui.globeSettings.classList.toggle("hidden", !globe);
  ui.oceanTintField.classList.toggle("hidden", !globe);
  ui.flatSettings.classList.toggle("hidden", globe);
  ui.globeRadius.value = state.map.environment.radius || 24;
  ui.flatWidth.value = state.map.environment.width || 100;
  ui.flatDepth.value = state.map.environment.depth || 72;
  ui.atmosphere.checked = state.map.environment.atmosphere !== false;
  ui.oceanTint.value = normalizeColor(state.map.environment.oceanTint, "#315f79");
  for (const button of ui.projectionSwitch.querySelectorAll("button")) button.classList.toggle("active", button.dataset.projection === state.map.projection);
  updateToolHint();
}

function setProjection(projection) {
  if (projection === state.map.projection) return;
  remember();
  const previousName = state.map.name;
  const previousId = state.map.id;
  const previousDescription = state.map.description;
  state.map = createBlankMap(projection);
  state.map.name = previousName.includes("Flat") || previousName.includes("Globe") ? (projection === "globe" ? "New Globe World" : "New Flat World") : previousName;
  state.map.id = previousId.startsWith("new-") ? (projection === "globe" ? "new-globe-world" : "new-flat-world") : previousId;
  state.map.description = previousDescription;
  state.selected = null;
  syncUIFromMap();
  rebuildWorld();
  renderPanels();
}

function setTool(tool) {
  state.tool = tool;
  for (const button of ui.toolGrid.querySelectorAll("button")) button.classList.toggle("active", button.dataset.tool === tool);
  updateToolHint();
}

function updateToolHint() {
  const hints = {
    select: isGlobeMap(state.map) ? "Drag to rotate globe · tap a marker to inspect" : "Drag to pan · tap a marker to inspect",
    playerStart: "Click the world to move Player Start",
    enemyStart: "Click the world to move Enemy Start",
    strategic: "Click to add a capturable strategic site",
    resource: "Click to add a resource zone",
    terrain: "Click to add a terrain stamp",
    erase: "Click a placed object to remove it"
  };
  ui.hint.textContent = hints[state.tool] || "Click the world.";
}

function bindUI() {
  ui.projectionSwitch.addEventListener("click", e => {
    const button = e.target.closest("button[data-projection]");
    if (button) setProjection(button.dataset.projection);
  });
  ui.toolGrid.addEventListener("click", e => {
    const button = e.target.closest("button[data-tool]");
    if (button) setTool(button.dataset.tool);
  });
  ui.undo.addEventListener("click", undo);
  ui.deleteSelectedBtn.addEventListener("click", () => {
    if (!state.selected) return;
    const record = state.markerRecords.find(r => selectedMatches({ type: r.type, key: r.key, object: r.object }));
    if (record) deleteRecord(record);
  });

  ui.newBtn.addEventListener("click", () => {
    remember();
    state.map = createBlankMap(state.map.projection);
    state.selected = null;
    syncUIFromMap();
    rebuildWorld();
    renderPanels();
  });
  ui.importBtn.addEventListener("click", () => ui.fileInput.click());
  ui.fileInput.addEventListener("change", async () => {
    const file = ui.fileInput.files?.[0];
    if (!file) return;
    try {
      const parsed = JSON.parse(await file.text());
      remember();
      state.map = normalizeMapDefinition(parsed);
      state.selected = null;
      syncUIFromMap();
      rebuildWorld();
      renderPanels();
      flashHint("Map imported.");
    } catch (error) {
      flashHint(`Import failed: ${error.message}`);
    } finally { ui.fileInput.value = ""; }
  });

  ui.exportBtn.addEventListener("click", () => {
    const json = exportMapJSON(state.map);
    const blob = new Blob([json], { type: "application/json" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `${slugify(state.map.id || state.map.name)}.axm-map.json`;
    a.click();
    setTimeout(() => URL.revokeObjectURL(url), 1000);
    flashHint("Map JSON exported.");
  });
  ui.copyBtn.addEventListener("click", async () => {
    await copyText(exportMapJSON(state.map));
    flashHint("Map JSON copied.");
  });
  ui.legacyBtn.addEventListener("click", async () => {
    if (isGlobeMap(state.map)) return flashHint("Legacy export is flat-only. Globe data stays geographic.");
    await copyText(JSON.stringify(toLegacyFlatMap(state.map), null, 2));
    flashHint("Flat skirmish map copied in legacy format.");
  });
  ui.clearBtn.addEventListener("click", () => {
    remember();
    state.map.strategicSites = [];
    state.map.resourceZones = [];
    state.map.terrainStamps = [];
    state.selected = null;
    rebuildMarkersOnly();
    renderPanels();
  });

  bindText(ui.mapName, value => { state.map.name = value; });
  bindText(ui.mapId, value => { state.map.id = slugify(value); ui.mapId.value = state.map.id; });
  bindText(ui.mapDescription, value => { state.map.description = value; });
  bindNumber(ui.mapSeed, value => { state.map.seed = Math.floor(value); rebuildWorld(); });
  bindNumber(ui.globeRadius, value => { state.map.environment.radius = Math.max(8, value); rebuildWorld(); });
  bindNumber(ui.flatWidth, value => { state.map.environment.width = Math.max(40, value); rebuildWorld(); });
  bindNumber(ui.flatDepth, value => { state.map.environment.depth = Math.max(40, value); rebuildWorld(); });
  ui.atmosphere.addEventListener("change", () => { remember(); state.map.environment.atmosphere = ui.atmosphere.checked; rebuildWorld(); renderPanels(); });
  ui.terrainTint.addEventListener("change", () => { remember(); state.map.environment.terrainTint = ui.terrainTint.value; rebuildWorld(); renderPanels(); });
  ui.oceanTint.addEventListener("change", () => { remember(); state.map.environment.oceanTint = ui.oceanTint.value; rebuildWorld(); renderPanels(); });
}

function bindText(element, apply) {
  element.addEventListener("change", () => { remember(); apply(element.value); renderPanels(); });
}
function bindNumber(element, apply) {
  element.addEventListener("change", () => { remember(); apply(Number(element.value) || 0); renderPanels(); });
}

async function copyText(text) {
  if (navigator.clipboard?.writeText) return navigator.clipboard.writeText(text);
  const area = document.createElement("textarea");
  area.value = text;
  document.body.appendChild(area);
  area.select();
  document.execCommand("copy");
  area.remove();
}

function bindViewport() {
  const canvas = renderer.domElement;
  canvas.addEventListener("pointerdown", e => {
    canvas.setPointerCapture?.(e.pointerId);
    state.pointerDown = { id: e.pointerId, x: e.clientX, y: e.clientY, lastX: e.clientX, lastY: e.clientY };
    state.dragging = false;
  });
  canvas.addEventListener("pointermove", e => {
    updateCoordReadout(e.clientX, e.clientY);
    if (!state.pointerDown || state.pointerDown.id !== e.pointerId) return;
    const dx = e.clientX - state.pointerDown.lastX;
    const dy = e.clientY - state.pointerDown.lastY;
    const total = Math.hypot(e.clientX - state.pointerDown.x, e.clientY - state.pointerDown.y);
    if (total > 5) state.dragging = true;
    if (state.dragging) {
      if (isGlobeMap(state.map)) {
        state.globeRotation.y += dx * .007;
        state.globeRotation.x = THREE.MathUtils.clamp(state.globeRotation.x + dy * .006, -1.35, 1.35);
      } else if (state.tool === "select" || e.shiftKey) {
        const scale = .055 / state.flatZoom;
        state.flatTarget.x -= (dx - dy) * scale;
        state.flatTarget.z -= (dx + dy) * scale;
        clampFlatTarget();
      }
    }
    state.pointerDown.lastX = e.clientX;
    state.pointerDown.lastY = e.clientY;
  });
  canvas.addEventListener("pointerup", e => {
    if (!state.pointerDown || state.pointerDown.id !== e.pointerId) return;
    if (!state.dragging) placeAt(pickWorld(e.clientX, e.clientY));
    state.pointerDown = null;
    state.dragging = false;
  });
  canvas.addEventListener("wheel", e => {
    e.preventDefault();
    if (isGlobeMap(state.map)) globeCamera.position.z = THREE.MathUtils.clamp(globeCamera.position.z * (e.deltaY > 0 ? 1.08 : .92), 34, 130);
    else {
      state.flatZoom = THREE.MathUtils.clamp(state.flatZoom * (e.deltaY > 0 ? .90 : 1.10), .55, 2.2);
      flatCamera.zoom = state.flatZoom;
      flatCamera.updateProjectionMatrix();
    }
  }, { passive: false });
}

function updateCoordReadout(x, y) {
  const hit = pickWorld(x, y);
  if (!hit) return;
  ui.coord.textContent = isGlobeMap(state.map) ? `lat ${round1(hit.point.lat)}° · lon ${round1(hit.point.lon)}°` : `x ${round1(hit.point[0])} · z ${round1(hit.point[2])}`;
}

function clampFlatTarget() {
  const w = Number(state.map.environment.width) || 100;
  const d = Number(state.map.environment.depth) || 72;
  state.flatTarget.x = THREE.MathUtils.clamp(state.flatTarget.x, -w * .4, w * .4);
  state.flatTarget.z = THREE.MathUtils.clamp(state.flatTarget.z, -d * .4, d * .4);
}

function resize() {
  const w = Math.max(1, ui.viewport.clientWidth);
  const h = Math.max(1, ui.viewport.clientHeight);
  renderer.setSize(w, h, false);
  const aspect = w / h;
  const view = 25;
  flatCamera.left = -view * aspect;
  flatCamera.right = view * aspect;
  flatCamera.top = view;
  flatCamera.bottom = -view;
  flatCamera.updateProjectionMatrix();
  globeCamera.aspect = aspect;
  globeCamera.updateProjectionMatrix();
}

function updateCamera() {
  if (isGlobeMap(state.map)) {
    globeRoot.rotation.x += (state.globeRotation.x - globeRoot.rotation.x) * .12;
    globeRoot.rotation.y += (state.globeRotation.y - globeRoot.rotation.y) * .12;
    globeCamera.lookAt(0, 0, 0);
  } else {
    const offset = new THREE.Vector3(38, 48, 40);
    flatCamera.position.copy(state.flatTarget).add(offset);
    flatCamera.lookAt(state.flatTarget);
  }
}

function animateMarkers(time, dt) {
  for (const record of state.markerRecords) {
    const marker = record.marker;
    marker?.traverse(obj => {
      if (obj.userData.spin) obj.rotation.y += obj.userData.spin * dt;
      if (obj.userData.pulse !== undefined) {
        const s = 1 + Math.sin(time * 2.2 + obj.userData.pulse) * .07;
        obj.scale.setScalar(s);
      }
    });
    if (record.marker) {
      const selected = state.selected && selectedMatches({ type: record.type, key: record.key, object: record.object });
      record.marker.scale.lerp(new THREE.Vector3().setScalar(selected ? 1.28 : 1), .15);
    }
  }
}

function flashHint(message) {
  const old = ui.hint.textContent;
  ui.hint.textContent = message;
  clearTimeout(flashHint.timer);
  flashHint.timer = setTimeout(() => { updateToolHint(); }, 1700);
}

function normalizeColor(value, fallback) {
  if (typeof value === "string" && /^#[0-9a-f]{6}$/i.test(value)) return value;
  return fallback;
}
function round1(value) { return Math.round(Number(value) * 10) / 10; }
function escapeHtml(value) { return String(value).replace(/[&<>"]/g, c => ({ "&":"&amp;", "<":"&lt;", ">":"&gt;", '"':"&quot;" }[c])); }
function escapeAttr(value) { return escapeHtml(value).replace(/'/g, "&#39;"); }

window.addEventListener("resize", resize);
bindUI();
bindViewport();
syncUIFromMap();
ui.mapSeed.value = state.map.seed;
rebuildWorld();
renderPanels();

let last = performance.now() / 1000;
function frame(ms) {
  const time = ms / 1000;
  const dt = Math.min(.05, Math.max(0, time - last));
  last = time;
  updateCamera();
  animateMarkers(time, dt);
  renderer.render(scene, currentCamera());
  requestAnimationFrame(frame);
}
requestAnimationFrame(frame);
