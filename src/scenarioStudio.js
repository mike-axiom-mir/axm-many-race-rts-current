import * as THREE from "three";
import {
  createBlankMap,
  normalizeMapDefinition,
  validateMapDefinition,
  exportMapJSON,
  geoToCartesian,
  cartesianToGeo,
  isGlobeMap
} from "./mapSchema.js";
import { DECORATION_CATALOG, SURFACE_SKINS, ZONE_PRESETS, OWNER_OPTIONS, decorationById, skinById } from "./worldCatalog.js";
import { RULE_EVENTS, CONDITION_TYPES, ACTION_TYPES, createRule, validateRule } from "./scenarioRules.js";

const $ = id => document.getElementById(id);
const ui = {
  viewport: $("viewport"), mapBadge: $("mapBadge"), coord: $("coordReadout"), hint: $("hint"), modeTabs: $("modeTabs"),
  decoratePanel: $("decoratePanel"), surfacePanel: $("surfacePanel"), zonesPanel: $("zonesPanel"), campaignPanel: $("campaignPanel"),
  decorCategory: $("decorCategory"), decorPalette: $("decorPalette"), skinPalette: $("skinPalette"), zonePalette: $("zonePalette"),
  brushRadius: $("brushRadius"), brushTint: $("brushTint"), brushOpacity: $("brushOpacity"), zoneRadius: $("zoneRadius"),
  selectTool: $("selectTool"), eraseTool: $("eraseTool"), undoBtn: $("undoBtn"), objectList: $("objectList"), contentCount: $("contentCount"),
  inspector: $("inspector"), inspectorBody: $("inspectorBody"), objectRules: $("objectRules"), addObjectRuleBtn: $("addObjectRuleBtn"), deleteSelectedBtn: $("deleteSelectedBtn"),
  globalRules: $("globalRules"), addGlobalRuleBtn: $("addGlobalRuleBtn"), variablesText: $("variablesText"), validation: $("validation"),
  importBtn: $("importBtn"), exportBtn: $("exportBtn"), copyBtn: $("copyBtn"), playBtn: $("playBtn"), fileInput: $("fileInput"),
  campaignEnabled: $("campaignEnabled"), campaignId: $("campaignId"), chapterId: $("chapterId"), missionId: $("missionId"), missionTitle: $("missionTitle"), briefing: $("briefing"),
  victoryText: $("victoryText"), defeatText: $("defeatText"), startingAge: $("startingAge"), nextMapId: $("nextMapId"), addObjectiveBtn: $("addObjectiveBtn"), objectiveList: $("objectiveList")
};

const COLLECTIONS = {
  strategic: "strategicSites",
  resource: "resourceZones",
  terrain: "terrainStamps",
  decoration: "decorations",
  zone: "ruleZones",
  surface: "surfacePaint"
};

const state = {
  map: createBlankMap("flat"),
  mode: "decorate",
  tool: "select",
  selected: null,
  decorAsset: DECORATION_CATALOG[0].id,
  surfaceSkin: SURFACE_SKINS[0].id,
  zonePreset: ZONE_PRESETS[0].id,
  history: [],
  markers: [],
  pointerDown: null,
  dragging: false,
  flatTarget: new THREE.Vector3(),
  flatZoom: 1,
  globeRotation: { x: -.18, y: .45 }
};

const scene = new THREE.Scene();
scene.background = new THREE.Color(0x8eb4c4);
const renderer = new THREE.WebGLRenderer({ antialias: true, powerPreference: "high-performance" });
renderer.setPixelRatio(Math.min(devicePixelRatio || 1, 1.75));
renderer.shadowMap.enabled = true;
renderer.outputColorSpace = THREE.SRGBColorSpace;
ui.viewport.appendChild(renderer.domElement);
const flatCamera = new THREE.OrthographicCamera(-32, 32, 24, -24, .1, 300);
const globeCamera = new THREE.PerspectiveCamera(42, 1, .1, 500);
globeCamera.position.set(0, 5, 66);
const raycaster = new THREE.Raycaster();
const pointer = new THREE.Vector2();
const worldGroup = new THREE.Group();
const markerGroup = new THREE.Group();
const globeRoot = new THREE.Group();
scene.add(worldGroup, markerGroup, globeRoot);
let flatGround = null;
let globeSurface = null;
scene.add(new THREE.HemisphereLight(0xeaf8ff, 0x354636, 2.1));
const sun = new THREE.DirectionalLight(0xffefd0, 3.2);
sun.position.set(-32, 48, 30);
sun.castShadow = true;
scene.add(sun);

function material(color, extra = {}) {
  return new THREE.MeshStandardMaterial({ color, roughness: .85, metalness: .03, flatShading: true, ...extra });
}

function remember() {
  state.history.push(exportMapJSON(state.map));
  if (state.history.length > 50) state.history.shift();
  ui.undoBtn.disabled = state.history.length === 0;
}

function undo() {
  const json = state.history.pop();
  if (!json) return;
  state.map = normalizeMapDefinition(JSON.parse(json));
  state.selected = null;
  syncCampaign();
  rebuild();
  renderPanels();
}

