import test from 'node:test';
import assert from 'node:assert/strict';
import { webcrypto } from 'node:crypto';
if (!globalThis.crypto) globalThis.crypto = webcrypto;
import {
  FORGE_RUNTIME_VISUAL_CONTRACT,
  FORGE_VISUAL_APPROVAL_BOUND,
  FORGE_VISUAL_INSTALLED,
  FORGE_VISUAL_ROLLED_BACK,
  bindExplicitVisualApproval,
  installApprovedFormationVisual,
  rollbackFormationVisual
} from '../src/forgeRuntimeVisual.js';

class V3 { constructor(x=0,y=0,z=0){this.x=x;this.y=y;this.z=z;} copy(v){this.x=v.x;this.y=v.y;this.z=v.z;return this;} clone(){return new V3(this.x,this.y,this.z);} }
class Rot extends V3 { clone(){return new Rot(this.x,this.y,this.z);} }
class Obj {
  constructor(name=''){this.isObject3D=true;this.name=name;this.position=new V3();this.rotation=new Rot();this.scale=new V3(1,1,1);this.children=[];this.parent=null;this.userData={};this.isMesh=false;}
  add(...xs){for(const x of xs){if(x.parent)x.parent.remove(x);this.children.push(x);x.parent=this;}return this;}
  remove(x){const i=this.children.indexOf(x);if(i>=0){this.children.splice(i,1);x.parent=null;}return this;}
  traverse(fn){fn(this);for(const c of this.children)c.traverse(fn);}
  clone(deep=true){const c=new Obj(this.name);c.isMesh=this.isMesh;c.userData=structuredClone(this.userData);c.position.copy(this.position);c.rotation.copy(this.rotation);c.scale.copy(this.scale);if(deep)for(const child of this.children)c.add(child.clone(true));return c;}
}

const digest = n => `sha256:${String(n).repeat(64).slice(0,64)}`;
function request(){return {contract:'axm.rts.forge-unit-request/v0.1',asset:{id:'rts-northpole-guard',name:'Guard',type:'rigid-proxy',unit_meters:1.82},targets:{engines:['threejs'],delivery:['glb']},sources:[{kind:'axm-unit-pack-source',faction_id:'northpole',unit_id:'guard'}]};}
function realization(){const scene=new Obj('provider');const mesh=new Obj('mesh');mesh.isMesh=true;scene.add(mesh);return {state:'REALIZED_NOT_INSTALLED',scene,evidence:{contract:'axm.rts.verified-forge-glb-consumer/v0.1',asset_id:'rts-northpole-guard',glb_sha256:digest('a'),admission_sha256:digest('b'),authority:{renderer_parse:true,render_graph_mutation:false,runtime_asset_install:false,canonical_game_state_mutation:false,gameplay_semantics:false,merge:false,canon:false}}};}
function decision(){return {action:'APPROVE_RUNTIME_VISUAL_EXPRESSION',asset_id:'rts-northpole-guard',unit_id:'guard',glb_sha256:digest('a'),admission_sha256:digest('b')};}
function formation(count=5){const f=new Obj('formation');f.userData={type:'squad',id:'guard',hp:500,maxHp:500,damage:50,speed:3,target:{x:1,y:0,z:2}};for(let i=0;i<count;i++){const s=new Obj(`fallback-${i}`);s.position=new V3(i,0,i*.2);f.add(s);}return f;}
async function approved(){return bindExplicitVisualApproval({request:request(),realization:realization(),decision:decision()});}

test('explicit approval binds exact verified identities without granting install authority', async()=>{
  const receipt=await approved();
  assert.equal(receipt.contract,FORGE_RUNTIME_VISUAL_CONTRACT);
  assert.equal(receipt.state,FORGE_VISUAL_APPROVAL_BOUND);
  assert.equal(receipt.selection.unit_id,'guard');
  assert.equal(receipt.authority.runtime_visual_mutation,false);
  assert.equal(receipt.approval.authenticated_identity,false);
  assert.match(receipt.approval_sha256,/^sha256:[0-9a-f]{64}$/);
});

test('approval rejects silent digest substitution', async()=>{
  const d=decision();d.glb_sha256=digest('c');
  await assert.rejects(()=>bindExplicitVisualApproval({request:request(),realization:realization(),decision:d}),/GLB identity differs/);
});

test('install replaces only visual children and preserves gameplay state object', async()=>{
  const f=formation();const originals=[...f.children];const gameplay=f.userData;const r=realization();const approval=await bindExplicitVisualApproval({request:request(),realization:r,decision:decision()});
  const receipt=await installApprovedFormationVisual({formation:f,request:request(),realization:r,approval,prepareVisual:root=>({prepared:true,children:root.children.length})});
  assert.equal(receipt.state,FORGE_VISUAL_INSTALLED);assert.equal(receipt.formation.visual_slots,5);assert.equal(receipt.authority.runtime_visual_mutation,true);assert.equal(receipt.authority.gameplay_state_mutation,false);
  assert.equal(f.userData,gameplay);assert.equal(f.children.length,5);assert.ok(f.children.every(x=>x.userData.axmReplaceableVisual?.asset_id==='rts-northpole-guard'));assert.ok(originals.every(x=>x.parent===null));
});

test('install fails closed for the wrong live RTS unit', async()=>{
  const f=formation();f.userData.id='ranger';const r=realization();const approval=await approved();const originals=[...f.children];
  await assert.rejects(()=>installApprovedFormationVisual({formation:f,request:request(),realization:r,approval,prepareVisual:()=>{}}),/unit identity differs/);
  assert.deepEqual(f.children,originals);
});

test('install refuses a second active visual over the preserved fallback', async()=>{
  const f=formation();const r=realization();const approval=await approved();
  const first=await installApprovedFormationVisual({formation:f,request:request(),realization:r,approval,prepareVisual:()=>{}});
  await assert.rejects(()=>installApprovedFormationVisual({formation:f,request:request(),realization:r,approval,prepareVisual:()=>{}}),/already has/);
  await rollbackFormationVisual({formation:f,installation_sha256:first.installation_sha256});
});

test('rollback requires exact installation identity and restores original objects', async()=>{
  const f=formation(3);const originals=[...f.children];const gameplay=f.userData;const r=realization();const approval=await approved();
  const installed=await installApprovedFormationVisual({formation:f,request:request(),realization:r,approval,prepareVisual:()=>{}});
  await assert.rejects(()=>rollbackFormationVisual({formation:f,installation_sha256:digest('f')}),/does not match/);
  assert.notDeepEqual(f.children,originals);
  const rolled=await rollbackFormationVisual({formation:f,installation_sha256:installed.installation_sha256});
  assert.equal(rolled.state,FORGE_VISUAL_ROLLED_BACK);assert.equal(rolled.formation.fallback_slots_restored,3);assert.equal(f.userData,gameplay);assert.deepEqual(f.children,originals);assert.ok(originals.every(x=>x.parent===f));
});

test('install rejects a tampered approval even when the attacker leaves a plausible digest string', async()=>{
  const f=formation();const r=realization();const approval=await approved();
  approval.selection.unit_id='ranger';
  await assert.rejects(()=>installApprovedFormationVisual({formation:f,request:request(),realization:r,approval,prepareVisual:()=>{}}),/digest no longer matches/);
});

test('approval rejects authority widening in the upstream realization', async()=>{
  const r=realization();r.evidence.authority.runtime_asset_install=true;
  await assert.rejects(()=>bindExplicitVisualApproval({request:request(),realization:r,decision:decision()}),/runtime_asset_install must remain false/);
});
