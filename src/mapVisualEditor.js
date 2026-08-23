import * as THREE from "three";
import { getMapList, getMapById } from "./maps.js";
import { normalizeMapDefinition, exportMapJSON, validateMapDefinition } from "./mapSchema.js";
import { DECORATION_CATALOG, SURFACE_SKINS } from "./worldCatalog.js";
import {
  animateMapVisualLayer,
  applyMapEnvironment,
  applyTerrainStampsToGeometry,
  createDecorationLayer,
  createSurfacePaintLayer,
  flatHeightAt
} from "./mapVisuals.js";

const $ = id => document.getElementById(id);
const ui = {
  builtin: $("builtinMap"), loadBuiltin: $("loadBuiltin"), importBtn: $("importBtn"), exportBtn: $("exportBtn"), fileInput: $("fileInput"),
  terrainTint: $("terrainTint"), skyTint: $("skyTint"), fogTint: $("fogTint"), fogDensity: $("fogDensity"),
  procedural: $("proceduralScenery"), legacyRoads: $("legacyRoads"), legacyCenterpiece: $("legacyCenterpiece"), tools: $("tools"),
  decorationAsset: $("decorationAsset"), decorationScale: $("decorationScale"), decorationRotation: $("decorationRotation"), scatterCount: $("scatterCount"), scatterRadius: $("scatterRadius"),
  surfaceSkin: $("surfaceSkin"), surfaceShape: $("surfaceShape"), surfaceOpacity: $("surfaceOpacity"), surfaceRadius: $("surfaceRadius"), surfaceRotation: $("surfaceRotation"), surfaceLength: $("surfaceLength"), surfaceWidth: $("surfaceWidth"),
  terrainKind: $("terrainKind"), terrainRadius: $("terrainRadius"), terrainStrength: $("terrainStrength"),
  viewport: $("viewport"), mapName: $("mapName"), coords: $("coords"), status: $("status"), objectCount: $("objectCount"), objectList: $("objectList"),
  inspector: $("inspector"), inspectorBody: $("inspectorBody"), deleteSelected: $("deleteSelected"), validation: $("validation"), undo: $("undoBtn"), copyBtn: $("copyBtn"), clearVisuals: $("clearVisuals")
};

const firstMap = getMapList().find(map => map.projection === "flat");
const state = {
  map: normalizeMapDefinition(JSON.parse(JSON.stringify(firstMap))),
  tool: "select",
  selected: null,
  history: [],
  cameraTarget: new THREE.Vector3(),
  zoom: 1,
  pointerDown: null,
  dragging: false,
  centerMarkers: []
};

const scene = new THREE.Scene();
scene.background = new THREE.Color(0x8eb4c4);
scene.fog = new THREE.FogExp2(0x8eb4c4, .0105);
const renderer = new THREE.WebGLRenderer({ antialias: true, powerPreference: "high-performance" });
renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 1.75));
renderer.shadowMap.enabled = true;
renderer.shadowMap.type = THREE.PCFSoftShadowMap;
renderer.outputColorSpace = THREE.SRGBColorSpace;
ui.viewport.appendChild(renderer.domElement);

const camera = new THREE.OrthographicCamera(-34, 34, 25, -25, .1, 300);
const raycaster = new THREE.Raycaster();
const pointer = new THREE.Vector2();
const worldGroup = new THREE.Group();
const markerGroup = new THREE.Group();
scene.add(worldGroup, markerGroup);
let ground = null;
let surfaceLayer = null;
let decorationLayer = null;

scene.add(new THREE.HemisphereLight(0xeaf7ff, 0x354737, 2));
const sun = new THREE.DirectionalLight(0xffefd1, 3.1);
sun.position.set(-35, 52, 30);
sun.castShadow = true;
sun.shadow.mapSize.set(2048, 2048);
sun.shadow.camera.left = -65;
sun.shadow.camera.right = 65;
sun.shadow.camera.top = 60;
sun.shadow.camera.bottom = -60;
scene.add(sun);

function material(color, opts = {}) {
  return new THREE.MeshStandardMaterial({ color, roughness: .9, metalness: .02, flatShading: true, ...opts });
}

function disposeGroup(group) {
  for (const child of [...group.children]) {
    child.traverse(object => {
      object.geometry?.dispose?.();
      if (Array.isArray(object.material)) object.material.forEach(mat => mat?.dispose?.());
      else object.material?.dispose?.();
    });
    group.remove(child);
  }
}

