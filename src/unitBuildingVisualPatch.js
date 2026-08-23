import * as THREE from "three";
import { RTSWorld } from "./world.js";

const previousSpawnSquad = RTSWorld.prototype.spawnSquad;
const previousSpawnBuilding = RTSWorld.prototype.spawnBuilding;

function mat(color, emissive = 0x000000, roughness = .76) {
  return new THREE.MeshStandardMaterial({ color, emissive, roughness, metalness: .08, flatShading: true });
}
function add(group, mesh, x=0, y=0, z=0) { mesh.position.set(x,y,z); group.add(mesh); return mesh; }
function pole(color=0x5f4b36, length=1.8, radius=.035) { return new THREE.Mesh(new THREE.CylinderGeometry(radius,radius*1.2,length,6),mat(color)); }
function plate(color, radius=.32) { const m=new THREE.Mesh(new THREE.CylinderGeometry(radius,radius,.08,8),mat(color)); m.rotation.z=Math.PI/2; return m; }
function shard(color, size=.3, emissive=0x000000) { return new THREE.Mesh(new THREE.OctahedronGeometry(size),mat(color,emissive,.48)); }
function box(color,x,y,z){return new THREE.Mesh(new THREE.BoxGeometry(x,y,z),mat(color));}

function addShield(soldier,color,leaf=false){
  const shield=leaf?new THREE.Mesh(new THREE.SphereGeometry(.32,7,5),mat(color)):plate(color,.31);
  shield.scale.set(leaf ? .68 : 1, leaf ? 1.15 : 1, leaf ? .28 : 1); add(soldier,shield,-.34,.86,.02);
}
function addSpear(soldier,color=0xb7a47f,length=1.75){const p=pole(color,length,.028);p.rotation.z=-.18;add(soldier,p,.34,.96,0);}
function addBow(soldier,color=0x825c39){
  const bow=new THREE.Mesh(new THREE.TorusGeometry(.34,.035,5,12,Math.PI*1.45),mat(color)); bow.rotation.y=Math.PI/2; bow.rotation.z=.35; add(soldier,bow,.34,.95,.02);
  add(soldier,box(0x60452f,.16,.58,.16),-.20,.82,.24);
}
function addHammer(soldier){const h=pole(0x6b523b,1.55,.045);h.rotation.z=-.28;add(soldier,h,.28,.9,0);const head=box(0x777b7e,.62,.20,.22);add(soldier,head,.50,1.55,0);head.rotation.z=-.28;}
function addCrossbow(soldier,color){add(soldier,box(0x66503a,.12,.82,.12),.30,.92,0).rotation.z=-.45;const arm=box(color,.78,.07,.09);add(soldier,arm,.42,1.20,0);arm.rotation.z=-.45;}
function addSling(soldier,color){const loop=new THREE.Mesh(new THREE.TorusGeometry(.18,.025,4,10),mat(color));loop.rotation.y=Math.PI/2;add(soldier,loop,.32,1.08,0);const cord=pole(color,.75,.015);cord.rotation.z=-.65;add(soldier,cord,.28,.88,0);}
function addStandard(group,color){const p=pole(0x544333,2.5,.045);add(group,p,0,1.35,0);const flag=new THREE.Mesh(new THREE.PlaneGeometry(1.12,.66),new THREE.MeshStandardMaterial({color,side:THREE.DoubleSide,roughness:.8}));flag.userData.wave=Math.random()*10;add(group,flag,.52,2.28,0);}
function addMount(soldier,color){
  const mount=new THREE.Group();
  add(mount,box(color,.85,.42,1.28),0,.42,0); const head=box(color,.46,.48,.48);add(mount,head,0,.62,-.72);head.rotation.x=-.16;
  for(const x of [-.31,.31])for(const z of [-.42,.42]){const leg=pole(0x6f4a36,.72,.045);add(mount,leg,x,.06,z);}
  mount.position.y=-.08;soldier.add(mount);soldier.position.y+=.48;
}
function addPack(soldier,color){const pack=box(color,.42,.56,.28);add(soldier,pack,0,.88,.28);}
function addCrystalShield(soldier,color){const s=shard(color,.36,0x10142a);s.scale.set(.42,1.15,.88);add(soldier,s,-.34,.93,0);}
function addOrbit(group,color,count=2,radius=.78){const pivot=new THREE.Group();pivot.position.y=1.65;pivot.userData.spin=1.1;for(let i=0;i<count;i++){const a=i/count*Math.PI*2;const s=shard(color,.18,0x10142a);s.position.set(Math.cos(a)*radius,.12*Math.sin(a*2),Math.sin(a)*radius);pivot.add(s);}group.add(pivot);}
function addScoutMarker(group,color,kind){
  if(kind==="survey"){const mast=pole(color,1.9,.025);mast.rotation.z=.08;add(group,mast,0,1.1,0);const vane=box(color,.65,.08,.08);add(group,vane,.04,1.95,0);vane.userData.spin=.8;}
  else if(kind==="reeds"){for(let i=0;i<4;i++){const r=pole(color,1.25+i*.08,.018);r.rotation.z=(i-1.5)*.12;add(group,r,(i-1.5)*.12,1.05,.18);}}
  else if(kind==="windsock"){const mast=pole(0x604936,1.8,.025);add(group,mast,0,1.1,0);const flag=new THREE.Mesh(new THREE.PlaneGeometry(.82,.28),new THREE.MeshStandardMaterial({color,side:THREE.DoubleSide,roughness:.8}));flag.userData.wave=Math.random()*10;add(group,flag,.38,1.9,0);}
  else if(kind==="sensor-orbit") addOrbit(group,color,3,.68);
}

