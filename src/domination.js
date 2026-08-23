import * as THREE from "three";
import { FACTIONS } from "./factions.js";
import { geoToCartesian } from "./mapSchema.js";
import {
  DOMINATION_STORAGE_KEY,
  createDominationMatch,
  loadDominationMatch,
  saveDominationMatch,
  catchUpDomination,
  tickDomination,
  assignReserveToTerritory,
  availableNeighborTargets,
  dominationGarrisonCount,
  territoryEconomySnapshot
} from "./dominationState.js";
import {
  DOMINATION_TERRITORIES,
  TEAM_VISUALS,
  territoryDefinition
} from "./dominationWorld.js";
import {
  startTerritoryContest,
  makeContestBattlePackage
} from "./dominationContest.js";
import {
  mapSlotForTerritory,
  attachMapToTerritory
} from "./dominationMapSlots.js";
import { registerMapInAtlas } from "./atlasContentBridge.js";

const $ = id => document.getElementById(id);
const ui = {
  setup: $("setup"), teamSize: $("teamSize"), create: $("createBtn"), continue: $("continueBtn"), newMatch: $("newMatchBtn"),
  left: $("leftHud"), right: $("rightHud"), bottom: $("bottomPanel"), perspective: $("perspective"), teamName: $("teamName"),
  territoryScore: $("territoryScore"), reserveCount: $("reserveCount"), contestCount: $("contestCount"), globalResources: $("globalResources"),
  seatList: $("seatList"), reserveList: $("reserveList"), noSelection: $("noSelection"), detail: $("territoryDetail"),
  territoryName: $("territoryName"), territoryStatus: $("territoryStatus"), ownerBadge: $("ownerBadge"), mapStatus: $("mapStatus"),
  cityList: $("cityList"), localResources: $("localResources"), productionInfo: $("productionInfo"), garrisonList: $("garrisonList"),
  neighborList: $("neighborList"), contestBtn: $("contestBtn"), assignReserve: $("assignReserveBtn"), clockText: $("clockText"),
  contestStrip: $("contestStrip"), save: $("saveBtn"), contestPanel: $("contestPanel"), contestTitle: $("contestTitle"),
  contestText: $("contestText"), expeditionForces: $("expeditionForces"), cancelContest: $("cancelContestBtn"), confirmContest: $("confirmContestBtn"),
  livePanel: $("liveContestPanel"), liveTitle: $("liveContestTitle"), liveText: $("liveContestText"), liveSummary: $("liveBattleSummary"),
  closeLive: $("closeLiveContestBtn"), copyBattle: $("copyBattleBtn"), openBattleLink: $("openBattleLink"), toast: $("toast")
};

const RESOURCE_ICONS = { food: "◆", wood: "♣", stone: "⬢", gold: "●" };
const RADIUS = 29;
let match = null;
let perspective = "azure";
let selectedTerritoryId = null;
let staged = null;
let liveContestId = null;
let simulationClock = 0;
let saveClock = 0;

const scene = new THREE.Scene();
scene.background = new THREE.Color(0x03070d);
scene.fog = new THREE.FogExp2(0x03070d, .0032);
const renderer = new THREE.WebGLRenderer({ antialias: true, powerPreference: "high-performance" });
renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 1.7));
renderer.shadowMap.enabled = true;
renderer.outputColorSpace = THREE.SRGBColorSpace;
$("viewport").appendChild(renderer.domElement);

const camera = new THREE.PerspectiveCamera(42, 1, .1, 500);
camera.position.set(0, 6, 82);
const root = new THREE.Group();
const nodeGroup = new THREE.Group();
const cityGroup = new THREE.Group();
root.add(nodeGroup, cityGroup);
scene.add(root);

const raycaster = new THREE.Raycaster();
const pointer = new THREE.Vector2();
const markers = new Map();
const cityMarkers = [];
let pointerDown = null;
let dragging = false;
const rotationTarget = { x: -.18, y: .36 };

scene.add(new THREE.HemisphereLight(0xcdefff, 0x172219, 1.9));
const sun = new THREE.DirectionalLight(0xffefce, 3.2);
sun.position.set(-40, 50, 35);
sun.castShadow = true;
scene.add(sun);
const rim = new THREE.DirectionalLight(0x5aa6e2, 1.1);
rim.position.set(40, -10, -35);
scene.add(rim);