function cloneMap(map) {
  return normalizeMapDefinition(JSON.parse(JSON.stringify(map)));
}

function remember() {
  state.history.push(exportMapJSON(state.map));
  if (state.history.length > 35) state.history.shift();
  ui.undo.disabled = state.history.length === 0;
}

function undo() {
  const previous = state.history.pop();
  if (!previous) return;
  state.map = normalizeMapDefinition(JSON.parse(previous));
  state.selected = null;
  syncControls();
  rebuild();
  renderPanels();
  ui.undo.disabled = state.history.length === 0;
}

function ensureVisualFields() {
  state.map.environment ||= {};
  state.map.environment.width ||= 100;
  state.map.environment.depth ||= 72;
  state.map.environment.terrainTint ||= "#75985f";
  state.map.environment.skyTint ||= "#8eb4c4";
  state.map.environment.fogTint ||= state.map.environment.skyTint;
  state.map.environment.fogDensity = Number(state.map.environment.fogDensity ?? .0105);
  if (state.map.environment.proceduralScenery === undefined) state.map.environment.proceduralScenery = false;
  if (state.map.environment.legacyRoads === undefined) state.map.environment.legacyRoads = false;
  if (state.map.environment.legacyCenterpiece === undefined) state.map.environment.legacyCenterpiece = false;
  state.map.decorations ||= [];
  state.map.surfacePaint ||= [];
  state.map.terrainStamps ||= [];
}

function buildGround() {
  const width = Number(state.map.environment.width || 100);
  const depth = Number(state.map.environment.depth || 72);
  const geometry = new THREE.PlaneGeometry(width, depth, 42, 32);
  geometry.rotateX(-Math.PI / 2);
  applyTerrainStampsToGeometry(geometry, state.map, { additive: false });
  ground = new THREE.Mesh(geometry, material(state.map.environment.terrainTint || "#75985f"));
  ground.receiveShadow = true;
  ground.name = "visual-editor-ground";
  worldGroup.add(ground);

  const grid = new THREE.GridHelper(Math.max(width, depth), Math.round(Math.max(width, depth) / 4), 0x506678, 0x536b59);
  grid.position.y = .04;
  grid.material.transparent = true;
  grid.material.opacity = .10;
  worldGroup.add(grid);
}

function marker(color, radius = .75) {
  const mesh = new THREE.Mesh(
    new THREE.TorusGeometry(radius, .08, 6, 28),
    new THREE.MeshBasicMaterial({ color, transparent: true, opacity: .78, depthWrite: false })
  );
  mesh.rotation.x = Math.PI / 2;
  mesh.position.y = .1;
  return mesh;
}

function buildContextMarkers() {
  const starts = Array.isArray(state.map.playerStarts) && state.map.playerStarts.length
    ? state.map.playerStarts
    : [state.map.playerStart, state.map.enemyStart].filter(Array.isArray);
  starts.forEach((point, index) => {
    const ring = marker(index === 0 ? 0x66d6ff : 0xe27780, .95);
    ring.position.set(point[0], flatHeightAt(state.map, point[0], point[2]) + .12, point[2]);
    markerGroup.add(ring);
  });
  for (const site of state.map.strategicSites || []) {
    if (!Array.isArray(site.position)) continue;
    const ring = marker(0xe2c66a, 1.08);
    ring.position.set(site.position[0], flatHeightAt(state.map, site.position[0], site.position[2]) + .12, site.position[2]);
    markerGroup.add(ring);
  }
}

function visualRecords() {
  return [
    ...(state.map.decorations || []).map((object, index) => ({ type: "decoration", object, index, icon: "✦" })),
    ...(state.map.surfacePaint || []).map((object, index) => ({ type: "surface", object, index, icon: "▦" })),
    ...(state.map.terrainStamps || []).map((object, index) => ({ type: "terrain", object, index, icon: "▲" }))
  ];
}

function buildVisualCenterMarkers() {
  state.centerMarkers = [];
  for (const record of visualRecords()) {
    const point = record.object.position;
    if (!Array.isArray(point)) continue;
    const color = record.type === "decoration" ? 0xc29bf0 : record.type === "surface" ? 0x6bc2df : 0xe0b36b;
    const ring = marker(color, .58);
    ring.position.set(point[0], flatHeightAt(state.map, point[0], point[2]) + .16, point[2]);
    ring.userData.visualRecord = record;
    const selected = selectedMatches(record);
    ring.scale.setScalar(selected ? 1.5 : 1);
    markerGroup.add(ring);
    state.centerMarkers.push({ record, ring });
  }
}