function decorateMember(soldier, unitId, faction){
  const c=faction.accent;
  switch(unitId){
    case "vale-guard": addShield(soldier,c);addSpear(soldier);break;
    case "ridgebows": addBow(soldier,c);break;
    case "stonebreakers": addHammer(soldier);addShield(soldier,0x7e858a);break;
    case "standard-wardens": addShield(soldier,c);addSpear(soldier,0xc4b28c,1.55);break;
    case "grove-warden": addShield(soldier,c,true);addSpear(soldier,0x6f8a4d,1.55);break;
    case "river-strider": addSpear(soldier,0x6f8a4d,1.48);addSpear(soldier,0x89a969,1.34);addPack(soldier,0x54775b);break;
    case "canopy-slingers": addSling(soldier,c);addPack(soldier,0x5f7851);break;
    case "grove-tenders": addSpear(soldier,c,1.5);break;
    case "marcher": addSpear(soldier,c,1.82);break;
    case "dust-rider": addMount(soldier,0x936b4b);addSpear(soldier,c,1.45);break;
    case "dune-arbalests": addCrossbow(soldier,c);break;
    case "trailblazers": addPack(soldier,0x8f6345);addSpear(soldier,c,1.35);break;
    case "facet-guard": addCrystalShield(soldier,c);addSpear(soldier,c,1.48);break;
    case "refractor": add(soldier,shard(c,.24,0x11152a),-.34,1.05,.18);add(soldier,shard(c,.24,0x11152a),.34,1.05,.18);break;
    case "shard-runners": {const a=shard(c,.27,0x11152a);a.scale.set(.5,1.2,.42);add(soldier,a,-.26,1.02,.30);const b=a.clone();add(soldier,b,.26,1.02,.30);break;}
    case "chorus-anchor": addCrystalShield(soldier,c);break;
    case "vale-surveyors": addPack(soldier,0x697681);break;
    case "reed-runners": addPack(soldier,0x4d7955);break;
    case "far-runners": addPack(soldier,0x8d5f43);break;
    case "gleam-seekers": add(soldier,shard(c,.20,0x10142a),0,1.72,.16);break;
  }
}

function decorateFormation(group,unitDef,faction){
  if(!group||group.userData.__axmDetailedVisual)return;
  group.userData.__axmDetailedVisual=true;
  const members=group.children.filter(child=>child?.isGroup);
  for(const member of members)decorateMember(member,unitDef.id,faction);
  if(unitDef.id==="standard-wardens")addStandard(group,faction.accent);
  if(unitDef.id==="grove-tenders"){const lantern=shard(faction.accent,.25,0x173018);lantern.userData.pulse=true;add(group,lantern,0,2.15,0);}
  if(unitDef.id==="trailblazers")addStandard(group,faction.accent);
  if(unitDef.id==="chorus-anchor")addOrbit(group,faction.accent,3,.88);
  if(unitDef.scout)addScoutMarker(group,faction.accent,unitDef.visual);
}