const mapFile = document.createElement("input");
mapFile.type = "file";
mapFile.accept = "application/json,.json";
mapFile.hidden = true;
document.body.appendChild(mapFile);

function esc(value) {
  return String(value ?? "").replace(/[&<>"]/g, char => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;" }[char]));
}

function toast(message) {
  ui.toast.textContent = message;
  ui.toast.classList.remove("hidden");
  clearTimeout(toast.timer);
  toast.timer = setTimeout(() => ui.toast.classList.add("hidden"), 2200);
}

function currentTeam() {
  return match?.teams?.[perspective];
}

function territoryState(id) {
  return match?.territories?.[id] || null;
}

function visualFor(owner) {
  return TEAM_VISUALS[owner || "neutral"] || TEAM_VISUALS.neutral;
}

function buildPlanet() {
  const surface = new THREE.Mesh(
    new THREE.IcosahedronGeometry(RADIUS, 5),
    new THREE.MeshStandardMaterial({ color: 0x355846, roughness: .94, metalness: .02, flatShading: true })
  );
  surface.castShadow = true;
  surface.receiveShadow = true;
  root.add(surface);

  root.add(new THREE.Mesh(
    new THREE.SphereGeometry(RADIUS * .994, 72, 36),
    new THREE.MeshStandardMaterial({ color: 0x123c55, roughness: .4, metalness: .05, transparent: true, opacity: .82 })
  ));
  root.add(new THREE.Mesh(
    new THREE.SphereGeometry(RADIUS * 1.045, 48, 24),
    new THREE.MeshBasicMaterial({ color: 0x6fc8ff, transparent: true, opacity: .075, side: THREE.BackSide, depthWrite: false })
  ));

  const seen = new Set();
  for (const territory of DOMINATION_TERRITORIES) {
    for (const neighborId of territory.neighbors) {
      const key = [territory.id, neighborId].sort().join("|");
      if (seen.has(key)) continue;
      seen.add(key);
      const neighbor = territoryDefinition(neighborId);
      if (!neighbor) continue;
      const a = geoToCartesian(territory.geo, RADIUS * 1.012);
      const b = geoToCartesian(neighbor.geo, RADIUS * 1.012);
      const mid = a.clone().add(b).normalize().multiplyScalar(RADIUS * 1.055);
      const curve = new THREE.QuadraticBezierCurve3(a, mid, b);
      root.add(new THREE.Line(
        new THREE.BufferGeometry().setFromPoints(curve.getPoints(22)),
        new THREE.LineBasicMaterial({ color: 0x7895a7, transparent: true, opacity: .20 })
      ));
    }
  }

  for (const territory of DOMINATION_TERRITORIES) {
    const group = new THREE.Group();
    const orb = new THREE.Mesh(
      new THREE.SphereGeometry(.58, 10, 7),
      new THREE.MeshStandardMaterial({ color: TEAM_VISUALS.neutral.color, roughness: .5, metalness: .16 })
    );
    const ring = new THREE.Mesh(
      new THREE.TorusGeometry(.92, .065, 6, 26),
      new THREE.MeshBasicMaterial({ color: TEAM_VISUALS.neutral.color, transparent: true, opacity: .72, depthWrite: false })
    );
    ring.rotation.x = Math.PI / 2;
    group.userData.territoryId = territory.id;
    orb.userData.territoryId = territory.id;
    ring.userData.territoryId = territory.id;
    group.add(orb, ring);
    const p = geoToCartesian(territory.geo, RADIUS + .25);
    group.position.copy(p);
    group.quaternion.setFromUnitVectors(new THREE.Vector3(0, 1, 0), p.clone().normalize());
    nodeGroup.add(group);
    markers.set(territory.id, { group, orb, ring });

    for (const city of territory.cities) {
      const geo = { lat: territory.geo.lat + city.offset.lat, lon: territory.geo.lon + city.offset.lon, elevation: 0 };
      const mesh = new THREE.Mesh(
        new THREE.OctahedronGeometry(.20),
        new THREE.MeshStandardMaterial({ color: TEAM_VISUALS.neutral.color, roughness: .55, metalness: .12 })
      );
      const cp = geoToCartesian(geo, RADIUS + .18);
      mesh.position.copy(cp);
      mesh.quaternion.setFromUnitVectors(new THREE.Vector3(0, 1, 0), cp.clone().normalize());
      mesh.userData = { territoryId: territory.id, cityId: city.id };
      cityGroup.add(mesh);
      cityMarkers.push(mesh);
    }
  }
}