function rebuild() {
  ensureVisualFields();
  disposeGroup(worldGroup);
  disposeGroup(markerGroup);
  ground = null;
  applyMapEnvironment(scene, state.map);
  buildGround();
  surfaceLayer = createSurfacePaintLayer(state.map);
  decorationLayer = createDecorationLayer(state.map);
  worldGroup.add(surfaceLayer, decorationLayer);
  buildContextMarkers();
  buildVisualCenterMarkers();
  ui.mapName.textContent = state.map.name || state.map.id;
  resize();
}

function uniqueId(prefix) {
  const used = new Set(visualRecords().map(record => record.object.id).filter(Boolean));
  let index = 1;
  let id = `${prefix}-${index}`;
  while (used.has(id)) id = `${prefix}-${++index}`;
  return id;
}

function pickGround(clientX, clientY) {
  if (!ground) return null;
  const rect = renderer.domElement.getBoundingClientRect();
  pointer.x = ((clientX - rect.left) / rect.width) * 2 - 1;
  pointer.y = -((clientY - rect.top) / rect.height) * 2 + 1;
  raycaster.setFromCamera(pointer, camera);
  return raycaster.intersectObject(ground, false)[0]?.point?.clone() || null;
}

function nearestRecord(point) {
  if (!point) return null;
  let best = null;
  let bestDistance = 3.6;
  for (const record of visualRecords()) {
    const p = record.object.position;
    if (!Array.isArray(p)) continue;
    const distance = Math.hypot(point.x - p[0], point.z - p[2]);
    if (distance < bestDistance) {
      best = record;
      bestDistance = distance;
    }
  }
  return best;
}

function placeAt(point) {
  if (!point) return;
  if (state.tool === "select") {
    const record = nearestRecord(point);
    state.selected = record ? { type: record.type, object: record.object } : null;
    renderPanels();
    rebuild();
    return;
  }
  if (state.tool === "erase") {
    const record = nearestRecord(point);
    if (record) deleteRecord(record);
    return;
  }

  remember();
  const position = [round1(point.x), 0, round1(point.z)];
  if (state.tool === "decoration") {
    const def = DECORATION_CATALOG.find(item => item.id === ui.decorationAsset.value) || DECORATION_CATALOG[0];
    const object = {
      id: uniqueId("decoration"), name: def.name, asset: def.id, position,
      scale: clampNumber(ui.decorationScale.value, .1, 8, 1), rotation: Number(ui.decorationRotation.value || 0), tint: "#ffffff",
      scatterCount: Math.round(clampNumber(ui.scatterCount.value, 1, 48, 1)), scatterRadius: clampNumber(ui.scatterRadius.value, 0, 30, 0), enabled: true, tags: []
    };
    state.map.decorations.push(object);
    state.selected = { type: "decoration", object };
  } else if (state.tool === "surface") {
    const skin = SURFACE_SKINS.find(item => item.id === ui.surfaceSkin.value) || SURFACE_SKINS[0];
    const object = {
      id: uniqueId("paint"), name: skin.name, skin: skin.id, position, shape: ui.surfaceShape.value,
      radius: clampNumber(ui.surfaceRadius.value, .5, 40, 6), length: clampNumber(ui.surfaceLength.value, 1, 120, 24), width: clampNumber(ui.surfaceWidth.value, .5, 30, 4),
      rotation: Number(ui.surfaceRotation.value || 0), opacity: clampNumber(ui.surfaceOpacity.value, .08, .92, .62), tint: "#ffffff", enabled: true, tags: []
    };
    state.map.surfacePaint.push(object);
    state.selected = { type: "surface", object };
  } else if (state.tool === "terrain") {
    const object = {
      id: uniqueId("terrain"), name: `${ui.terrainKind.value} terrain`, kind: ui.terrainKind.value, position,
      radius: clampNumber(ui.terrainRadius.value, 1, 40, 8), strength: clampNumber(ui.terrainStrength.value, .1, 4, 1), enabled: true, tags: []
    };
    state.map.terrainStamps.push(object);
    state.selected = { type: "terrain", object };
  }
  rebuild();
  renderPanels();
}