function currentCamera() { return isGlobeMap(state.map) ? globeCamera : flatCamera; }
function pointOf(object) { return isGlobeMap(state.map) ? object.geo : object.position; }
function clonePoint(point) { return Array.isArray(point) ? [...point] : { ...point }; }
function round1(value) { return Math.round(Number(value) * 10) / 10; }
function escapeHtml(value) { return String(value ?? "").replace(/[&<>"]/g, c => ({ "&":"&amp;", "<":"&lt;", ">":"&gt;", '"':"&quot;" }[c])); }
function escapeAttr(value) { return escapeHtml(value).replace(/'/g, "&#39;"); }
function uniqueId(prefix) {
  const ids = new Set(Object.values(COLLECTIONS).flatMap(key => (state.map[key] || []).map(item => item.id)));
  let i = 1, id = `${prefix}-${i}`;
  while (ids.has(id)) id = `${prefix}-${++i}`;
  return id;
}

function dispose(group) {
  for (const child of [...group.children]) {
    child.traverse(obj => { obj.geometry?.dispose?.(); if (Array.isArray(obj.material)) obj.material.forEach(m => m.dispose?.()); else obj.material?.dispose?.(); });
    group.remove(child);
  }
}

function rebuild() {
  dispose(worldGroup);
  dispose(markerGroup);
  dispose(globeRoot);
  state.markers = [];
  flatGround = null;
  globeSurface = null;
  if (isGlobeMap(state.map)) buildGlobe(); else buildFlat();
  buildAllMarkers();
  resize();
}

function buildFlat() {
  scene.background.setHex(0x8eb4c4);
  const width = Number(state.map.environment.width) || 100;
  const depth = Number(state.map.environment.depth) || 72;
  flatGround = new THREE.Mesh(new THREE.PlaneGeometry(width, depth, 2, 2), material(state.map.environment.terrainTint || "#75985f"));
  flatGround.rotation.x = -Math.PI / 2;
  flatGround.receiveShadow = true;
  worldGroup.add(flatGround);
  const grid = new THREE.GridHelper(Math.max(width, depth), Math.round(Math.max(width, depth) / 3), 0x4f6e43, 0x668054);
  grid.position.y = .03;
  grid.material.transparent = true;
  grid.material.opacity = .14;
  worldGroup.add(grid);
}

function buildGlobe() {
  scene.background.setHex(0x07111a);
  const radius = Number(state.map.environment.radius) || 24;
  globeSurface = new THREE.Mesh(new THREE.IcosahedronGeometry(radius, 5), material(state.map.environment.terrainTint || "#75985f"));
  globeSurface.castShadow = globeSurface.receiveShadow = true;
  globeRoot.add(globeSurface);
  const ocean = new THREE.Mesh(new THREE.SphereGeometry(radius * .997, 64, 32), new THREE.MeshStandardMaterial({ color: state.map.environment.oceanTint || "#315f79", transparent: true, opacity: .5, roughness: .4 }));
  globeRoot.add(ocean);
  if (state.map.environment.atmosphere !== false) {
    globeRoot.add(new THREE.Mesh(new THREE.SphereGeometry(radius * 1.045, 48, 24), new THREE.MeshBasicMaterial({ color: 0x78c9ff, transparent: true, opacity: .07, side: THREE.BackSide, depthWrite: false })));
  }
  globeRoot.rotation.set(state.globeRotation.x, state.globeRotation.y, 0);
}

function markerBase(color = 0xffffff, size = .65) {
  const group = new THREE.Group();
  const core = new THREE.Mesh(new THREE.OctahedronGeometry(size), material(color));
  core.position.y = size + .12;
  core.userData.spin = .35;
  const ring = new THREE.Mesh(new THREE.RingGeometry(size * 1.15, size * 1.45, 28), new THREE.MeshBasicMaterial({ color, transparent: true, opacity: .35, side: THREE.DoubleSide, depthWrite: false }));
  ring.rotation.x = -Math.PI / 2;
  ring.position.y = .04;
  group.add(core, ring);
  return group;
}

function makeDecoration(object) {
  const def = decorationById(object.asset);
  const color = object.tint || def.tint;
  const group = new THREE.Group();
  let mesh;
  if (def.shape === "tree" || def.shape === "pine") {
    const trunk = new THREE.Mesh(new THREE.CylinderGeometry(.16,.25,1.4,6), material(0x6b4e33)); trunk.position.y=.7;
    const crown = new THREE.Mesh(new THREE.ConeGeometry(.8,1.8,7), material(color)); crown.position.y=1.8;
    group.add(trunk,crown);
  } else if (def.shape === "rock") {
    mesh = new THREE.Mesh(new THREE.DodecahedronGeometry(.7,0), material(color)); mesh.position.y=.5; group.add(mesh);
  } else if (def.shape === "pillar" || def.shape === "obelisk") {
    mesh = new THREE.Mesh(new THREE.CylinderGeometry(.35,.5,2.5,6), material(color)); mesh.position.y=1.25; group.add(mesh);
  } else if (def.shape === "arch") {
    const a = new THREE.Mesh(new THREE.BoxGeometry(.35,2,.35), material(color)); a.position.set(-.75,1,0);
    const b = a.clone(); b.position.x=.75;
    const top = new THREE.Mesh(new THREE.BoxGeometry(1.85,.35,.4), material(color)); top.position.y=1.9; group.add(a,b,top);
  } else if (def.shape === "campfire") {
    mesh = new THREE.Mesh(new THREE.ConeGeometry(.45,.8,8), new THREE.MeshBasicMaterial({color})); mesh.position.y=.42; mesh.userData.pulse=true; group.add(mesh);
  } else if (def.shape === "crystal") {
    mesh = new THREE.Mesh(new THREE.OctahedronGeometry(.72), material(color)); mesh.position.y=.8; mesh.userData.spin=.7; group.add(mesh);
  } else {
    mesh = new THREE.Mesh(new THREE.BoxGeometry(1.4,1,1), material(color)); mesh.position.y=.5; group.add(mesh);
  }
  group.scale.setScalar(Number(object.scale) || 1);
  group.rotation.y = THREE.MathUtils.degToRad(Number(object.rotation) || 0);
  return group;
}

function makeSurface(object) {
  const skin = skinById(object.skin);
  const color = object.tint && object.tint !== "#ffffff" ? object.tint : skin.color;
  const radius = Math.max(.5, Number(object.radius) || 5);
  const group = new THREE.Group();
  const disk = new THREE.Mesh(new THREE.CircleGeometry(radius, 42), new THREE.MeshBasicMaterial({ color, transparent: true, opacity: Number(object.opacity) || .55, side: THREE.DoubleSide, depthWrite: false }));
  disk.rotation.x = -Math.PI / 2;
  disk.position.y = .03;
  group.add(disk);
  return group;
}

function makeZone(object) {
  const preset = ZONE_PRESETS.find(item => item.id === object.preset) || ZONE_PRESETS[0];
  const radius = Math.max(1, Number(object.radius) || 8);
  const color = object.tint || preset.tint;
  const group = new THREE.Group();
  const ring = new THREE.Mesh(new THREE.TorusGeometry(radius, .09, 6, 48), new THREE.MeshBasicMaterial({ color, transparent: true, opacity: .65, depthWrite: false }));
  ring.rotation.x = Math.PI / 2;
  const fill = new THREE.Mesh(new THREE.CircleGeometry(radius, 48), new THREE.MeshBasicMaterial({ color, transparent: true, opacity: .07, side: THREE.DoubleSide, depthWrite: false }));
  fill.rotation.x = -Math.PI / 2; fill.position.y=.02;
  group.add(ring,fill);
  return group;
}

function setMarkerPosition(marker, point) {
  if (!isGlobeMap(state.map)) { marker.position.set(point[0], .08, point[2]); return; }
  const radius = Number(state.map.environment.radius) || 24;
  const p = geoToCartesian(point, radius + .08);
  marker.position.copy(p);
  marker.quaternion.setFromUnitVectors(new THREE.Vector3(0,1,0), p.clone().normalize());
}

function addMarker(type, object, marker, collection, index) {
  setMarkerPosition(marker, pointOf(object));
  const record = { type, object, marker, collection, index };
  marker.userData.record = record;
  if (isGlobeMap(state.map)) globeRoot.add(marker); else markerGroup.add(marker);
  state.markers.push(record);
}

function buildAllMarkers() {
  const types = [
    ["strategic","strategicSites",0xf0d36d], ["resource","resourceZones",0x72d5a2], ["terrain","terrainStamps",0xb99370]
  ];
  for (const [type,key,color] of types) (state.map[key]||[]).forEach((object,index)=>addMarker(type,object,markerBase(color),key,index));
  (state.map.decorations||[]).forEach((object,index)=>addMarker("decoration",object,makeDecoration(object),"decorations",index));
  (state.map.surfacePaint||[]).forEach((object,index)=>addMarker("surface",object,makeSurface(object),"surfacePaint",index));
  (state.map.ruleZones||[]).forEach((object,index)=>addMarker("zone",object,makeZone(object),"ruleZones",index));
}

function pickWorld(x,y) {
  const rect=renderer.domElement.getBoundingClientRect();
  pointer.x=((x-rect.left)/rect.width)*2-1; pointer.y=-((y-rect.top)/rect.height)*2+1;
  raycaster.setFromCamera(pointer,currentCamera());
  if (isGlobeMap(state.map)) {
    const hit=globeSurface&&raycaster.intersectObject(globeSurface,false)[0]; if(!hit)return null;
    const local=globeRoot.worldToLocal(hit.point.clone());
    const geo=cartesianToGeo(local,Number(state.map.environment.radius)||24); geo.elevation=0;
    return {point:geo,world:hit.point.clone()};
  }
  const hit=flatGround&&raycaster.intersectObject(flatGround,false)[0]; if(!hit)return null;
  return {point:[round1(hit.point.x),0,round1(hit.point.z)],world:hit.point.clone()};
}

function nearestRecord(hit) {
  let best=null,bestD=Infinity;
  for(const record of state.markers){const p=new THREE.Vector3();record.marker.getWorldPosition(p);const d=p.distanceTo(hit.world);if(d<(isGlobeMap(state.map)?3.3:3.8)&&d<bestD){best=record;bestD=d;}}
  return best;
}

function place(hit) {
  if(!hit)return;
  if(state.tool==="select"){selectRecord(nearestRecord(hit));return;}
  if(state.tool==="erase"){const record=nearestRecord(hit);if(record)deleteRecord(record);return;}
  remember();
  if(state.mode==="decorate"){
    const def=decorationById(state.decorAsset); const id=uniqueId("decor");
    const object={id,name:def.name,asset:def.id,scale:def.scale||1,rotation:0,skin:"default",tint:def.tint,collision:Boolean(def.collision),owner:"world",tags:[def.category],rules:[],enabled:true,layer:"decor",...(isGlobeMap(state.map)?{geo:clonePoint(hit.point)}:{position:clonePoint(hit.point)})};
    state.map.decorations.push(object);state.selected={collection:"decorations",object,type:"decoration"};
  }else if(state.mode==="surface"){
    const skin=skinById(state.surfaceSkin);const id=uniqueId("paint");
    const object={id,name:`${skin.name} Paint`,skin:skin.id,tint:ui.brushTint.value,radius:Number(ui.brushRadius.value)||6,opacity:Number(ui.brushOpacity.value)||.7,blend:"replace",owner:"world",tags:["surface"],rules:[],enabled:true,layer:"surface",...(isGlobeMap(state.map)?{geo:clonePoint(hit.point)}:{position:clonePoint(hit.point)})};
    state.map.surfacePaint.push(object);state.selected={collection:"surfacePaint",object,type:"surface"};
  }else if(state.mode==="zones"){
    const preset=ZONE_PRESETS.find(x=>x.id===state.zonePreset)||ZONE_PRESETS[0];const id=uniqueId("zone");
    const object={id,name:preset.name,preset:preset.id,shape:"circle",radius:Number(ui.zoneRadius.value)||8,tint:preset.tint,owner:"script",tags:[preset.id],rules:[],enabled:true,layer:"rules",...(isGlobeMap(state.map)?{geo:clonePoint(hit.point)}:{position:clonePoint(hit.point)})};
    state.map.ruleZones.push(object);state.selected={collection:"ruleZones",object,type:"zone"};
  }
  rebuild();renderPanels();
}

function selectRecord(record){state.selected=record?{collection:record.collection,object:record.object,type:record.type}:null;renderPanels();}
function deleteRecord(record){if(!record)return;remember();state.map[record.collection]=state.map[record.collection].filter(x=>x!==record.object);state.selected=null;rebuild();renderPanels();}
function deleteSelected(){if(!state.selected)return;deleteRecord(state.selected);}

function records(){return state.markers.map(r=>({type:r.type,collection:r.collection,object:r.object}));}
function locationText(object){const p=pointOf(object);return isGlobeMap(state.map)?`${round1(p.lat)}°, ${round1(p.lon)}°`:`x ${round1(p[0])} · z ${round1(p[2])}`;}

function renderPanels(){
  const list=records();ui.contentCount.textContent=`${list.length} authored object${list.length===1?"":"s"}`;ui.objectList.innerHTML="";
  for(const record of list){const item=document.createElement("div");const active=state.selected?.object===record.object;item.className=`object-item ${active?"active":""}`;item.innerHTML=`<div><b>${escapeHtml(record.object.name||record.object.id)}</b><small>${record.type} · ${locationText(record.object)}</small></div><span class="chip">${record.object.rules?.length||0} rules</span>`;item.onclick=()=>{state.selected=record;renderPanels();};ui.objectList.appendChild(item);}
  renderInspector();renderGlobalRules();renderCampaign();renderValidation();ui.variablesText.value=Object.entries(state.map.variables||{}).map(([k,v])=>`${k}=${String(v)}`).join("\n");ui.mapBadge.textContent=isGlobeMap(state.map)?"GLOBE":"FLAT";ui.playBtn.disabled=!isGlobeMap(state.map);
}

function renderInspector(){
  if(!state.selected){ui.inspector.classList.add("hidden");return;}ui.inspector.classList.remove("hidden");const obj=state.selected.object;
  const ownerOptions=OWNER_OPTIONS.map(owner=>`<option value="${owner}">${owner}</option>`).join("");
  let extra="";
  if(state.selected.type==="decoration") extra=`<div class="mini-grid"><label>Asset<select data-field="asset">${DECORATION_CATALOG.map(x=>`<option value="${x.id}">${x.name}</option>`).join("")}</select></label><label>Scale<input data-num="scale" type="number" min=".1" step=".1" value="${obj.scale||1}"></label><label>Rotation °<input data-num="rotation" type="number" step="5" value="${obj.rotation||0}"></label><label>Tint<input data-field="tint" type="color" value="${obj.tint||"#ffffff"}"></label></div><label class="check"><input data-check="collision" type="checkbox" ${obj.collision?"checked":""}> Collision</label>`;
  else if(state.selected.type==="surface") extra=`<div class="mini-grid"><label>Skin<select data-field="skin">${SURFACE_SKINS.map(x=>`<option value="${x.id}">${x.name}</option>`).join("")}</select></label><label>Radius<input data-num="radius" type="number" min="1" value="${obj.radius||5}"></label><label>Tint<input data-field="tint" type="color" value="${obj.tint||"#ffffff"}"></label><label>Opacity<input data-num="opacity" type="number" min=".1" max="1" step=".05" value="${obj.opacity||.7}"></label></div>`;
  else if(state.selected.type==="zone") extra=`<div class="mini-grid"><label>Preset<select data-field="preset">${ZONE_PRESETS.map(x=>`<option value="${x.id}">${x.name}</option>`).join("")}</select></label><label>Radius<input data-num="radius" type="number" min="1" value="${obj.radius||8}"></label><label>Tint<input data-field="tint" type="color" value="${obj.tint||"#ffffff"}"></label><label>Shape<select data-field="shape"><option>circle</option><option>box</option></select></label></div>`;
  else extra=`<label>Visual skin<input data-field="skin" value="${escapeAttr(obj.skin||"default")}"></label><label>Tint<input data-field="tint" type="color" value="${obj.tint||"#ffffff"}"></label>`;
  ui.inspectorBody.innerHTML=`<label>Name<input data-field="name" value="${escapeAttr(obj.name||"")}"></label><label>ID<input data-field="id" value="${escapeAttr(obj.id||"")}"></label><div class="coords">${locationText(obj)}</div><div class="mini-grid"><label>Owner<select data-field="owner">${ownerOptions}</select></label><label>Layer<input data-field="layer" value="${escapeAttr(obj.layer||"default")}"></label></div><label>Tags<input data-tags value="${escapeAttr((obj.tags||[]).join(", "))}"></label><label class="check"><input data-check="enabled" type="checkbox" ${obj.enabled!==false?"checked":""}> Enabled</label>${extra}`;
  for(const select of ui.inspectorBody.querySelectorAll("select[data-field]")){const key=select.dataset.field;if(obj[key]!=null)select.value=String(obj[key]);}
  bindInspector(obj);renderRuleList(ui.objectRules,obj.rules||[],rules=>{remember();obj.rules=rules;renderPanels();},"object");
}

function bindInspector(obj){
  ui.inspectorBody.querySelectorAll("[data-field]").forEach(input=>input.addEventListener("change",()=>{remember();obj[input.dataset.field]=input.value;rebuild();renderPanels();}));
  ui.inspectorBody.querySelectorAll("[data-num]").forEach(input=>input.addEventListener("change",()=>{remember();obj[input.dataset.num]=Number(input.value)||0;rebuild();renderPanels();}));
  ui.inspectorBody.querySelectorAll("[data-check]").forEach(input=>input.addEventListener("change",()=>{remember();obj[input.dataset.check]=input.checked;renderPanels();}));
  const tags=ui.inspectorBody.querySelector("[data-tags]");if(tags)tags.addEventListener("change",()=>{remember();obj.tags=tags.value.split(",").map(x=>x.trim()).filter(Boolean);renderPanels();});
}

function ruleCard(rule,index,onChange,scope){
  const card=document.createElement("div");card.className="rule-card";
  const eventOptions=RULE_EVENTS.map(x=>`<option value="${x.id}">${x.label}</option>`).join("");
  const conditionOptions=CONDITION_TYPES.map(x=>`<option value="${x.id}">${x.label}</option>`).join("");
  const actionOptions=ACTION_TYPES.map(x=>`<option value="${x.id}">${x.label}</option>`).join("");
  const condition=rule.conditions?.[0]||{type:"always",value:""};const action=rule.actions?.[0]||{type:"message.show",text:"Scenario event",value:""};
  card.innerHTML=`<div class="rule-head"><h4>${escapeHtml(rule.name||`Rule ${index+1}`)}</h4><button class="rule-remove danger">×</button></div><label>Rule name<input data-r="name" value="${escapeAttr(rule.name||"")}"></label><div class="mini-grid"><label>When<select data-r="event">${eventOptions}</select></label><label>Condition<select data-r="condition">${conditionOptions}</select></label></div><label>Condition value<input data-r="conditionValue" value="${escapeAttr(condition.value??condition.owner??condition.tag??"")}"></label><div class="mini-grid"><label>Then<select data-r="action">${actionOptions}</select></label><label>Value<input data-r="actionValue" value="${escapeAttr(action.value??action.text??action.objectId??"")}"></label></div><div class="mini-grid"><label class="check"><input data-r="once" type="checkbox" ${rule.once?"checked":""}> Once</label><label>Cooldown<input data-r="cooldown" type="number" min="0" value="${rule.cooldown||0}"></label></div>`;
  card.querySelector('[data-r="event"]').value=rule.event?.type||"map.start";card.querySelector('[data-r="condition"]').value=condition.type||"always";card.querySelector('[data-r="action"]').value=action.type||"message.show";
  const commit=()=>{
    rule.name=card.querySelector('[data-r="name"]').value;rule.event={...(rule.event||{}),type:card.querySelector('[data-r="event"]').value};
    const ct=card.querySelector('[data-r="condition"]').value,cv=card.querySelector('[data-r="conditionValue"]').value;rule.conditions=ct==="always"?[]:[conditionFromValue(ct,cv)];
    const at=card.querySelector('[data-r="action"]').value,av=card.querySelector('[data-r="actionValue"]').value;rule.actions=[actionFromValue(at,av)];
    rule.once=card.querySelector('[data-r="once"]').checked;rule.cooldown=Number(card.querySelector('[data-r="cooldown"]').value)||0;onChange();
  };
  card.querySelectorAll("input,select").forEach(input=>input.addEventListener("change",commit));card.querySelector(".rule-remove").onclick=()=>onChange("remove",index);return card;
}

function conditionFromValue(type,value){if(type==="owner.is")return{type,owner:value};if(type==="faction.is")return{type,factionId:value};if(type==="tag.present")return{type,tag:value};if(type.startsWith("resource."))return{type,resource:"gold",value:Number(value)||0};if(type.startsWith("age."))return{type,age:Number(value)||0};if(type.startsWith("objective."))return{type,objectiveId:value};if(type.startsWith("object."))return{type,objectId:value};if(type.startsWith("variable."))return{type,key:"value",value};return{type,value};}
function actionFromValue(type,value){if(type==="message.show")return{type,text:value};if(type.startsWith("resource."))return{type,owner:"player",resource:"gold",value:Number(value)||0};if(type.startsWith("variable."))return{type,key:"value",value};if(type.startsWith("object."))return{type,objectId:value,value};if(type.startsWith("objective."))return{type,objectiveId:value};if(type.startsWith("spawn."))return{type,id:value,owner:"player"};if(type==="camera.focus")return{type,objectId:value};if(type==="weather.set")return{type,weather:value};if(type==="diplomacy.set")return{type,relation:value};if(type==="rule.emit")return{type,eventType:value||"manual"};return{type,value};}

function renderRuleList(container,rules,setRules,scope){container.innerHTML="";(rules||[]).forEach((rule,index)=>container.appendChild(ruleCard(rule,index,(op,i)=>{const copy=[...rules];if(op==="remove")copy.splice(i,1);setRules(copy);},scope)));if(!(rules||[]).length)container.innerHTML='<p class="subtle">No rules yet.</p>';}
function renderGlobalRules(){renderRuleList(ui.globalRules,state.map.globalRules||[],rules=>{remember();state.map.globalRules=rules;renderPanels();},"global");}

function renderCampaign(){const c=state.map.campaign;ui.campaignEnabled.checked=Boolean(c.enabled);ui.campaignId.value=c.campaignId||"";ui.chapterId.value=c.chapterId||"";ui.missionId.value=c.missionId||"";ui.missionTitle.value=c.title||"";ui.briefing.value=c.briefing||"";ui.victoryText.value=c.victoryText||"";ui.defeatText.value=c.defeatText||"";ui.startingAge.value=c.startingAge||0;ui.nextMapId.value=c.nextMapId||"";ui.objectiveList.innerHTML="";(c.objectives||[]).forEach((obj,index)=>{const card=document.createElement("div");card.className="objective-card";card.innerHTML=`<div class="rule-head"><h4>${escapeHtml(obj.title||`Objective ${index+1}`)}</h4><button class="rule-remove danger">×</button></div><label>Title<input data-o="title" value="${escapeAttr(obj.title||"")}"></label><label>Description<textarea data-o="description" rows="2">${escapeHtml(obj.description||"")}</textarea></label><div class="mini-grid"><label>Success expression<input data-o="successWhen" value="${escapeAttr(obj.successWhen||"")}"></label><label class="check"><input data-o="required" type="checkbox" ${obj.required!==false?"checked":""}> Required</label></div>`;card.querySelectorAll("input,textarea").forEach(input=>input.addEventListener("change",()=>{remember();obj[input.dataset.o]=input.type==="checkbox"?input.checked:input.value;renderPanels();}));card.querySelector(".rule-remove").onclick=()=>{remember();c.objectives.splice(index,1);renderPanels();};ui.objectiveList.appendChild(card);});}

function syncCampaign(){const c=state.map.campaign;ui.campaignEnabled.checked=Boolean(c.enabled);}
function bindCampaign(){const fields=[[ui.campaignEnabled,"enabled","check"],[ui.campaignId,"campaignId"],[ui.chapterId,"chapterId"],[ui.missionId,"missionId"],[ui.missionTitle,"title"],[ui.briefing,"briefing"],[ui.victoryText,"victoryText"],[ui.defeatText,"defeatText"],[ui.startingAge,"startingAge","num"],[ui.nextMapId,"nextMapId"]];for(const [input,key,kind] of fields)input.addEventListener("change",()=>{remember();state.map.campaign[key]=kind==="check"?input.checked:kind==="num"?Number(input.value)||0:input.value;renderPanels();});ui.addObjectiveBtn.onclick=()=>{remember();const n=state.map.campaign.objectives.length+1;state.map.campaign.objectives.push({id:`objective-${n}`,title:`Objective ${n}`,description:"",required:true,hidden:false,successWhen:"",failureWhen:""});renderPanels();};}

function parseVariables(){const vars={};for(const raw of ui.variablesText.value.split("\n")){const line=raw.trim();if(!line||!line.includes("="))continue;const [key,...rest]=line.split("=");let value=rest.join("=").trim();if(value==="true"||value==="false")value=value==="true";else if(value!==""&&!Number.isNaN(Number(value)))value=Number(value);vars[key.trim()]=value;}return vars;}
function renderValidation(){state.map.variables=parseVariables();const result=validateMapDefinition(state.map);const blocks=[];blocks.push(`<div class="${result.valid?"ok":"err"}">${result.valid?"✓ Schema valid":"✕ Schema errors"}</div>`);result.errors.forEach(x=>blocks.push(`<div class="err">${escapeHtml(x)}</div>`));result.warnings.forEach(x=>blocks.push(`<div class="warn">${escapeHtml(x)}</div>`));let ruleErrors=0;for(const rule of [...state.map.globalRules,...Object.values(COLLECTIONS).flatMap(key=>(state.map[key]||[]).flatMap(o=>o.rules||[]))])if(!validateRule(rule).valid)ruleErrors++;if(ruleErrors)blocks.push(`<div class="err">${ruleErrors} invalid rule(s)</div>`);else blocks.push(`<div class="ok">✓ Rules structurally valid</div>`);ui.validation.innerHTML=blocks.join("");}

function renderPalettes(){const categories=[...new Set(DECORATION_CATALOG.map(x=>x.category))];ui.decorCategory.innerHTML=categories.map(x=>`<option>${x}</option>`).join("");renderDecorPalette(categories[0]);ui.decorCategory.onchange=()=>renderDecorPalette(ui.decorCategory.value);ui.skinPalette.innerHTML="";for(const skin of SURFACE_SKINS){const b=document.createElement("button");b.innerHTML=`<b>${skin.name}</b><small>${skin.id}${skin.hazardous?" · hazard":""}</small>`;b.onclick=()=>{state.surfaceSkin=skin.id;ui.skinPalette.querySelectorAll("button").forEach(x=>x.classList.remove("active"));b.classList.add("active");state.tool="place";syncToolButtons();};if(skin.id===state.surfaceSkin)b.classList.add("active");ui.skinPalette.appendChild(b);}ui.zonePalette.innerHTML="";for(const preset of ZONE_PRESETS){const b=document.createElement("button");b.innerHTML=`<b>${preset.name}</b><small>${preset.id}</small>`;b.onclick=()=>{state.zonePreset=preset.id;ui.zonePalette.querySelectorAll("button").forEach(x=>x.classList.remove("active"));b.classList.add("active");state.tool="place";syncToolButtons();};if(preset.id===state.zonePreset)b.classList.add("active");ui.zonePalette.appendChild(b);}}
function renderDecorPalette(category){ui.decorPalette.innerHTML="";for(const item of DECORATION_CATALOG.filter(x=>x.category===category)){const b=document.createElement("button");b.innerHTML=`<b>${item.name}</b><small>${item.id}</small>`;b.onclick=()=>{state.decorAsset=item.id;ui.decorPalette.querySelectorAll("button").forEach(x=>x.classList.remove("active"));b.classList.add("active");state.tool="place";syncToolButtons();};if(item.id===state.decorAsset)b.classList.add("active");ui.decorPalette.appendChild(b);}}
function setMode(mode){state.mode=mode;for(const b of ui.modeTabs.querySelectorAll("button"))b.classList.toggle("active",b.dataset.mode===mode);ui.decoratePanel.classList.toggle("hidden",mode!=="decorate");ui.surfacePanel.classList.toggle("hidden",mode!=="surface");ui.zonesPanel.classList.toggle("hidden",mode!=="zones");ui.campaignPanel.classList.toggle("hidden",mode!=="campaign");state.tool=mode==="campaign"?"select":state.tool;syncToolButtons();}
function syncToolButtons(){ui.selectTool.classList.toggle("active",state.tool==="select");ui.eraseTool.classList.toggle("active",state.tool==="erase");ui.hint.textContent=state.mode==="campaign"?"Campaign mode edits mission data and rules.":state.tool==="select"?"Drag to move the view; tap an authored object to inspect it.":state.tool==="erase"?"Tap an authored object to remove it.":`Place ${state.mode} content by tapping the world.`;}

function bindUI(){ui.modeTabs.querySelectorAll("button").forEach(b=>b.onclick=()=>setMode(b.dataset.mode));ui.selectTool.onclick=()=>{state.tool="select";syncToolButtons();};ui.eraseTool.onclick=()=>{state.tool="erase";syncToolButtons();};ui.undoBtn.onclick=undo;ui.deleteSelectedBtn.onclick=deleteSelected;ui.addObjectRuleBtn.onclick=()=>{if(!state.selected)return;remember();const rules=state.selected.object.rules||(state.selected.object.rules=[]);rules.push(createRule(rules.length+1));renderPanels();};ui.addGlobalRuleBtn.onclick=()=>{remember();state.map.globalRules.push(createRule(state.map.globalRules.length+1));renderPanels();};ui.variablesText.addEventListener("change",()=>{remember();state.map.variables=parseVariables();renderValidation();});ui.importBtn.onclick=()=>ui.fileInput.click();ui.fileInput.onchange=async()=>{const file=ui.fileInput.files?.[0];if(!file)return;try{remember();state.map=normalizeMapDefinition(JSON.parse(await file.text()));state.selected=null;syncCampaign();rebuild();renderPanels();flash("Map imported into Scenario Studio.");}catch(error){flash(`Import failed: ${error.message}`);}ui.fileInput.value="";};ui.exportBtn.onclick=exportFile;ui.copyBtn.onclick=async()=>{state.map.variables=parseVariables();await navigator.clipboard?.writeText(exportMapJSON(state.map));flash("Scenario JSON copied.");};ui.playBtn.onclick=()=>{if(!isGlobeMap(state.map))return flash("Globe play requires a globe map.");state.map.variables=parseVariables();localStorage.setItem("axm-rts-active-globe-map",exportMapJSON(state.map));location.href="./globe.html";};bindCampaign();}
function exportFile(){state.map.variables=parseVariables();const blob=new Blob([exportMapJSON(state.map)],{type:"application/json"});const url=URL.createObjectURL(blob);const a=document.createElement("a");a.href=url;a.download=`${state.map.id||"scenario"}.axm-map.json`;a.click();setTimeout(()=>URL.revokeObjectURL(url),500);flash("Scenario exported.");}

function bindViewport(){const canvas=renderer.domElement;canvas.addEventListener("pointermove",e=>{const hit=pickWorld(e.clientX,e.clientY);if(hit)ui.coord.textContent=isGlobeMap(state.map)?`lat ${round1(hit.point.lat)}° · lon ${round1(hit.point.lon)}°`:`x ${round1(hit.point[0])} · z ${round1(hit.point[2])}`;if(!state.pointerDown)return;const dx=e.clientX-state.pointerDown.lx,dy=e.clientY-state.pointerDown.ly,total=Math.hypot(e.clientX-state.pointerDown.x,e.clientY-state.pointerDown.y);if(total>5)state.dragging=true;if(state.dragging){if(isGlobeMap(state.map)){state.globeRotation.y+=dx*.007;state.globeRotation.x=THREE.MathUtils.clamp(state.globeRotation.x+dy*.006,-1.35,1.35);}else{const scale=.055/state.flatZoom;state.flatTarget.x-=(dx-dy)*scale;state.flatTarget.z-=(dx+dy)*scale;}}state.pointerDown.lx=e.clientX;state.pointerDown.ly=e.clientY;});canvas.addEventListener("pointerdown",e=>{canvas.setPointerCapture?.(e.pointerId);state.pointerDown={id:e.pointerId,x:e.clientX,y:e.clientY,lx:e.clientX,ly:e.clientY};state.dragging=false;});canvas.addEventListener("pointerup",e=>{if(!state.pointerDown)return;if(!state.dragging&&state.mode!=="campaign")place(pickWorld(e.clientX,e.clientY));state.pointerDown=null;state.dragging=false;});canvas.addEventListener("wheel",e=>{e.preventDefault();if(isGlobeMap(state.map))globeCamera.position.z=THREE.MathUtils.clamp(globeCamera.position.z*(e.deltaY>0?1.08:.92),34,130);else{state.flatZoom=THREE.MathUtils.clamp(state.flatZoom*(e.deltaY>0?.9:1.1),.55,2.3);flatCamera.zoom=state.flatZoom;flatCamera.updateProjectionMatrix();}},{passive:false});}

function resize(){const w=Math.max(1,ui.viewport.clientWidth),h=Math.max(1,ui.viewport.clientHeight),aspect=w/h;renderer.setSize(w,h,false);const view=25;flatCamera.left=-view*aspect;flatCamera.right=view*aspect;flatCamera.top=view;flatCamera.bottom=-view;flatCamera.updateProjectionMatrix();globeCamera.aspect=aspect;globeCamera.updateProjectionMatrix();}
function updateCamera(){if(isGlobeMap(state.map)){globeRoot.rotation.x+=(state.globeRotation.x-globeRoot.rotation.x)*.12;globeRoot.rotation.y+=(state.globeRotation.y-globeRoot.rotation.y)*.12;globeCamera.lookAt(0,0,0);}else{flatCamera.position.copy(state.flatTarget).add(new THREE.Vector3(38,48,40));flatCamera.lookAt(state.flatTarget);}}
function animate(time,dt){for(const record of state.markers){record.marker.traverse(obj=>{if(obj.userData.spin)obj.rotation.y+=obj.userData.spin*dt;if(obj.userData.pulse)obj.scale.setScalar(1+Math.sin(time*5)*.08);});const target=state.selected?.object===record.object?1.2:1;record.marker.scale.lerp(new THREE.Vector3(target,target,target),.15);}}
function flash(text){ui.hint.textContent=text;clearTimeout(flash.t);flash.t=setTimeout(syncToolButtons,1800);}

renderPalettes();bindUI();bindViewport();syncCampaign();rebuild();renderPanels();setMode("decorate");window.addEventListener("resize",resize);
let last=performance.now()/1000;function frame(ms){const now=ms/1000,dt=Math.min(.05,Math.max(0,now-last));last=now;updateCamera();animate(now,dt);renderer.render(scene,currentCamera());requestAnimationFrame(frame);}requestAnimationFrame(frame);
