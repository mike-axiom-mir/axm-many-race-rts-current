import * as THREE from "three";
import { RTSWorld } from "./world.js";

const previousSpawnSquad = RTSWorld.prototype.spawnSquad;
const previousSpawnBuilding = RTSWorld.prototype.spawnBuilding;

function mat(color, emissive = 0x000000, roughness = .76) {
  return new THREE.MeshStandardMaterial({ color, emissive, roughness, metalness: .08, flatShading: true });
}
function add(group, mesh, x=0, y=0, z=0) { mesh.position.set(x,y,z); group.add(mesh); return mesh; }
function pole(color=0x5b4936,length=1.7,r=.03){return new THREE.Mesh(new THREE.CylinderGeometry(r,r*1.15,length,6),mat(color));}
function box(color,x,y,z){return new THREE.Mesh(new THREE.BoxGeometry(x,y,z),mat(color));}
function shard(color,size=.28){return new THREE.Mesh(new THREE.OctahedronGeometry(size),mat(color,0x101329,.5));}

function mount(member,color){
  const body=box(color,.82,.42,1.18);add(member,body,0,.38,0);
  const head=box(color,.42,.42,.42);add(member,head,0,.58,-.68);
  for(const x of [-.29,.29])for(const z of [-.38,.38])add(member,pole(0x64462f,.66,.04),x,.02,z);
  member.position.y += .45;
}
function pavise(member,color){const shield=box(color,.08,.92,.66);add(member,shield,-.38,.88,.05);const bow=box(0x65503b,.84,.08,.08);bow.rotation.z=-.42;add(member,bow,.32,1.10,0);}
function javelins(member,color){for(const x of [.22,.34]){const p=pole(color,1.48,.024);p.rotation.z=-.18;add(member,p,x,.93,(x-.22)*1.1);}}
function sling(member,color){const loop=new THREE.Mesh(new THREE.TorusGeometry(.18,.024,5,10),mat(color));loop.rotation.y=Math.PI/2;add(member,loop,.30,1.03,0);const ember=shard(0xff9c52,.14);ember.userData.pulse=true;add(member,ember,.34,1.28,.02);}
function lance(member,color){const p=pole(color,1.95,.032);p.rotation.z=-.22;add(member,p,.32,1.05,0);const tip=shard(color,.18);tip.scale.set(.48,1.35,.48);tip.rotation.z=-.22;add(member,tip,.52,1.86,0);}
function ram(group,color,crystal=false,streamer=false){
  const frame=new THREE.Group();
  const beam=new THREE.Mesh(new THREE.CylinderGeometry(.20,.27,2.9,7),mat(crystal?color:0x765234,crystal?0x101329:0));beam.rotation.z=Math.PI/2;add(frame,beam,0,.76,0);
  for(const x of [-.9,.9])for(const z of [-.45,.45]){const leg=box(0x5c4a37,.12,.72,.12);add(frame,leg,x,.37,z);}
  if(crystal){const tip=shard(color,.34);tip.scale.set(.6,1.3,.6);tip.rotation.z=Math.PI/2;add(frame,tip,1.62,.76,0);frame.userData.spin=.08;}
  if(streamer){const flag=new THREE.Mesh(new THREE.PlaneGeometry(.82,.28),new THREE.MeshStandardMaterial({color,side:THREE.DoubleSide,roughness:.8}));flag.userData.wave=Math.random()*10;add(frame,flag,-.30,1.38,0);}
  group.add(frame);
}

function decorateUnit(group,unitDef,faction){
  const members=group.children.filter(child=>child?.isGroup);
  const c=faction.accent;
  if(unitDef.id==="vale-outriders") members.forEach(member=>{mount(member,0x6d7885);const shield=new THREE.Mesh(new THREE.CylinderGeometry(.29,.29,.07,8),mat(c));shield.rotation.z=Math.PI/2;add(member,shield,-.35,1.12,0);});
  else if(unitDef.id==="pavise-bolters") members.forEach(member=>pavise(member,c));
  else if(unitDef.id==="marsh-javelineers") members.forEach(member=>javelins(member,0x6b8c55));
  else if(unitDef.id==="rootbreakers") { members.forEach(member=>add(member,box(0x56714c,.34,.52,.28),0,.86,.28));ram(group,0x6a814c,false,false); }
  else if(unitDef.id==="ember-slingers") members.forEach(member=>sling(member,c));
  else if(unitDef.id==="wind-rams") { members.forEach(member=>add(member,box(0x8b603f,.38,.50,.26),0,.86,.28));ram(group,c,false,true); }
  else if(unitDef.id==="prism-lancers") members.forEach(member=>lance(member,c));
  else if(unitDef.id==="fracture-array") { members.forEach(member=>add(member,shard(c,.22),0,1.48,.18));ram(group,c,true,false); }
}

function boltCrown(building,color){
  const arm=box(color,2.7,.16,.16);arm.rotation.z=-.08;add(building,arm,0,5.25,0);
  const rail=box(0x62503d,.18,.18,2.3);add(building,rail,0,5.22,0);
  const bolt=pole(0x8a7656,2.7,.04);bolt.rotation.x=Math.PI/2;add(building,bolt,0,5.25,-.25);
}
function thornCrown(building,color){
  for(let i=0;i<7;i++){const a=i/7*Math.PI*2;const spike=pole(color,1.2,.045);spike.rotation.z=.68;spike.rotation.y=-a;spike.position.set(Math.cos(a)*1.35,4.65,Math.sin(a)*1.35);building.add(spike);}
  const core=shard(color,.52);core.userData.pulse=true;add(building,core,0,5.25,0);
}
function flareCrown(building,color){const arm=box(color,3.2,.12,.12);arm.userData.spin=1.35;add(building,arm,0,5.45,0);const lamp=shard(0xff9b52,.34);lamp.userData.pulse=true;add(building,lamp,0,5.55,0);}
function mirrorCrown(building,color){const pivot=new THREE.Group();pivot.position.y=5.15;pivot.userData.spin=.72;for(let i=0;i<4;i++){const a=i/4*Math.PI*2;const m=box(color,.08,.72,.52);m.position.set(Math.cos(a)*1.25,.05,Math.sin(a)*1.25);m.rotation.y=-a;pivot.add(m);}building.add(pivot);}

RTSWorld.prototype.spawnSquad = function phase19VisualSquad(unitDef,faction,pos,enemy=false,countOverride=null){
  const squad=previousSpawnSquad.call(this,unitDef,faction,pos,enemy,countOverride);
  if(["vale-outriders","pavise-bolters","marsh-javelineers","rootbreakers","ember-slingers","wind-rams","prism-lancers","fracture-array"].includes(unitDef?.id)) decorateUnit(squad,unitDef,faction);
  return squad;
};

RTSWorld.prototype.spawnBuilding = function phase19VisualBuilding(def,faction,pos,enemy=false){
  const building=previousSpawnBuilding.call(this,def,faction,pos,enemy);
  if(Number(def?.visionRadius)>0) building.userData.visionRadius=Number(def.visionRadius);
  if(def?.id==="ironvale-bolt-bastion") boltCrown(building,faction.accent);
  else if(def?.id==="greenwake-briar-nest") thornCrown(building,faction.accent);
  else if(def?.id==="ashwind-flare-battery") flareCrown(building,faction.accent);
  else if(def?.id==="prism-mirror-battery") mirrorCrown(building,faction.accent);
  return building;
};