function deleteRecord(record) {
  if (!record) return;
  remember();
  if (record.type === "decoration") state.map.decorations = state.map.decorations.filter(item => item !== record.object);
  if (record.type === "surface") state.map.surfacePaint = state.map.surfacePaint.filter(item => item !== record.object);
  if (record.type === "terrain") state.map.terrainStamps = state.map.terrainStamps.filter(item => item !== record.object);
  state.selected = null;
  rebuild();
  renderPanels();
}

function selectedMatches(record) {
  return Boolean(state.selected && state.selected.type === record.type && state.selected.object === record.object);
}

function recordLabel(record) {
  const object = record.object;
  if (record.type === "decoration") return `${object.name || object.asset}${Number(object.scatterCount || 1) > 1 ? ` ×${object.scatterCount}` : ""}`;
  if (record.type === "surface") return `${object.name || object.skin} • ${object.shape || "circle"}`;
  return `${object.name || object.kind}`;
}

function renderPanels() {
  const records = visualRecords();
  ui.objectCount.textContent = `${records.length} visual object${records.length === 1 ? "" : "s"}`;
  ui.objectList.innerHTML = "";
  for (const record of records) {
    const item = document.createElement("div");
    item.className = `object ${selectedMatches(record) ? "active" : ""}`;
    const point = record.object.position || [0,0,0];
    item.innerHTML = `<span>${record.icon}</span><div><b>${esc(recordLabel(record))}</b><small>x ${round1(point[0])} · z ${round1(point[2])}</small></div><span class="chip">${record.type}</span>`;
    item.addEventListener("click", () => { state.selected = { type: record.type, object: record.object }; renderPanels(); rebuild(); focusPoint(point); });
    ui.objectList.appendChild(item);
  }
  renderInspector();
  renderValidation();
}

function renderInspector() {
  const selected = state.selected;
  if (!selected) {
    ui.inspector.classList.add("hidden");
    return;
  }
  ui.inspector.classList.remove("hidden");
  const object = selected.object;
  const common = `<label>Name<input data-field="name" value="${attr(object.name || "")}"></label><label>ID<input data-field="id" value="${attr(object.id || "")}"></label><div class="coords">x ${round1(object.position?.[0])} · z ${round1(object.position?.[2])}</div>`;

  if (selected.type === "decoration") {
    ui.inspectorBody.innerHTML = common + `
      <label>Asset<select data-field="asset">${DECORATION_CATALOG.map(item => `<option value="${attr(item.id)}">${esc(item.name)}</option>`).join("")}</select></label>
      <div class="inspector-grid"><label>Scale<input data-number="scale" type="number" min="0.1" max="8" step="0.1" value="${object.scale ?? 1}"></label><label>Rotation<input data-number="rotation" type="number" step="5" value="${object.rotation ?? 0}"></label></div>
      <div class="inspector-grid"><label>Scatter count<input data-number="scatterCount" type="number" min="1" max="48" value="${object.scatterCount ?? 1}"></label><label>Scatter radius<input data-number="scatterRadius" type="number" min="0" max="30" step="0.5" value="${object.scatterRadius ?? 0}"></label></div>
      <label>Tint<input data-field="tint" type="color" value="${safeColor(object.tint, "#ffffff")}"></label>`;
    ui.inspectorBody.querySelector('[data-field="asset"]').value = object.asset;
  } else if (selected.type === "surface") {
    ui.inspectorBody.innerHTML = common + `
      <label>Surface<select data-field="skin">${SURFACE_SKINS.map(item => `<option value="${attr(item.id)}">${esc(item.name)}</option>`).join("")}</select></label>
      <div class="inspector-grid"><label>Shape<select data-field="shape"><option value="circle">Circle</option><option value="strip">Strip / road / river</option></select></label><label>Opacity<input data-number="opacity" type="number" min="0.08" max="0.92" step="0.05" value="${object.opacity ?? .62}"></label></div>
      <div class="inspector-grid"><label>Radius<input data-number="radius" type="number" min="0.5" max="40" step="0.5" value="${object.radius ?? 5}"></label><label>Rotation<input data-number="rotation" type="number" step="5" value="${object.rotation ?? 0}"></label></div>
      <div class="inspector-grid"><label>Length<input data-number="length" type="number" min="1" max="120" value="${object.length ?? 16}"></label><label>Width<input data-number="width" type="number" min="0.5" max="30" step="0.5" value="${object.width ?? 3.5}"></label></div>
      <label>Tint<input data-field="tint" type="color" value="${safeColor(object.tint, "#ffffff")}"></label>`;
    ui.inspectorBody.querySelector('[data-field="skin"]').value = object.skin;
    ui.inspectorBody.querySelector('[data-field="shape"]').value = object.shape || "circle";
  } else {
    ui.inspectorBody.innerHTML = common + `
      <div class="inspector-grid"><label>Kind<select data-field="kind"><option value="hill">Hill</option><option value="rough">Rough</option><option value="water">Basin</option><option value="crater">Crater</option><option value="forest">Forest floor rise</option></select></label><label>Radius<input data-number="radius" type="number" min="1" max="40" step="0.5" value="${object.radius ?? 8}"></label></div>
      <label>Strength<input data-number="strength" type="number" min="0.1" max="4" step="0.1" value="${object.strength ?? 1}"></label>`;
    ui.inspectorBody.querySelector('[data-field="kind"]').value = object.kind || "hill";
  }

  bindInspector();
}

