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
import { DOMINATION_TERRITORIES, TEAM_VISUALS, territoryDefinition } from "./dominationWorld.js";
import { startTerritoryContest, makeContestBattlePackage } from "./dominationContest.js";
import { mapSlotForTerritory, attachMapToTerritory } from "./dominationMapSlots.js";
import { registerMapInAtlas } from "./atlasContentBridge.js";

const $ = id => document.getElementById(id);
const ui = {
  setup:$("setup"),teamSize:$("teamSize"),create:$("createBtn"),continue:$("continueBtn"),newMatch:$("newMatchBtn"),
  left:$("leftHud"),right:$("rightHud"),bottom:$("bottomPanel"),perspective:$("perspective"),teamName:$("teamName"),territoryScore:$("territoryScore"),reserveCount:$("reserveCount"),contestCount:$("contestCount"),globalResources:$("globalResources"),seatList:$("seatList"),reserveList:$("reserveList"),
  noSelection:$("noSelection"),detail:$("territoryDetail"),territoryName:$("territoryName"),territoryStatus:$("territoryStatus"),ownerBadge:$("ownerBadge"),mapStatus:$("mapStatus"),cityList:$("cityList"),localResources:$("localResources"),productionInfo:$("productionInfo"),garrisonList:$("garrisonList"),neighborList:$("neighborList"),contestBtn:$("contestBtn"),assignReserve:$("assignReserveBtn"),
  clockText:$("clockText"),contestStrip:$("contestStrip"),save:$("saveBtn"),contestPanel:$("contestPanel"),contestTitle:$("contestTitle"),contestText:$("contestText"),expeditionForces:$("expeditionForces"),cancelContest:$("cancelContestBtn"),confirmContest:$("confirmContestBtn"),
  livePanel:$("liveContestPanel"),liveTitle:$("liveContestTitle"),liveText:$("liveContestText"),liveSummary:$("liveBattleSummary"),closeLive:$("closeLiveContestBtn"),copyBattle:$("copyBattleBtn"),openBattleLink:$("openBattleLink"),toast:$("toast")
};

const RESOURCE_ICONS = {food:"◆",wood:"♣",stone:"⬢",gold:"●"};
const RADIUS = 29;
let match = null;
let perspective = "azure";
let selectedTerritoryId = null;
let staged = null;
let liveContestId = null;
let saveClock = 0;
let simulationClock = 0;

const scene = new THREE.Scene();
scene.background = new THREE.Color(0x03070d);
scene.fog = new THREE.FogExp2(0x03070d,.0032);
const renderer = new THREE.WebGLRenderer({antialias:true,powerPreference:"high-performance"});
renderer.setPixelRatio(Math.min(devicePixelRatio||1,1.7));
renderer.shadowMap.enabled = true;
renderer.outputColorSpace = THREE.SRGBColorSpace;
$("viewport").appendChild(renderer.domElement);
const camera = new THREE.PerspectiveCamera(42,1,.1,500);
camera.position.set(0,6,82);
const root = new THREE.Group();
const nodeGroup = new THREE.Group();
const cityGroup = new THREE.Group();
root.add(nodeGroup,cityGroup);
scene.add(root);
const raycaster = new THREE.Raycaster();
const pointer = new THREE.Vector2();
const markers = new Map();
const cityMarkers = [];
let surface = null;
let pointerDown = null;
let dragging = false;
const rotationTarget = {x:-.18,y:.36};

scene.add(new THREE.HemisphereLight(0xcdefff,0x172219,1.9));
const sun = new THREE.DirectionalLight(0xffefce,3.2);sun.position.set(-40,50,35);sun.castShadow=true;scene.add(sun);
const rim = new THREE.DirectionalLight(0x5aa6e2,1.1);rim.position.set(40,-10,-35);scene.add(rim);

const mapFile = document.createElement("input");
mapFile.type = "file";
mapFile.accept = "application/json,.json";
mapFile.hidden = true;
document.body.appendChild(mapFile);

