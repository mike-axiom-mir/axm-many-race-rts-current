import * as THREE from "three";
import { RTSWorld } from "./world.js";
import { DEFAULT_MAP } from "./maps.js";
import { flatHeightAt } from "./mapVisuals.js";

const previousSpawnBuilding = RTSWorld.prototype.spawnBuilding;
const previousMovement = RTSWorld.prototype.updateMovement;
const previousTick = RTSWorld.prototype.tick;

function material(color, roughness=.88){return new THREE.MeshStandardMaterial({color,roughness,metalness:.04,flatShading:true});}
function shadow(mesh){mesh.castShadow=true;mesh.receiveShadow=true;return mesh;}
function sameTeam(world,a,b){if(a===b)return true;const teams=world?.__axmTeamByOwner||{};return teams[a]!=null&&teams[b]!=null&&teams[a]===teams[b];}

function wallPalette(faction, enemy){
  if(enemy)return {body:0x6f3b42,dark:0x39252a,accent:0xd76f78};
  if(faction?.id==="ironvale")return {body:0x65788a,dark:0x3f4c59,accent:faction.accent};
  if(faction?.id==="greenwake")return {body:0x657a4f,dark:0x4c583c,accent:faction.accent};
  if(faction?.id==="ashwind")return {body:0x9b704f,dark:0x624934,accent:faction.accent};
  if(faction?.id==="prismkin")return {body:0x716c91,dark:0x49455f,accent:faction.accent};
  return {body:faction?.color||0x75808b,dark:0x3c4650,accent:faction?.accent||0xdde7ed};
}

function clearGeneratedBuilding(building){for(const child of building.children)child.visible=false;}

function makeWallVisual(building,faction,enemy,width,depth){
  const p=wallPalette(faction,enemy);
  const body=shadow(new THREE.Mesh(new THREE.BoxGeometry(width,1.85,depth),material(p.body)));body.position.y=.95;building.add(body);
  const footing=shadow(new THREE.Mesh(new THREE.BoxGeometry(width+.25,.32,depth+.28),material(p.dark)));footing.position.y=.16;building.add(footing);
  for(let i=0;i<5;i++){
    const x=-width/2+(i+.5)*width/5;
    const cap=shadow(new THREE.Mesh(new THREE.BoxGeometry(width/5*.68,.42,depth*1.08),material(p.accent)));
    cap.position.set(x,2.02,0);building.add(cap);
  }
}

function makeGateVisual(building,faction,enemy,width,depth){
  const p=wallPalette(faction,enemy),pillarW=.78;
  for(const x of [-width/2+pillarW/2,width/2-pillarW/2]){
    const pillar=shadow(new THREE.Mesh(new THREE.BoxGeometry(pillarW,2.75,depth*1.18),material(p.body)));pillar.position.set(x,1.38,0);building.add(pillar);
    const cap=shadow(new THREE.Mesh(new THREE.BoxGeometry(pillarW*1.2,.34,depth*1.32),material(p.accent)));cap.position.set(x,2.92,0);building.add(cap);
  }
  const lintel=shadow(new THREE.Mesh(new THREE.BoxGeometry(width-1.25,.48,depth),material(p.dark)));lintel.position.y=2.5;building.add(lintel);
  const door=shadow(new THREE.Mesh(new THREE.BoxGeometry(width-1.65,1.72,.18),material(p.dark)));door.position.y=1.08;building.add(door);
  door.userData.gateDoor=true;door.userData.closedY=1.08;door.userData.openY=2.55;building.userData.gateDoor=door;building.userData.gateOpen=false;
}

function nearestFriendlyFortification(world,building){
  let best=null,bestDistance=8.2;
  for(const other of world.entities){
    if(!other.parent||other===building||other.userData.hp<=0||!other.userData.fortification)continue;
    if(!sameTeam(world,building.userData.owner,other.userData.owner))continue;
    const d=building.position.distanceTo(other.position);
    if(d<bestDistance){best=other;bestDistance=d;}
  }
  return best;
}