function bindInspector() {
  const object = state.selected.object;
  for (const input of ui.inspectorBody.querySelectorAll("[data-field]")) {
    input.addEventListener("change", () => {
      remember();
      object[input.dataset.field] = input.value;
      rebuild();
      renderPanels();
    });
  }
  for (const input of ui.inspectorBody.querySelectorAll("[data-number]")) {
    input.addEventListener("change", () => {
      remember();
      const field = input.dataset.number;
      let value = Number(input.value) || 0;
      if (field === "scatterCount") value = Math.max(1, Math.min(48, Math.round(value)));
      object[field] = value;
      rebuild();
      renderPanels();
    });
  }
}

function renderValidation() {
  const result = validateMapDefinition(state.map);
  const lines = [];
  if (state.map.projection !== "flat") lines.push(`<div class="bad">× Visual Layer mode is flat-map only in this phase.</div>`);
  else if (result.valid) lines.push(`<div class="ok">✓ AXM map schema valid.</div>`);
  result.errors.forEach(error => lines.push(`<div class="bad">× ${esc(error)}</div>`));
  result.warnings.forEach(warning => lines.push(`<div class="warn">! ${esc(warning)}</div>`));
  lines.push(`<div>✦ ${state.map.decorations.length} decoration definitions</div>`);
  lines.push(`<div>▦ ${state.map.surfacePaint.length} painted surfaces</div>`);
  lines.push(`<div>▲ ${state.map.terrainStamps.length} terrain stamps</div>`);
  const scattered = state.map.decorations.reduce((sum, item) => sum + Math.max(1, Number(item.scatterCount || 1)), 0);
  lines.push(`<div>◇ approximately ${scattered} rendered decoration instances</div>`);
  ui.validation.innerHTML = lines.join("");
}

function loadMap(map) {
  const normalized = cloneMap(map);
  if (normalized.projection !== "flat") {
    setStatus("Visual Layer mode currently edits flat maps. Use Scenario Studio for globe visual authoring.", "bad");
    return false;
  }
  remember();
  state.map = normalized;
  ensureVisualFields();
  state.selected = null;
  state.cameraTarget.set(0, 0, 0);
  state.zoom = 1;
  camera.zoom = 1;
  camera.updateProjectionMatrix();
  syncControls();
  rebuild();
  renderPanels();
  return true;
}

function syncControls() {
  ensureVisualFields();
  ui.terrainTint.value = safeColor(state.map.environment.terrainTint, "#75985f");
  ui.skyTint.value = safeColor(state.map.environment.skyTint, "#8eb4c4");
  ui.fogTint.value = safeColor(state.map.environment.fogTint, "#8eb4c4");
  ui.fogDensity.value = Number(state.map.environment.fogDensity ?? .0105);
  ui.procedural.checked = state.map.environment.proceduralScenery !== false;
  ui.legacyRoads.checked = state.map.environment.legacyRoads !== false;
  ui.legacyCenterpiece.checked = state.map.environment.legacyCenterpiece !== false;
  ui.mapName.textContent = state.map.name;
}