function refreshGlobe() {
  if (!match) return;
  for (const [id, record] of markers) {
    const state = territoryState(id);
    const color = new THREE.Color(visualFor(state?.owner).color);
    record.orb.material.color.copy(color);
    record.ring.material.color.copy(color);
    const selected = id === selectedTerritoryId;
    record.group.scale.setScalar(selected ? 1.38 : 1);
    record.ring.material.opacity = state?.lockedByContestId ? 1 : (selected ? .95 : .68);
  }
  for (const marker of cityMarkers) {
    const city = territoryState(marker.userData.territoryId)?.cities.find(item => item.id === marker.userData.cityId);
    marker.material.color.set(visualFor(city?.owner === "neutral" ? null : city?.owner).color);
  }
}

function renderResources(container, resources = {}) {
  container.innerHTML = ["food", "wood", "stone", "gold"]
    .map(key => `<div><span>${RESOURCE_ICONS[key]} ${key}</span><b>${Math.floor(Number(resources[key] || 0))}</b></div>`)
    .join("");
}

function formatSigned(value) {
  const number = Number(value || 0);
  return `${number >= 0 ? "+" : ""}${number.toFixed(1)}`;
}

function renderTeam() {
  if (!match) return;
  const team = currentTeam();
  const visual = visualFor(perspective);
  ui.teamName.textContent = team.name;
  ui.teamName.style.color = visual.color;
  ui.territoryScore.textContent = team.score;
  ui.reserveCount.textContent = team.expeditionReserve.length;
  ui.contestCount.textContent = match.activeContests.filter(contest => contest.attacker.teamId === perspective || contest.defender.teamId === perspective).length;
  renderResources(ui.globalResources, team.globalResources);

  ui.seatList.innerHTML = team.seats.map(seat => {
    const faction = FACTIONS[seat.factionId];
    return `<div class="seat"><b>${esc(seat.displayName)}</b><span>${esc(seat.controller)} • ${faction ? `${faction.symbol} ${faction.name}` : "No faction"}</span></div>`;
  }).join("");

  ui.reserveList.innerHTML = team.expeditionReserve.length
    ? team.expeditionReserve.map(reserve => {
        const faction = FACTIONS[reserve.factionId];
        const unit = faction?.units.find(item => item.id === reserve.unitId);
        return `<div class="reserve"><b>${esc(unit?.name || reserve.unitId)} ×${reserve.count}</b><span>${esc(faction?.name || reserve.factionId)} • produced from ${esc(territoryDefinition(reserve.sourceTerritoryId)?.name || "territory")} • assign before use</span></div>`;
      }).join("")
    : `<div class="reserve"><span>No reserve formations. Every 4 economically funded local productions creates one.</span></div>`;
}

function renderMapSlot(definition) {
  const slot = mapSlotForTerritory(definition.id);
  ui.mapStatus.innerHTML = slot
    ? `<b>Battle map:</b> ${esc(slot.name || slot.id)} • ${esc(slot.projection || "flat")}<br><span>${slot.source === "custom" ? "Custom territory map attached." : "Built-in map slot."}</span><br><button id="attachMapInline" style="margin-top:7px">Replace map</button>`
    : `<b>Battle map slot open.</b> Strategic territory, cities and economy already work. Attach a finished map whenever one exists.<br><button id="attachMapInline" style="margin-top:7px">Attach map JSON</button>`;
  $("attachMapInline")?.addEventListener("click", () => mapFile.click());
}

