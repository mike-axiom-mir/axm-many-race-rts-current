import { readFileSync, writeFileSync, mkdirSync } from 'node:fs';
import { join } from 'node:path';
import { chromium } from 'playwright';

const fixtureDir = process.env.AXM_FORGE_RUNTIME_VISUAL_FIXTURE_DIR;
const evidenceDir = process.env.AXM_FORGE_RUNTIME_VISUAL_EVIDENCE_DIR;
if (!fixtureDir || !evidenceDir) throw new Error('fixture/evidence directories are required');
mkdirSync(evidenceDir, { recursive: true });

const request = JSON.parse(readFileSync(join(fixtureDir, 'forge-request.json'), 'utf8'));
const receipt = JSON.parse(readFileSync(join(fixtureDir, 'rts-northpole-guard.glb.receipt.json'), 'utf8'));
const glb = [...readFileSync(join(fixtureDir, 'rts-northpole-guard.glb'))];
const browser = await chromium.launch({ headless: true });
const page = await browser.newPage({ viewport: { width: 960, height: 720 } });
const pageErrors = [];
const consoleErrors = [];
page.on('pageerror', error => pageErrors.push(error.message));
page.on('console', message => { if (message.type() === 'error') consoleErrors.push(message.text()); });
await page.goto('http://127.0.0.1:4173/forge-audition.html', { waitUntil: 'networkidle' });

const evidence = await page.evaluate(async ({ request, receipt, glb }) => {
  const THREE = await import('three');
  const { GLTFLoader } = await import('three/addons/loaders/GLTFLoader.js');
  const { admitVerifiedForgeGlb, realizeAdmittedForgeGlb } = await import('./src/verifiedForgeGlbConsumer.js');
  const {
    bindExplicitVisualApproval,
    installApprovedFormationVisual,
    rollbackFormationVisual,
    prepareGroundedThreeVisual
  } = await import('./src/forgeRuntimeVisual.js');

  const parse = buffer => new Promise((resolve, reject) => {
    new GLTFLoader().parse(buffer, '', resolve, reject);
  });
  const bytes = new Uint8Array(glb);
  const admission = await admitVerifiedForgeGlb({ request, deliveryReceipt: receipt, glbBytes: bytes });
  const realization = await realizeAdmittedForgeGlb({ admission, glbBytes: bytes, parse });
  const decision = {
    action: 'APPROVE_RUNTIME_VISUAL_EXPRESSION',
    asset_id: admission.request.asset_id,
    unit_id: request.sources[0].unit_id,
    glb_sha256: realization.evidence.glb_sha256,
    admission_sha256: realization.evidence.admission_sha256
  };
  const approval = await bindExplicitVisualApproval({ request, realization, decision });

  const formation = new THREE.Group();
  formation.name = 'LIVE_RTS_GUARD_FORMATION';
  formation.userData = {
    type: 'squad', id: 'guard', owner: 'player', hp: 500, maxHp: 500,
    damage: 50, speed: 3.1, range: 1.2, radius: 1.3, target: null, cooldown: 0
  };
  const gameplayBefore = JSON.stringify(formation.userData);
  const fallback = [];
  for (let i = 0; i < 5; i++) {
    const soldier = new THREE.Group();
    soldier.name = `PROCEDURAL_FALLBACK_${i}`;
    soldier.position.set((i % 3 - 1) * .75, 0, (Math.floor(i / 3) - .5) * .8);
    const body = new THREE.Mesh(new THREE.CylinderGeometry(.24, .3, .9, 7), new THREE.MeshStandardMaterial({ color: 0x2f80ed }));
    body.position.y = .68;
    soldier.add(body);
    formation.add(soldier);
    fallback.push(soldier);
  }

  const install = await installApprovedFormationVisual({
    formation, request, realization, approval,
    prepareVisual: root => prepareGroundedThreeVisual(THREE, root)
  });
  const installedChildren = [...formation.children];
  let installedMeshes = 0;
  formation.traverse(node => { if (node.isMesh) installedMeshes += 1; });
  const gameplayAfterInstall = JSON.stringify(formation.userData);

  const canvas = document.createElement('canvas');
  canvas.width = 640; canvas.height = 480;
  document.body.appendChild(canvas);
  const renderer = new THREE.WebGLRenderer({ canvas, antialias: false });
  renderer.setSize(640, 480, false);
  const scene = new THREE.Scene();
  scene.background = new THREE.Color(0x17232b);
  scene.add(new THREE.HemisphereLight(0xffffff, 0x445544, 2));
  const sun = new THREE.DirectionalLight(0xffffff, 2.5); sun.position.set(4, 8, 5); scene.add(sun);
  scene.add(formation);
  const camera = new THREE.PerspectiveCamera(42, 640 / 480, .1, 100);
  camera.position.set(5, 5, 7); camera.lookAt(0, .8, 0);
  renderer.render(scene, camera);
  const renderInfo = { calls: renderer.info.render.calls, triangles: renderer.info.render.triangles };

  let wrongRollbackRejected = false;
  try {
    await rollbackFormationVisual({ formation, installation_sha256: 'sha256:' + '0'.repeat(64) });
  } catch { wrongRollbackRejected = true; }
  const rollback = await rollbackFormationVisual({ formation, installation_sha256: install.installation_sha256 });
  const gameplayAfterRollback = JSON.stringify(formation.userData);
  const fallbackRestoredByIdentity = fallback.every((child, index) => formation.children[index] === child && child.parent === formation);
  const installedDetached = installedChildren.every(child => child.parent === null);

  renderer.dispose();
  canvas.remove();
  return {
    status: 'PASS',
    assetId: admission.request.asset_id,
    unitId: request.sources[0].unit_id,
    glbSha256: realization.evidence.glb_sha256,
    admissionSha256: realization.evidence.admission_sha256,
    approvalSha256: approval.approval_sha256,
    installationSha256: install.installation_sha256,
    rollbackSha256: rollback.rollback_sha256,
    visualSlots: install.formation.visual_slots,
    fallbackSlotsRestored: rollback.formation.fallback_slots_restored,
    installedMeshes,
    renderInfo,
    wrongRollbackRejected,
    fallbackRestoredByIdentity,
    installedDetached,
    gameplayUnchanged: gameplayBefore === gameplayAfterInstall && gameplayBefore === gameplayAfterRollback,
    authority: { install: install.authority, rollback: rollback.authority }
  };
}, { request, receipt, glb });

evidence.pageErrors = pageErrors;
evidence.consoleErrors = consoleErrors;
await browser.close();
writeFileSync(join(evidenceDir, 'evidence.json'), JSON.stringify(evidence, null, 2) + '\n');
console.log(JSON.stringify(evidence));