function setTool(tool) {
  state.tool = tool;
  for (const button of ui.tools.querySelectorAll("button[data-tool]")) button.classList.toggle("active", button.dataset.tool === tool);
  const hints = {
    select: "Drag to pan • click a visual-layer center marker to inspect.",
    decoration: "Click terrain to place or scatter the selected decoration.",
    surface: "Click terrain to paint a circle or place a road/river strip.",
    terrain: "Click terrain to add a real height stamp.",
    erase: "Click near a visual-layer center marker to remove it."
  };
  setStatus(hints[tool] || "Click the battlefield.");
}

function setStatus(text) {
  ui.status.textContent = text;
}

function populateCatalogs() {
  ui.builtin.innerHTML = getMapList().filter(map => map.projection === "flat").map(map => `<option value="${attr(map.id)}">${esc(map.name)} • ${Number(map.recommendedPlayers || 2)}P</option>`).join("");
  ui.decorationAsset.innerHTML = DECORATION_CATALOG.map(item => `<option value="${attr(item.id)}">${esc(item.name)} — ${esc(item.category)}</option>`).join("");
  ui.surfaceSkin.innerHTML = SURFACE_SKINS.map(item => `<option value="${attr(item.id)}">${esc(item.name)}</option>`).join("");
  if (state.map?.id) ui.builtin.value = state.map.id;
}

function bindEnvironment() {
  const bindings = [
    [ui.terrainTint, "terrainTint", value => value],
    [ui.skyTint, "skyTint", value => value],
    [ui.fogTint, "fogTint", value => value],
    [ui.fogDensity, "fogDensity", value => clampNumber(value, 0, .04, .0105)]
  ];
  for (const [element, key, convert] of bindings) {
    element.addEventListener("change", () => {
      remember();
      state.map.environment[key] = convert(element.value);
      rebuild();
      renderPanels();
    });
  }
  for (const [element, key] of [[ui.procedural, "proceduralScenery"], [ui.legacyRoads, "legacyRoads"], [ui.legacyCenterpiece, "legacyCenterpiece"]]) {
    element.addEventListener("change", () => {
      remember();
      state.map.environment[key] = element.checked;
      renderPanels();
    });
  }
}

function bindUI() {
  ui.tools.addEventListener("click", event => {
    const button = event.target.closest("button[data-tool]");
    if (button) setTool(button.dataset.tool);
  });
  ui.loadBuiltin.addEventListener("click", () => {
    const map = getMapById(ui.builtin.value);
    if (map && loadMap(map)) setStatus(`${map.name} loaded with its authored visual layer.`);
  });
  ui.importBtn.addEventListener("click", () => ui.fileInput.click());
  ui.fileInput.addEventListener("change", async () => {
    const file = ui.fileInput.files?.[0];
    if (!file) return;
    try {
      const parsed = JSON.parse(await file.text());
      if (loadMap(parsed)) setStatus("Imported map loaded into Visual Layer mode.");
    } catch (error) {
      setStatus(`Import failed: ${error.message}`);
    } finally {
      ui.fileInput.value = "";
    }
  });
  ui.exportBtn.addEventListener("click", () => {
    const json = exportMapJSON(state.map);
    const blob = new Blob([json], { type: "application/json" });
    const url = URL.createObjectURL(blob);
    const anchor = document.createElement("a");
    anchor.href = url;
    anchor.download = `${state.map.id || "map"}.axm-map.json`;
    anchor.click();
    setTimeout(() => URL.revokeObjectURL(url), 1200);
    setStatus("Map JSON exported with visual layer intact.");
  });
  ui.copyBtn.addEventListener("click", async () => {
    const json = exportMapJSON(state.map);
    if (navigator.clipboard?.writeText) await navigator.clipboard.writeText(json);
    else {
      const area = document.createElement("textarea");
      area.value = json;
      document.body.appendChild(area);
      area.select();
      document.execCommand("copy");
      area.remove();
    }
    setStatus("Map JSON copied.");
  });
  ui.undo.addEventListener("click", undo);
  ui.deleteSelected.addEventListener("click", () => {
    if (state.selected) deleteRecord({ type: state.selected.type, object: state.selected.object });
  });
  ui.clearVisuals.addEventListener("click", () => {
    remember();
    state.map.decorations = [];
    state.map.surfacePaint = [];
    state.map.terrainStamps = [];
    state.selected = null;
    rebuild();
    renderPanels();
    setStatus("Visual layer cleared; strategic map data was preserved.");
  });
  bindEnvironment();
}