function renderTerritory() {
  const state = territoryState(selectedTerritoryId);
  const definition = territoryDefinition(selectedTerritoryId);
  if (!state || !definition) {
    ui.noSelection.classList.remove("hidden");
    ui.detail.classList.add("hidden");
    return;
  }

  ui.noSelection.classList.add("hidden");
  ui.detail.classList.remove("hidden");
  ui.territoryName.textContent = definition.name;
  const owner = state.owner || "neutral";
  const ownerVisual = visualFor(owner);
  ui.ownerBadge.textContent = ownerVisual.name;
  ui.ownerBadge.style.color = ownerVisual.color;
  ui.ownerBadge.style.borderColor = ownerVisual.color;
  ui.territoryStatus.textContent = state.lockedByContestId ? "Committed to a live territory contest" : state.owner ? `Controlled by ${ownerVisual.name}` : "Neutral territory";
  renderMapSlot(definition);

  ui.cityList.innerHTML = state.cities.map(city => `<div class="city"><b>${esc(city.name)}</b><span>${esc(city.owner === "neutral" ? "Neutral" : visualFor(city.owner).name)} • production ×${Number(city.productionMultiplier || 1).toFixed(2)}</span></div>`).join("");
  renderResources(ui.localResources, state.localResources);

  const economy = territoryEconomySnapshot(match, state.id);
  const unit = economy?.productionUnit;
  const cost = unit?.cost || {};
  const net = economy?.finance?.projectedNetPerMinute || {};
  ui.productionInfo.innerHTML = `
    <div><span>Garrison</span><b>${dominationGarrisonCount(state)} / ${definition.garrisonLimit}</b></div>
    <div><span>Production cycle</span><b>${definition.unitProductionSeconds}s</b></div>
    <div><span>Auto-producing</span><b>${esc(unit?.name || "Nothing")}</b></div>
    <div><span>Unit cost</span><b>${["food", "wood", "stone", "gold"].filter(key => cost[key] > 0).map(key => `${RESOURCE_ICONS[key]}${cost[key]}`).join(" ") || "—"}</b></div>
    <div style="grid-column:1/-1"><span>Projected map net / min after production</span><b>${["food", "wood", "stone", "gold"].map(key => `${RESOURCE_ICONS[key]} ${formatSigned(net[key])}`).join(" • ")}</b></div>
    <div><span>Produced</span><b>${economy?.finance?.formationsProduced || 0}</b></div>
    <div><span>Blocked by economy</span><b>${economy?.finance?.blockedProductionCycles || 0}</b></div>`;

  ui.garrisonList.innerHTML = state.garrison.length
    ? state.garrison.map(force => {
        const faction = FACTIONS[force.factionId];
        const unitDef = faction?.units.find(item => item.id === force.unitId);
        return `<div class="garrison"><b>${esc(unitDef?.name || force.unitId)} ×${force.count}</b><span>${esc(faction?.name || force.factionId)} • physically stored here</span></div>`;
      }).join("")
    : `<div class="garrison"><span>No local formations.</span></div>`;

  ui.neighborList.innerHTML = definition.neighbors.map(id => {
    const neighborDef = territoryDefinition(id);
    const neighborState = territoryState(id);
    const visual = visualFor(neighborState?.owner);
    return `<div class="neighbor" data-territory="${id}"><b>${esc(neighborDef?.name || id)}</b><span style="color:${visual.color}">${esc(visual.name)} • ${dominationGarrisonCount(neighborState)} formations</span></div>`;
  }).join("");
  ui.neighborList.querySelectorAll("[data-territory]").forEach(node => node.addEventListener("click", () => selectTerritory(node.dataset.territory)));

  const friendly = state.owner === perspective;
  const sources = friendly ? [] : DOMINATION_TERRITORIES
    .filter(item => item.neighbors.includes(definition.id))
    .map(item => territoryState(item.id))
    .filter(item => item?.owner === perspective && !item.lockedByContestId && dominationGarrisonCount(item) > 0);

  ui.contestBtn.disabled = Boolean(state.lockedByContestId) || (friendly ? availableNeighborTargets(match, state.id, perspective).length === 0 : sources.length === 0);
  ui.contestBtn.textContent = friendly ? "Attack neighboring territory" : sources.length ? `Attack from ${territoryDefinition(sources[0].id)?.name}` : "No friendly border can reach this";
  ui.contestBtn.onclick = () => openContestStage(friendly ? state.id : sources[0]?.id, friendly ? null : state.id);
  ui.assignReserve.disabled = !friendly || Boolean(state.lockedByContestId) || !currentTeam().expeditionReserve.length;
  ui.assignReserve.onclick = () => assignFirstReserve(state.id);
}