function alignAndSnapFortification(world,building){
  const neighbor=nearestFriendlyFortification(world,building);
  if(neighbor){
    building.rotation.y=neighbor.rotation.y;
    const ncfg=neighbor.userData.fortification;
    const bcfg=building.userData.fortification;
    const axis=new THREE.Vector3(Math.cos(neighbor.rotation.y),0,-Math.sin(neighbor.rotation.y)).normalize();
    const desired=building.position.clone().sub(neighbor.position);
    const sign=desired.dot(axis)>=0?1:-1;
    const spacing=(Number(ncfg.width||5.4)+Number(bcfg.width||5.4))*.5+.12;
    building.position.x=neighbor.position.x+axis.x*spacing*sign;
    building.position.z=neighbor.position.z+axis.z*spacing*sign;
  }else{
    const capital=world.entities.find(entity=>entity.parent&&entity.userData.type==="capital"&&sameTeam(world,entity.userData.owner,building.userData.owner));
    if(capital){
      const dx=building.position.x-capital.position.x,dz=building.position.z-capital.position.z;
      building.rotation.y=Math.atan2(dx,dz)+Math.PI/2;
    }
  }
  building.position.y=flatHeightAt(DEFAULT_MAP,building.position.x,building.position.z);
}

function setupFortification(world,building,def,faction,enemy){
  const cfg=def?.fortification;
  if(!cfg)return building;
  clearGeneratedBuilding(building);
  const width=Math.max(3.2,Number(cfg.width||5.4)),depth=Math.max(.55,Number(cfg.depth||.85));
  building.userData.fortification={kind:cfg.kind||def.role,width,depth,passFriendly:Boolean(cfg.passFriendly)};
  building.userData.radius=Math.max(2.1,width*.48);
  building.userData.visionRadius=0;
  if(def.role==="gate")makeGateVisual(building,faction,enemy,width,depth);else makeWallVisual(building,faction,enemy,width,depth);
  alignAndSnapFortification(world,building);
  return building;
}

function blockerFor(world,entity,point){
  for(const fort of world.entities){
    if(!fort.parent||fort.userData.hp<=0||!fort.userData.fortification)continue;
    const cfg=fort.userData.fortification;
    if(cfg.passFriendly&&sameTeam(world,entity.userData.owner,fort.userData.owner))continue;
    const dx=point.x-fort.position.x,dz=point.z-fort.position.z;
    const c=Math.cos(-fort.rotation.y),s=Math.sin(-fort.rotation.y);
    const lx=dx*c-dz*s,lz=dx*s+dz*c;
    const margin=Math.min(.72,Math.max(.28,Number(entity.userData.radius||.8)*.38));
    if(Math.abs(lx)<=cfg.width/2+margin&&Math.abs(lz)<=cfg.depth/2+margin)return fort;
  }
  return null;
}

RTSWorld.prototype.spawnBuilding=function fortificationBuilding(def,faction,pos,enemy=false){
  const building=previousSpawnBuilding.call(this,def,faction,pos,enemy);
  return setupFortification(this,building,def,faction,enemy);
};

RTSWorld.prototype.updateMovement=function fortificationMovement(entity,dt,time){
  if((entity.userData.type!=="squad"&&entity.userData.type!=="founder")||!entity.userData.target)return previousMovement.call(this,entity,dt,time);
  const before=entity.position.clone();
  previousMovement.call(this,entity,dt,time);
  const blocker=blockerFor(this,entity,entity.position);
  if(blocker){
    entity.position.copy(before);
    if(!sameTeam(this,entity.userData.owner,blocker.userData.owner))entity.userData.target=blocker.position.clone();
  }
  const ground=flatHeightAt(DEFAULT_MAP,entity.position.x,entity.position.z);
  const bounce=Math.sin(time*9+(entity.userData.phase||0))*.045;
  entity.position.y=ground+Math.max(0,bounce);
};

function animateGates(world,dt){
  for(const gate of world.entities){
    const door=gate.userData?.gateDoor;
    if(!gate.parent||gate.userData.hp<=0||!door)continue;
    const friendlyNear=world.entities.some(entity=>{
      if(!entity.parent||entity.userData.hp<=0||(entity.userData.type!=="squad"&&entity.userData.type!=="founder"))return false;
      if(!sameTeam(world,gate.userData.owner,entity.userData.owner))return false;
      const dx=entity.position.x-gate.position.x,dz=entity.position.z-gate.position.z;
      return dx*dx+dz*dz<22;
    });
    gate.userData.gateOpen=Boolean(friendlyNear);
    const target=friendlyNear?door.userData.openY:door.userData.closedY;
    door.position.y+=(target-door.position.y)*Math.min(1,dt*6.5);
  }
}

RTSWorld.prototype.tick=function fortificationTick(time,dt){animateGates(this,dt);return previousTick.call(this,time,dt);};