function bindViewport() {
  const canvas = renderer.domElement;
  canvas.addEventListener("pointerdown", event => {
    canvas.setPointerCapture?.(event.pointerId);
    state.pointerDown = { id: event.pointerId, x: event.clientX, y: event.clientY, lastX: event.clientX, lastY: event.clientY };
    state.dragging = false;
  });
  canvas.addEventListener("pointermove", event => {
    const point = pickGround(event.clientX, event.clientY);
    if (point) ui.coords.textContent = `x ${round1(point.x)} · z ${round1(point.z)}`;
    if (!state.pointerDown || state.pointerDown.id !== event.pointerId) return;
    const dx = event.clientX - state.pointerDown.lastX;
    const dy = event.clientY - state.pointerDown.lastY;
    if (Math.hypot(event.clientX - state.pointerDown.x, event.clientY - state.pointerDown.y) > 5) state.dragging = true;
    if (state.dragging && (state.tool === "select" || event.shiftKey)) {
      const scale = .055 / state.zoom;
      state.cameraTarget.x -= (dx - dy) * scale;
      state.cameraTarget.z -= (dx + dy) * scale;
      clampTarget();
    }
    state.pointerDown.lastX = event.clientX;
    state.pointerDown.lastY = event.clientY;
  });
  canvas.addEventListener("pointerup", event => {
    if (!state.pointerDown || state.pointerDown.id !== event.pointerId) return;
    if (!state.dragging) placeAt(pickGround(event.clientX, event.clientY));
    state.pointerDown = null;
    state.dragging = false;
  });
  canvas.addEventListener("wheel", event => {
    event.preventDefault();
    state.zoom = THREE.MathUtils.clamp(state.zoom * (event.deltaY > 0 ? .90 : 1.10), .55, 2.2);
    camera.zoom = state.zoom;
    camera.updateProjectionMatrix();
  }, { passive: false });
}

function focusPoint(point) {
  if (!Array.isArray(point)) return;
  state.cameraTarget.set(point[0], 0, point[2]);
  clampTarget();
}

function clampTarget() {
  const width = Number(state.map.environment.width || 100);
  const depth = Number(state.map.environment.depth || 72);
  state.cameraTarget.x = THREE.MathUtils.clamp(state.cameraTarget.x, -width * .42, width * .42);
  state.cameraTarget.z = THREE.MathUtils.clamp(state.cameraTarget.z, -depth * .42, depth * .42);
}

function resize() {
  const width = Math.max(1, ui.viewport.clientWidth);
  const height = Math.max(1, ui.viewport.clientHeight);
  renderer.setSize(width, height, false);
  const aspect = width / height;
  const view = 25;
  camera.left = -view * aspect;
  camera.right = view * aspect;
  camera.top = view;
  camera.bottom = -view;
  camera.updateProjectionMatrix();
}

function updateCamera() {
  camera.position.copy(state.cameraTarget).add(new THREE.Vector3(38, 48, 40));
  camera.lookAt(state.cameraTarget);
}

function clampNumber(value, min, max, fallback) {
  const number = Number(value);
  if (!Number.isFinite(number)) return fallback;
  return Math.max(min, Math.min(max, number));
}
function safeColor(value, fallback) { return typeof value === "string" && /^#[0-9a-f]{6}$/i.test(value) ? value : fallback; }
function round1(value) { return Math.round(Number(value || 0) * 10) / 10; }
function esc(value) { return String(value ?? "").replace(/[&<>"]/g, char => ({ "&":"&amp;", "<":"&lt;", ">":"&gt;", '"':"&quot;" }[char])); }
function attr(value) { return esc(value).replace(/'/g, "&#39;"); }

populateCatalogs();
ensureVisualFields();
syncControls();
bindUI();
bindViewport();
rebuild();
renderPanels();
setTool("select");
window.addEventListener("resize", resize);

let last = performance.now() / 1000;
function frame(ms) {
  const time = ms / 1000;
  const dt = Math.min(.05, Math.max(0, time - last));
  last = time;
  updateCamera();
  animateMapVisualLayer(decorationLayer, time, dt);
  renderer.render(scene, camera);
  requestAnimationFrame(frame);
}
requestAnimationFrame(frame);