function assignFirstReserve(territoryId) {
  const reserve = currentTeam().expeditionReserve[0];
  if (!reserve) return;
  if (assignReserveToTerritory(match, perspective, reserve.id, territoryId)) {
    saveDominationMatch(match);
    renderAll();
    toast("Reserve assigned. It now physically belongs to this territory.");
  }
}

function renderContests() {
  ui.contestStrip.innerHTML = match.activeContests.length
    ? match.activeContests.map(contest => `<div class="contest-chip" data-contest="${esc(contest.id)}">${esc(territoryDefinition(contest.sourceId)?.name)} → ${esc(territoryDefinition(contest.targetId)?.name)} • ${esc(contest.status)}</div>`).join("")
    : `<div class="contest-chip">No live territory contests</div>`;
  ui.contestStrip.querySelectorAll("[data-contest]").forEach(chip => chip.addEventListener("click", () => openLiveContest(chip.dataset.contest)));
}

function renderClock() {
  const claimed = Object.values(match.territories).filter(territory => territory.owner).length;
  ui.clockText.textContent = `Real-time economies active • ${claimed}/${DOMINATION_TERRITORIES.length} territories claimed • saved ${new Date(match.updatedAt).toLocaleTimeString()}`;
}

function renderAll() {
  if (!match) return;
  renderTeam();
  renderTerritory();
  renderContests();
  renderClock();
  refreshGlobe();
}

function selectTerritory(id) {
  selectedTerritoryId = id;
  renderTerritory();
  refreshGlobe();
  focusTerritory(id);
}

function focusTerritory(id) {
  const definition = territoryDefinition(id);
  if (!definition) return;
  const normal = geoToCartesian(definition.geo, 1).normalize();
  const quaternion = new THREE.Quaternion().setFromUnitVectors(normal, new THREE.Vector3(0, 0, 1));
  const euler = new THREE.Euler().setFromQuaternion(quaternion, "XYZ");
  rotationTarget.x = euler.x;
  rotationTarget.y = euler.y;
}

function openContestStage(sourceId, targetId = null) {
  const source = territoryState(sourceId);
  if (!source) return;
  const targets = targetId ? [territoryState(targetId)] : availableNeighborTargets(match, sourceId, perspective);
  if (!targets.length) return toast("No neighboring territory is available.");
  staged = {
    sourceId,
    targetId: targetId || targets[0].id,
    selection: source.garrison.map(force => ({ id: force.id, count: Math.max(1, Math.floor(force.count * .65)) }))
  };
  renderContestStage(targets);
  ui.contestPanel.classList.remove("hidden");
}

function renderContestStage(targets) {
  const sourceDef = territoryDefinition(staged.sourceId);
  const targetDef = territoryDefinition(staged.targetId);
  ui.contestTitle.textContent = `${sourceDef.name} → ${targetDef.name}`;
  ui.contestText.innerHTML = `Only formations physically stored in <b>${esc(sourceDef.name)}</b> can leave. Every other owned map continues its economy in real time.`;
  const targetButtons = targets.length > 1
    ? `<div class="rule-strip">${targets.map(target => `<button data-target="${target.id}">${esc(territoryDefinition(target.id)?.name)}</button>`).join("")}</div>`
    : "";
  ui.expeditionForces.innerHTML = targetButtons + territoryState(staged.sourceId).garrison.map(force => {
    const faction = FACTIONS[force.factionId];
    const unit = faction?.units.find(item => item.id === force.unitId);
    const chosen = staged.selection.find(item => item.id === force.id)?.count || 0;
    return `<div class="force-row"><div><b>${esc(unit?.name || force.unitId)}</b><span>${esc(faction?.name || force.factionId)} • ${force.count} available</span></div><input data-force="${esc(force.id)}" type="number" min="0" max="${force.count}" value="${chosen}"></div>`;
  }).join("");

  ui.expeditionForces.querySelectorAll("[data-target]").forEach(button => button.addEventListener("click", () => {
    staged.targetId = button.dataset.target;
    renderContestStage(targets);
  }));
  ui.expeditionForces.querySelectorAll("[data-force]").forEach(input => input.addEventListener("change", () => {
    const item = staged.selection.find(row => row.id === input.dataset.force);
    if (item) item.count = Math.max(0, Number(input.value) || 0);
  }));
}