function battlementRing(building,color,count=6,radius=1.75,y=3.1){for(let i=0;i<count;i++){const a=i/count*Math.PI*2;const b=box(color,.48,.42,.48);b.position.set(Math.cos(a)*radius,y,Math.sin(a)*radius);b.rotation.y=-a;building.add(b);}}
function canopy(building,color,y=3.5){const crown=new THREE.Mesh(new THREE.IcosahedronGeometry(1.05,0),mat(color,0x0b180e,.86));crown.position.y=y;crown.userData.pulse=true;building.add(crown);}
function crystalCrown(building,color,count=4,y=3.5){const pivot=new THREE.Group();pivot.position.y=y;pivot.userData.spin=.48;for(let i=0;i<count;i++){const a=i/count*Math.PI*2;const s=shard(color,.42,0x121027);s.position.set(Math.cos(a)*1.1,Math.sin(a*2)*.15,Math.sin(a)*1.1);pivot.add(s);}building.add(pivot);}
function bannerPair(building,color){for(const x of [-1.4,1.4]){const p=pole(0x584534,2.2,.035);add(building,p,x,1.8,0);const f=new THREE.Mesh(new THREE.PlaneGeometry(.7,.42),new THREE.MeshStandardMaterial({color,side:THREE.DoubleSide,roughness:.82}));f.userData.wave=Math.random()*10;add(building,f,x+.28,2.55,0);}}
function decorateBuilding(building,def,faction){
  if(!building||building.userData.__axmDetailedVisual)return;building.userData.__axmDetailedVisual=true;
  if(faction.id==="ironvale"){
    battlementRing(building,0x596a7c,def.role==="defense"?8:5,def.role==="defense"?1.65:1.5,def.role==="defense"?4.2:2.75);
    if(def.role==="economy"){for(let i=0;i<3;i++)add(building,box(0x8b775e,.65,.5,.65),-1+i*.9,.58,1.7);}
    if(def.role==="military")addStandard(building,faction.accent);
    if(def.id==="ironvale-command-post")bannerPair(building,faction.accent);
  } else if(faction.id==="greenwake"){
    canopy(building,faction.accent,def.role==="defense"?5.35:3.35);
    if(def.role==="economy")for(const x of [-1.25,1.25]){const trunk=pole(0x6b5338,2.2,.16);add(building,trunk,x,1.2,0);}
    if(def.role==="military")bannerPair(building,0x8abf72);
  } else if(faction.id==="ashwind"){
    bannerPair(building,faction.accent);
    if(def.role==="defense"){const arm=box(faction.accent,2.8,.10,.10);arm.userData.spin=1.15;add(building,arm,0,5.15,0);}
    if(def.role==="economy"){const awning=new THREE.Mesh(new THREE.ConeGeometry(2.2,.8,4),mat(0xd3a06c));awning.rotation.y=Math.PI/4;add(building,awning,0,3.25,0);}
  } else if(faction.id==="prismkin"){
    crystalCrown(building,faction.accent,def.role==="defense"?5.2:3.4);
    for(const x of [-1.55,1.55]){const s=shard(faction.color,.48,0x121027);s.scale.y=1.5;add(building,s,x,1.25,0);}
  }
}

RTSWorld.prototype.spawnSquad=function detailedSquad(unitDef,faction,pos,enemy=false,countOverride=null){const squad=previousSpawnSquad.call(this,unitDef,faction,pos,enemy,countOverride);if(["ironvale","greenwake","ashwind","prismkin"].includes(faction?.id))decorateFormation(squad,unitDef,faction);return squad;};
RTSWorld.prototype.spawnBuilding=function detailedBuilding(def,faction,pos,enemy=false){const building=previousSpawnBuilding.call(this,def,faction,pos,enemy);if(["ironvale","greenwake","ashwind","prismkin"].includes(faction?.id))decorateBuilding(building,def,faction);return building;};