function esc(value){return String(value??"").replace(/[&<>"]/g,c=>({"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;"}[c]));}
function toast(message){ui.toast.textContent=message;ui.toast.classList.remove("hidden");clearTimeout(toast.timer);toast.timer=setTimeout(()=>ui.toast.classList.add("hidden"),2200);}
function team(){return match?.teams?.[perspective];}
function stateFor(id){return match?.territories?.[id]||null;}
function visualFor(owner){return TEAM_VISUALS[owner||"neutral"]||TEAM_VISUALS.neutral;}
function colorFor(owner){return new THREE.Color(visualFor(owner).color);}

function buildPlanet(){
  surface = new THREE.Mesh(new THREE.IcosahedronGeometry(RADIUS,5),new THREE.MeshStandardMaterial({color:0x355846,roughness:.94,metalness:.02,flatShading:true}));
  surface.castShadow=true;surface.receiveShadow=true;root.add(surface);
  root.add(new THREE.Mesh(new THREE.SphereGeometry(RADIUS*.994,72,36),new THREE.MeshStandardMaterial({color:0x123c55,roughness:.4,metalness:.05,transparent:true,opacity:.82})));
  root.add(new THREE.Mesh(new THREE.SphereGeometry(RADIUS*1.045,48,24),new THREE.MeshBasicMaterial({color:0x6fc8ff,transparent:true,opacity:.075,side:THREE.BackSide,depthWrite:false})));
  const seen=new Set();
  for(const territory of DOMINATION_TERRITORIES){
    for(const neighborId of territory.neighbors){
      const key=[territory.id,neighborId].sort().join("|");if(seen.has(key))continue;seen.add(key);
      const neighbor=territoryDefinition(neighborId);if(!neighbor)continue;
      const a=geoToCartesian(territory.geo,RADIUS*1.012),b=geoToCartesian(neighbor.geo,RADIUS*1.012),mid=a.clone().add(b).normalize().multiplyScalar(RADIUS*1.055);
      const curve=new THREE.QuadraticBezierCurve3(a,mid,b);
      root.add(new THREE.Line(new THREE.BufferGeometry().setFromPoints(curve.getPoints(22)),new THREE.LineBasicMaterial({color:0x7895a7,transparent:true,opacity:.20})));
    }
  }
  for(const territory of DOMINATION_TERRITORIES){
    const group=new THREE.Group();
    const orb=new THREE.Mesh(new THREE.SphereGeometry(.58,10,7),new THREE.MeshStandardMaterial({color:TEAM_VISUALS.neutral.color,roughness:.5,metalness:.16}));
    const ring=new THREE.Mesh(new THREE.TorusGeometry(.92,.065,6,26),new THREE.MeshBasicMaterial({color:TEAM_VISUALS.neutral.color,transparent:true,opacity:.72,depthWrite:false}));ring.rotation.x=Math.PI/2;
    group.userData.territoryId=territory.id;orb.userData.territoryId=territory.id;ring.userData.territoryId=territory.id;group.add(orb,ring);
    const p=geoToCartesian(territory.geo,RADIUS+.25);group.position.copy(p);group.quaternion.setFromUnitVectors(new THREE.Vector3(0,1,0),p.clone().normalize());nodeGroup.add(group);markers.set(territory.id,{group,orb,ring});
    for(const city of territory.cities){
      const geo={lat:territory.geo.lat+city.offset.lat,lon:territory.geo.lon+city.offset.lon,elevation:0};
      const mesh=new THREE.Mesh(new THREE.OctahedronGeometry(.20),new THREE.MeshStandardMaterial({color:TEAM_VISUALS.neutral.color,roughness:.55,metalness:.12}));
      const cp=geoToCartesian(geo,RADIUS+.18);mesh.position.copy(cp);mesh.quaternion.setFromUnitVectors(new THREE.Vector3(0,1,0),cp.clone().normalize());mesh.userData={territoryId:territory.id,cityId:city.id};cityGroup.add(mesh);cityMarkers.push(mesh);
    }
  }
}

function refreshGlobe(){
  if(!match)return;
  for(const [id,record] of markers){
    const state=stateFor(id);const color=colorFor(state?.owner);record.orb.material.color.copy(color);record.ring.material.color.copy(color);
    const selected=id===selectedTerritoryId;record.group.scale.setScalar(selected?1.38:1);record.ring.material.opacity=state?.lockedByContestId?1:(selected?.95:.68);
  }
  for(const marker of cityMarkers){
    const city=stateFor(marker.userData.territoryId)?.cities.find(item=>item.id===marker.userData.cityId);marker.material.color.copy(colorFor(city?.owner==="neutral"?null:city?.owner));
  }
}

function renderResources(container,resources={}){
  container.innerHTML=["food","wood","stone","gold"].map(key=>`<div><span>${RESOURCE_ICONS[key]} ${key}</span><b>${Math.floor(Number(resources[key]||0))}</b></div>`).join("");
}

function formatSigned(value){const n=Number(value||0);return `${n>=0?"+":""}${n.toFixed(1)}`;}

function renderTeam(){
  if(!match)return;const t=team(),visual=visualFor(perspective);ui.teamName.textContent=t.name;ui.teamName.style.color=visual.color;ui.territoryScore.textContent=t.score;ui.reserveCount.textContent=t.expeditionReserve.length;ui.contestCount.textContent=match.activeContests.filter(c=>c.attacker.teamId===perspective||c.defender.teamId===perspective).length;renderResources(ui.globalResources,t.globalResources);
  ui.seatList.innerHTML=t.seats.map(seat=>{const faction=FACTIONS[seat.factionId];return `<div class="seat"><b>${esc(seat.displayName)}</b><span>${esc(seat.controller)} • ${faction?`${faction.symbol} ${faction.name}`:"No faction"}</span></div>`;}).join("");
  ui.reserveList.innerHTML=t.expeditionReserve.length?t.expeditionReserve.map(reserve=>{const faction=FACTIONS[reserve.factionId],unit=faction?.units.find(item=>item.id===reserve.unitId);return `<div class="reserve"><b>${esc(unit?.name||reserve.unitId)} ×${reserve.count}</b><span>${esc(faction?.name||reserve.factionId)} • produced from ${esc(territoryDefinition(reserve.sourceTerritoryId)?.name||"territory")} • assign before use</span></div>`;}).join(""):`<div class="reserve"><span>No reserve formations. Every 4 economically funded local productions creates one.</span></div>`;
}

function renderMapSlot(def){
  const slot=mapSlotForTerritory(def.id);
  ui.mapStatus.innerHTML=slot
    ? `<b>Battle map:</b> ${esc(slot.name||slot.id)} • ${esc(slot.projection||"flat")}<br><span>${slot.source==="custom"?"Custom territory map attached.":"Built-in map slot."}</span><br><button id="attachMapInline" style="margin-top:7px">Replace map</button>`
    : `<b>Battle map slot open.</b> Strategic territory/city/economy systems already work. Attach a finished map whenever one exists.<br><button id="attachMapInline" style="margin-top:7px">Attach map JSON</button>`;
  $("attachMapInline")?.addEventListener("click",()=>mapFile.click());
}

function renderTerritory(){
  const state=stateFor(selectedTerritoryId),def=territoryDefinition(selectedTerritoryId);
  if(!state||!def){ui.noSelection.classList.remove("hidden");ui.detail.classList.add("hidden");return;}
  ui.noSelection.classList.add("hidden");ui.detail.classList.remove("hidden");ui.territoryName.textContent=def.name;
  const owner=state.owner||"neutral",ownerVisual=visualFor(owner);ui.ownerBadge.textContent=ownerVisual.name;ui.ownerBadge.style.color=ownerVisual.color;ui.ownerBadge.style.borderColor=ownerVisual.color;ui.territoryStatus.textContent=state.lockedByContestId?"Committed to a live territory contest":state.owner?`Controlled by ${ownerVisual.name}`:"Neutral territory";
  renderMapSlot(def);
  ui.cityList.innerHTML=state.cities.map(city=>`<div class="city"><b>${esc(city.name)}</b><span>${esc(city.owner==="neutral"?"Neutral":visualFor(city.owner).name)} • production ×${Number(city.productionMultiplier||1).toFixed(2)}</span></div>`).join("");
  renderResources(ui.localResources,state.localResources);
  const economy=territoryEconomySnapshot(match,state.id);const unit=economy?.productionUnit;
  const cost=unit?.cost||{};const net=economy?.finance?.projectedNetPerMinute||{};
  ui.productionInfo.innerHTML=`
    <div><span>Garrison</span><b>${dominationGarrisonCount(state)} / ${def.garrisonLimit}</b></div>
    <div><span>Production cycle</span><b>${def.unitProductionSeconds}s</b></div>
    <div><span>Auto-producing</span><b>${esc(unit?.name||"Nothing")}</b></div>
    <div><span>Unit cost</span><b>${["food","wood","stone","gold"].filter(k=>cost[k]>0).map(k=>`${RESOURCE_ICONS[k]}${cost[k]}`).join(" ")||"—"}</b></div>
    <div style="grid-column:1/-1"><span>Projected map net / min after production</span><b>${["food","wood","stone","gold"].map(k=>`${RESOURCE_ICONS[k]} ${formatSigned(net[k])}`).join(" • ")}</b></div>
    <div><span>Produced</span><b>${economy?.finance?.formationsProduced||0}</b></div>
    <div><span>Blocked by economy</span><b>${economy?.finance?.blockedProductionCycles||0}</b></div>`;
  ui.garrisonList.innerHTML=state.garrison.length?state.garrison.map(force=>{const faction=FACTIONS[force.factionId],u=faction?.units.find(item=>item.id===force.unitId);return `<div class="garrison"><b>${esc(u?.name||force.unitId)} ×${force.count}</b><span>${esc(faction?.name||force.factionId)} • physically stored here</span></div>`;}).join(""):`<div class="garrison"><span>No local formations.</span></div>`;
  ui.neighborList.innerHTML=def.neighbors.map(id=>{const nDef=territoryDefinition(id),nState=stateFor(id),v=visualFor(nState?.owner);return `<div class="neighbor" data-territory="${id}"><b>${esc(nDef?.name||id)}</b><span style="color:${v.color}">${esc(v.name)} • ${dominationGarrisonCount(nState)} formations</span></div>`;}).join("");
  for(const node of ui.neighborList.querySelectorAll("[data-territory]"))node.addEventListener("click",()=>selectTerritory(node.dataset.territory));
  const friendly=state.owner===perspective;const sources=friendly?[]:DOMINATION_TERRITORIES.filter(item=>item.neighbors.includes(def.id)).map(item=>stateFor(item.id)).filter(item=>item?.owner===perspective&&!item.lockedByContestId&&dominationGarrisonCount(item)>0);
  ui.contestBtn.disabled=state.lockedByContestId||(friendly?availableNeighborTargets(match,state.id,perspective).length===0:sources.length===0);
  ui.contestBtn.textContent=friendly?"Attack neighboring territory":sources.length?`Attack from ${territoryDefinition(sources[0].id)?.name}`:"No friendly border can reach this";
  ui.contestBtn.onclick=()=>openContestStage(friendly?state.id:sources[0]?.id,friendly?null:state.id);
  ui.assignReserve.disabled=!friendly||state.lockedByContestId||!team().expeditionReserve.length;ui.assignReserve.onclick=()=>assignFirstReserve(state.id);
}

function assignFirstReserve(id){const reserve=team().expeditionReserve[0];if(!reserve)return;if(assignReserveToTerritory(match,perspective,reserve.id,id)){saveDominationMatch(match);renderAll();toast("Reserve assigned. It now physically belongs to this territory.");}}

function renderContests(){
  ui.contestStrip.innerHTML=match.activeContests.length?match.activeContests.map(c=>`<div class="contest-chip" data-contest="${esc(c.id)}">${esc(territoryDefinition(c.sourceId)?.name)} → ${esc(territoryDefinition(c.targetId)?.name)} • ${esc(c.status)}</div>`).join(""):`<div class="contest-chip">No live territory contests</div>`;
  for(const chip of ui.contestStrip.querySelectorAll("[data-contest]"))chip.addEventListener("click",()=>openLiveContest(chip.dataset.contest));
}
function renderClock(){const claimed=Object.values(match.territories).filter(t=>t.owner).length;ui.clockText.textContent=`Real-time economies active • ${claimed}/${DOMINATION_TERRITORIES.length} territories claimed • saved ${new Date(match.updatedAt).toLocaleTimeString()}`;}
function renderAll(){if(!match)return;renderTeam();renderTerritory();renderContests();renderClock();refreshGlobe();}

function selectTerritory(id){selectedTerritoryId=id;renderTerritory();refreshGlobe();focusTerritory(id);}
function focusTerritory(id){const def=territoryDefinition(id);if(!def)return;const normal=geoToCartesian(def.geo,1).normalize(),q=new THREE.Quaternion().setFromUnitVectors(normal,new THREE.Vector3(0,0,1)),euler=new THREE.Euler().setFromQuaternion(q,"XYZ");rotationTarget.x=euler.x;rotationTarget.y=euler.y;}

function openContestStage(sourceId,targetId=null){
  const source=stateFor(sourceId);if(!source)return;const targets=targetId?[stateFor(targetId)]:availableNeighborTargets(match,sourceId,perspective);if(!targets.length)return toast("No neighboring territory is available.");
  staged={sourceId,targetId:targetId||targets[0].id,selection:source.garrison.map(force=>({id:force.id,count:Math.max(1,Math.floor(force.count*.65))}))};renderContestStage(targets);ui.contestPanel.classList.remove("hidden");
}
function renderContestStage(targets){
  const sDef=territoryDefinition(staged.sourceId),tDef=territoryDefinition(staged.targetId);ui.contestTitle.textContent=`${sDef.name} → ${tDef.name}`;ui.contestText.innerHTML=`Only formations physically stored in <b>${esc(sDef.name)}</b> can leave. Every other owned map continues its economy in real time.`;
  const targetButtons=targets.length>1?`<div class="rule-strip">${targets.map(t=>`<button data-target="${t.id}">${esc(territoryDefinition(t.id)?.name)}</button>`).join("")}</div>`:"";
  ui.expeditionForces.innerHTML=targetButtons+stateFor(staged.sourceId).garrison.map(force=>{const faction=FACTIONS[force.factionId],unit=faction?.units.find(item=>item.id===force.unitId),chosen=staged.selection.find(item=>item.id===force.id)?.count||0;return `<div class="force-row"><div><b>${esc(unit?.name||force.unitId)}</b><span>${esc(faction?.name||force.factionId)} • ${force.count} available</span></div><input data-force="${esc(force.id)}" type="number" min="0" max="${force.count}" value="${chosen}"></div>`;}).join("");
  for(const b of ui.expeditionForces.querySelectorAll("[data-target]"))b.addEventListener("click",()=>{staged.targetId=b.dataset.target;renderContestStage(targets);});
  for(const input of ui.expeditionForces.querySelectorAll("[data-force]"))input.addEventListener("change",()=>{const item=staged.selection.find(row=>row.id===input.dataset.force);if(item)item.count=Math.max(0,Number(input.value)||0);});
}
function commitContest(){const result=startTerritoryContest(match,{sourceId:staged.sourceId,targetId:staged.targetId,teamId:perspective,selection:staged.selection});if(!result.ok)return toast(result.error);ui.contestPanel.classList.add("hidden");staged=null;saveDominationMatch(match);renderAll();openLiveContest(result.contest.id);}

function refreshContestMap(contest){const slot=mapSlotForTerritory(contest.targetId);if(slot){contest.battle.mapRef=slot;contest.status="ready";}return contest;}
function openLiveContest(id){
  const contest=match.activeContests.find(item=>item.id===id);if(!contest)return;refreshContestMap(contest);liveContestId=id;const source=territoryDefinition(contest.sourceId),target=territoryDefinition(contest.targetId),pkg=makeContestBattlePackage(match,id);localStorage.setItem("axm.manyRaceRts.pendingDominationBattle",JSON.stringify(pkg));
  ui.liveTitle.textContent=`${source?.name} → ${target?.name}`;ui.liveText.textContent=contest.status==="ready"?"A territory map is attached. The expedition packet is ready for the battle-runtime adapter.":"The strategic contest is staged, but this territory has no battle map attached yet. You can attach one from the territory panel later.";
  ui.liveSummary.innerHTML=`<div><b>Expedition:</b> ${contest.attacker.forces.reduce((s,f)=>s+f.count,0)} formations from ${esc(source?.name)}</div><div><b>Defenders:</b> ${contest.defender.forces.reduce((s,f)=>s+f.count,0)} formations</div><div><b>Cities:</b> ${contest.cities.length} territory objectives</div><div><b>Map:</b> ${esc(pkg?.map?.name||pkg?.map?.id||"awaiting map")}</div>`;
  ui.openBattleLink.classList.toggle("hidden",contest.status!=="ready");ui.livePanel.classList.remove("hidden");saveDominationMatch(match);
}

async function copyBattle(){const pkg=makeContestBattlePackage(match,liveContestId);if(!pkg)return;await navigator.clipboard?.writeText(JSON.stringify(pkg,null,2));toast("Territory battle package copied.");}

function startWorld(size){match=createDominationMatch(size);catchUpDomination(match);saveDominationMatch(match);perspective="azure";ui.perspective.value=perspective;selectedTerritoryId=DOMINATION_TERRITORIES[0].id;enterWorld();}
function continueWorld(){match=loadDominationMatch();catchUpDomination(match);saveDominationMatch(match);selectedTerritoryId=Object.values(match.territories).find(t=>t.owner===perspective)?.id||DOMINATION_TERRITORIES[0].id;enterWorld();}
function enterWorld(){ui.setup.classList.add("hidden");ui.left.classList.remove("hidden");ui.right.classList.remove("hidden");ui.bottom.classList.remove("hidden");renderAll();focusTerritory(selectedTerritoryId);}

function pickTerritory(x,y){
  const rect=renderer.domElement.getBoundingClientRect();pointer.x=((x-rect.left)/rect.width)*2-1;pointer.y=-((y-rect.top)/rect.height)*2+1;raycaster.setFromCamera(pointer,camera);const hits=raycaster.intersectObjects(nodeGroup.children,true);for(const hit of hits){let obj=hit.object;while(obj&&obj!==nodeGroup){if(obj.userData?.territoryId)return obj.userData.territoryId;obj=obj.parent;}}return null;
}
function bindViewport(){const canvas=renderer.domElement;canvas.addEventListener("pointerdown",e=>{pointerDown={id:e.pointerId,x:e.clientX,y:e.clientY,lx:e.clientX,ly:e.clientY};dragging=false;});canvas.addEventListener("pointermove",e=>{if(!pointerDown)return;const dx=e.clientX-pointerDown.lx,dy=e.clientY-pointerDown.ly;if(Math.hypot(e.clientX-pointerDown.x,e.clientY-pointerDown.y)>5)dragging=true;if(dragging){rotationTarget.y+=dx*.007;rotationTarget.x=THREE.MathUtils.clamp(rotationTarget.x+dy*.006,-1.45,1.45);}pointerDown.lx=e.clientX;pointerDown.ly=e.clientY;});canvas.addEventListener("pointerup",e=>{if(pointerDown&&!dragging){const id=pickTerritory(e.clientX,e.clientY);if(id)selectTerritory(id);}pointerDown=null;dragging=false;});canvas.addEventListener("wheel",e=>{e.preventDefault();camera.position.z=THREE.MathUtils.clamp(camera.position.z*(e.deltaY>0?1.08:.92),48,145);},{passive:false});}
function resize(){const w=Math.max(1,innerWidth),h=Math.max(1,innerHeight);renderer.setSize(w,h,false);camera.aspect=w/h;camera.updateProjectionMatrix();}

ui.create.addEventListener("click",()=>startWorld(Number(ui.teamSize.value)||1));ui.continue.addEventListener("click",continueWorld);ui.continue.disabled=!localStorage.getItem(DOMINATION_STORAGE_KEY);ui.newMatch.addEventListener("click",()=>{ui.setup.classList.remove("hidden");ui.left.classList.add("hidden");ui.right.classList.add("hidden");ui.bottom.classList.add("hidden");});
ui.perspective.addEventListener("change",()=>{perspective=ui.perspective.value;selectedTerritoryId=Object.values(match.territories).find(t=>t.owner===perspective)?.id||selectedTerritoryId;renderAll();focusTerritory(selectedTerritoryId);});ui.save.addEventListener("click",()=>{saveDominationMatch(match);toast("World saved.");});ui.cancelContest.addEventListener("click",()=>{ui.contestPanel.classList.add("hidden");staged=null;});ui.confirmContest.addEventListener("click",commitContest);ui.closeLive.addEventListener("click",()=>ui.livePanel.classList.add("hidden"));ui.copyBattle.addEventListener("click",copyBattle);
mapFile.addEventListener("change",async()=>{const file=mapFile.files?.[0];if(!file||!selectedTerritoryId)return;try{const map=JSON.parse(await file.text());const slot=attachMapToTerritory(selectedTerritoryId,map);registerMapInAtlas(slot.embedded);for(const contest of match?.activeContests||[])if(contest.targetId===selectedTerritoryId)refreshContestMap(contest);saveDominationMatch(match);renderTerritory();renderContests();toast(`Map attached to ${territoryDefinition(selectedTerritoryId)?.name}.`);}catch(error){toast(`Map attach failed: ${error.message}`);}mapFile.value="";});

buildPlanet();bindViewport();resize();window.addEventListener("resize",resize);
let previous=performance.now()/1000;
function frame(ms){const now=ms/1000,dt=Math.min(.1,Math.max(0,now-previous));previous=now;root.rotation.x+=(rotationTarget.x-root.rotation.x)*.11;root.rotation.y+=(rotationTarget.y-root.rotation.y)*.11;camera.lookAt(0,0,0);if(match){simulationClock+=dt;saveClock+=dt;if(simulationClock>=1){tickDomination(match,simulationClock);simulationClock=0;renderAll();}if(saveClock>=5){saveClock=0;saveDominationMatch(match);}}renderer.render(scene,camera);requestAnimationFrame(frame);}requestAnimationFrame(frame);