function commitContest() {
  const result = startTerritoryContest(match, {
    sourceId: staged.sourceId,
    targetId: staged.targetId,
    teamId: perspective,
    selection: staged.selection
  });
  if (!result.ok) return toast(result.error);
  ui.contestPanel.classList.add("hidden");
  staged = null;
  saveDominationMatch(match);
  renderAll();
  openLiveContest(result.contest.id);
}

function refreshContestMap(contest) {
  const slot = mapSlotForTerritory(contest.targetId);
  if (slot) {
    contest.battle.mapRef = slot;
    contest.status = "ready";
  }
}

function openLiveContest(id) {
  const contest = match.activeContests.find(item => item.id === id);
  if (!contest) return;
  refreshContestMap(contest);
  liveContestId = id;
  const source = territoryDefinition(contest.sourceId);
  const target = territoryDefinition(contest.targetId);
  const packet = makeContestBattlePackage(match, id);
  localStorage.setItem("axm.manyRaceRts.pendingDominationBattle", JSON.stringify(packet));
  ui.liveTitle.textContent = `${source?.name} → ${target?.name}`;
  ui.liveText.textContent = contest.status === "ready"
    ? "A territory map is attached. The expedition packet is ready for the battle-runtime adapter."
    : "This strategic contest is staged, but the target has no battle map attached yet. Attach one later without rebuilding the world layer.";
  ui.liveSummary.innerHTML = `
    <div><b>Expedition:</b> ${contest.attacker.forces.reduce((sum, force) => sum + force.count, 0)} formations from ${esc(source?.name)}</div>
    <div><b>Defenders:</b> ${contest.defender.forces.reduce((sum, force) => sum + force.count, 0)} formations</div>
    <div><b>Cities:</b> ${contest.cities.length} territory objectives</div>
    <div><b>Map:</b> ${esc(packet?.map?.name || packet?.map?.id || "awaiting map")}</div>`;
  ui.openBattleLink.classList.toggle("hidden", contest.status !== "ready");
  ui.livePanel.classList.remove("hidden");
  saveDominationMatch(match);
}

async function copyBattlePacket() {
  const packet = makeContestBattlePackage(match, liveContestId);
  if (!packet) return;
  await navigator.clipboard?.writeText(JSON.stringify(packet, null, 2));
  toast("Territory battle package copied.");
}

function startWorld(size) {
  match = createDominationMatch(size);
  catchUpDomination(match);
  saveDominationMatch(match);
  perspective = "azure";
  ui.perspective.value = perspective;
  selectedTerritoryId = DOMINATION_TERRITORIES[0].id;
  enterWorld();
}

function continueWorld() {
  match = loadDominationMatch();
  catchUpDomination(match);
  saveDominationMatch(match);
  selectedTerritoryId = Object.values(match.territories).find(territory => territory.owner === perspective)?.id || DOMINATION_TERRITORIES[0].id;
  enterWorld();
}

function enterWorld() {
  ui.setup.classList.add("hidden");
  ui.left.classList.remove("hidden");
  ui.right.classList.remove("hidden");
  ui.bottom.classList.remove("hidden");
  renderAll();
  focusTerritory(selectedTerritoryId);
}

function pickTerritory(clientX, clientY) {
  const rect = renderer.domElement.getBoundingClientRect();
  pointer.x = ((clientX - rect.left) / rect.width) * 2 - 1;
  pointer.y = -((clientY - rect.top) / rect.height) * 2 + 1;
  raycaster.setFromCamera(pointer, camera);
  const hits = raycaster.intersectObjects(nodeGroup.children, true);
  for (const hit of hits) {
    let object = hit.object;
    while (object && object !== nodeGroup) {
      if (object.userData?.territoryId) return object.userData.territoryId;
      object = object.parent;
    }
  }
  return null;
}

function bindViewport() {
  const canvas = renderer.domElement;
  canvas.addEventListener("pointerdown", event => {
    pointerDown = { id: event.pointerId, x: event.clientX, y: event.clientY, lastX: event.clientX, lastY: event.clientY };
    dragging = false;
  });
  canvas.addEventListener("pointermove", event => {
    if (!pointerDown) return;
    const dx = event.clientX - pointerDown.lastX;
    const dy = event.clientY - pointerDown.lastY;
    if (Math.hypot(event.clientX - pointerDown.x, event.clientY - pointerDown.y) > 5) dragging = true;
    if (dragging) {
      rotationTarget.y += dx * .007;
      rotationTarget.x = THREE.MathUtils.clamp(rotationTarget.x + dy * .006, -1.45, 1.45);
    }
    pointerDown.lastX = event.clientX;
    pointerDown.lastY = event.clientY;
  });
  canvas.addEventListener("pointerup", event => {
    if (pointerDown && !dragging) {
      const id = pickTerritory(event.clientX, event.clientY);
      if (id) selectTerritory(id);
    }
    pointerDown = null;
    dragging = false;
  });
  canvas.addEventListener("wheel", event => {
    event.preventDefault();
    camera.position.z = THREE.MathUtils.clamp(camera.position.z * (event.deltaY > 0 ? 1.08 : .92), 48, 145);
  }, { passive: false });
}

function resize() {
  const width = Math.max(1, window.innerWidth);
  const height = Math.max(1, window.innerHeight);
  renderer.setSize(width, height, false);
  camera.aspect = width / height;
  camera.updateProjectionMatrix();
}

ui.create.addEventListener("click", () => startWorld(Number(ui.teamSize.value) || 1));
ui.continue.addEventListener("click", continueWorld);
ui.continue.disabled = !localStorage.getItem(DOMINATION_STORAGE_KEY);
ui.newMatch.addEventListener("click", () => {
  ui.setup.classList.remove("hidden");
  ui.left.classList.add("hidden");
  ui.right.classList.add("hidden");
  ui.bottom.classList.add("hidden");
});
ui.perspective.addEventListener("change", () => {
  perspective = ui.perspective.value;
  selectedTerritoryId = Object.values(match.territories).find(territory => territory.owner === perspective)?.id || selectedTerritoryId;
  renderAll();
  focusTerritory(selectedTerritoryId);
});
ui.save.addEventListener("click", () => {
  saveDominationMatch(match);
  toast("World saved.");
});
ui.cancelContest.addEventListener("click", () => {
  ui.contestPanel.classList.add("hidden");
  staged = null;
});
ui.confirmContest.addEventListener("click", commitContest);
ui.closeLive.addEventListener("click", () => ui.livePanel.classList.add("hidden"));
ui.copyBattle.addEventListener("click", copyBattlePacket);

mapFile.addEventListener("change", async () => {
  const file = mapFile.files?.[0];
  if (!file || !selectedTerritoryId) return;
  try {
    const map = JSON.parse(await file.text());
    const slot = attachMapToTerritory(selectedTerritoryId, map);
    registerMapInAtlas(slot.embedded);
    for (const contest of match?.activeContests || []) {
      if (contest.targetId === selectedTerritoryId) refreshContestMap(contest);
    }
    saveDominationMatch(match);
    renderTerritory();
    renderContests();
    toast(`Map attached to ${territoryDefinition(selectedTerritoryId)?.name}.`);
  } catch (error) {
    toast(`Map attach failed: ${error.message}`);
  }
  mapFile.value = "";
});

buildPlanet();
bindViewport();
resize();
window.addEventListener("resize", resize);

let previous = performance.now() / 1000;
function frame(ms) {
  const now = ms / 1000;
  const dt = Math.min(.1, Math.max(0, now - previous));
  previous = now;
  root.rotation.x += (rotationTarget.x - root.rotation.x) * .11;
  root.rotation.y += (rotationTarget.y - root.rotation.y) * .11;
  camera.lookAt(0, 0, 0);

  if (match) {
    simulationClock += dt;
    saveClock += dt;
    if (simulationClock >= 1) {
      tickDomination(match, simulationClock);
      simulationClock = 0;
      renderAll();
    }
    if (saveClock >= 5) {
      saveClock = 0;
      saveDominationMatch(match);
    }
  }

  renderer.render(scene, camera);
  requestAnimationFrame(frame);
}
requestAnimationFrame(frame);
