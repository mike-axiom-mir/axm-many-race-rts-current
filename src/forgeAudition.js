import * as THREE from "three";
import { GLTFLoader } from "three/addons/loaders/GLTFLoader.js";
import { admitVerifiedForgeGlb, realizeAdmittedForgeGlb } from "./verifiedForgeGlbConsumer.js";

const VIEW_PRESETS = Object.freeze({
  detail: { meters: 4.5, label: "DETAIL VIEW · 4.5 m" },
  command: { meters: 12, label: "COMMAND VIEW · 12 m" },
  distant: { meters: 26, label: "DISTANT VIEW · 26 m" }
});

const stage = document.querySelector("#forgeStage");
const empty = document.querySelector("#stageEmpty");
const renderState = document.querySelector("#renderState");
const stageTitle = document.querySelector("#stageTitle");
const viewLabel = document.querySelector("#viewLabel");
const heightRail = document.querySelector("#heightRail");
const statusMessage = document.querySelector("#statusMessage");
const verifyButton = document.querySelector("#verifyButton");
const requestFile = document.querySelector("#requestFile");
const receiptFile = document.querySelector("#receiptFile");
const glbFile = document.querySelector("#glbFile");
const rotateButton = document.querySelector("#rotateButton");
const wireButton = document.querySelector("#wireButton");
const resetButton = document.querySelector("#resetButton");
const copyDigestButton = document.querySelector("#copyDigestButton");
const metrics = {
  asset: document.querySelector("#assetMetric"),
  requested: document.querySelector("#requestedMetric"),
  bounds: document.querySelector("#boundsMetric"),
  mesh: document.querySelector("#meshMetric"),
  screen: document.querySelector("#screenMetric"),
  digest: document.querySelector("#digestMetric")
};

const reducedMotion = window.matchMedia?.("(prefers-reduced-motion: reduce)")?.matches === true;
let renderer = null;
let scene = null;
let camera = null;
let assetRoot = null;
let assetBox = null;
let currentView = "command";
let rotating = false;
let wireframe = false;
let glbDigest = "";
let pointerDrag = null;
let azimuth = Math.PI * .23;
let elevation = Math.PI * .28;
let raf = 0;

function setStatus(state, message, tone = "") {
  renderState.dataset.state = state;
  renderState.textContent = state === "rendered" ? "VERIFIED · RENDERED" : state === "held" ? "HELD · NOTHING ADOPTED" : state === "verifying" ? "VERIFYING EXACT FILES" : "WAITING FOR VERIFIED FILES";
  statusMessage.textContent = message;
  statusMessage.dataset.tone = tone;
}

function clearMetrics() {
  Object.values(metrics).forEach(node => { node.textContent = "—"; });
  copyDigestButton.disabled = true;
  glbDigest = "";
}

function updateReadyState() {
  verifyButton.disabled = !(requestFile.files?.length && receiptFile.files?.length && glbFile.files?.length);
}

for (const input of [requestFile, receiptFile, glbFile]) input.addEventListener("change", updateReadyState);

function initStage() {
  if (renderer) return;
  renderer = new THREE.WebGLRenderer({ antialias: true, alpha: false, powerPreference: "high-performance" });
  renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 1.75));
  renderer.outputColorSpace = THREE.SRGBColorSpace;
  renderer.shadowMap.enabled = true;
  renderer.shadowMap.type = THREE.PCFSoftShadowMap;
  stage.prepend(renderer.domElement);

  scene = new THREE.Scene();
  scene.background = new THREE.Color(0x102331);
  scene.fog = new THREE.FogExp2(0x102331, .035);

  camera = new THREE.OrthographicCamera(-6, 6, 6, -6, .1, 100);
  camera.position.set(8, 8, 8);

  const hemi = new THREE.HemisphereLight(0xdff5ff, 0x314638, 2.15);
  scene.add(hemi);
  const sun = new THREE.DirectionalLight(0xffe6b7, 3.1);
  sun.position.set(-7, 12, 8);
  sun.castShadow = true;
  sun.shadow.mapSize.set(1024, 1024);
  scene.add(sun);

  const ground = new THREE.Mesh(
    new THREE.PlaneGeometry(32, 24),
    new THREE.MeshStandardMaterial({ color: 0x486548, roughness: .96, metalness: 0 })
  );
  ground.rotation.x = -Math.PI / 2;
  ground.receiveShadow = true;
  scene.add(ground);
  const grid = new THREE.GridHelper(32, 32, 0x9fc4a0, 0x668267);
  grid.position.y = .006;
  grid.material.opacity = .23;
  grid.material.transparent = true;
  scene.add(grid);

  const commandRing = new THREE.Mesh(
    new THREE.RingGeometry(1.7, 1.78, 48),
    new THREE.MeshBasicMaterial({ color: 0x93e6ff, transparent: true, opacity: .34, side: THREE.DoubleSide })
  );
  commandRing.rotation.x = -Math.PI / 2;
  commandRing.position.y = .02;
  scene.add(commandRing);

  renderer.domElement.addEventListener("pointerdown", event => {
    renderer.domElement.setPointerCapture?.(event.pointerId);
    pointerDrag = { id: event.pointerId, x: event.clientX, y: event.clientY };
  });
  renderer.domElement.addEventListener("pointermove", event => {
    if (!pointerDrag || pointerDrag.id !== event.pointerId) return;
    const dx = event.clientX - pointerDrag.x;
    const dy = event.clientY - pointerDrag.y;
    azimuth -= dx * .008;
    elevation = THREE.MathUtils.clamp(elevation + dy * .006, .12, 1.22);
    pointerDrag.x = event.clientX;
    pointerDrag.y = event.clientY;
  });
  renderer.domElement.addEventListener("pointerup", event => {
    if (pointerDrag?.id === event.pointerId) pointerDrag = null;
  });

  window.addEventListener("resize", resize);
  resize();
  renderLoop();
}

function resize() {
  if (!renderer || !camera) return;
  const width = Math.max(1, stage.clientWidth);
  const height = Math.max(1, stage.clientHeight);
  renderer.setSize(width, height, false);
  applyView(currentView);
}

function applyView(view) {
  currentView = VIEW_PRESETS[view] ? view : "command";
  if (!camera || !renderer) return;
  const preset = VIEW_PRESETS[currentView];
  const aspect = Math.max(.4, stage.clientWidth / Math.max(1, stage.clientHeight));
  const half = preset.meters / 2;
  camera.left = -half * aspect;
  camera.right = half * aspect;
  camera.top = half;
  camera.bottom = -half;
  camera.updateProjectionMatrix();
  viewLabel.textContent = preset.label;
  document.querySelectorAll("[data-view]").forEach(button => button.setAttribute("aria-pressed", String(button.dataset.view === currentView)));
  updateScreenMetric();
}

function cameraOrbit() {
  const radius = 10;
  const y = 1.15 + Math.sin(elevation) * radius;
  const planar = Math.cos(elevation) * radius;
  camera.position.set(Math.sin(azimuth) * planar, y, Math.cos(azimuth) * planar);
  camera.lookAt(0, .9, 0);
}

function projectedHeightPx(box) {
  if (!box || !renderer || !camera) return 0;
  const corners = [];
  for (const x of [box.min.x, box.max.x]) for (const y of [box.min.y, box.max.y]) for (const z of [box.min.z, box.max.z]) corners.push(new THREE.Vector3(x, y, z).project(camera));
  const ys = corners.map(point => point.y);
  return Math.max(0, (Math.max(...ys) - Math.min(...ys)) * .5 * renderer.domElement.clientHeight);
}

function updateScreenMetric() {
  if (!assetBox) return;
  metrics.screen.textContent = `${Math.round(projectedHeightPx(assetBox))} px · ${currentView}`;
}

function setWireframe(enabled) {
  wireframe = Boolean(enabled);
  wireButton.setAttribute("aria-pressed", String(wireframe));
  assetRoot?.traverse(node => {
    if (!node.isMesh) return;
    const materials = Array.isArray(node.material) ? node.material : [node.material];
    for (const material of materials) if (material && "wireframe" in material) material.wireframe = wireframe;
  });
}

function disposeAsset() {
  if (!assetRoot || !scene) return;
  scene.remove(assetRoot);
  assetRoot.traverse(node => {
    node.geometry?.dispose?.();
    const materials = Array.isArray(node.material) ? node.material : [node.material];
    for (const material of materials) material?.dispose?.();
  });
  assetRoot = null;
  assetBox = null;
}

async function parseJsonFile(file, label) {
  try {
    return JSON.parse(await file.text());
  } catch (error) {
    throw new Error(`${label} is not valid JSON: ${error.message}`);
  }
}

async function parseWithThree(buffer) {
  const loader = new GLTFLoader();
  return new Promise((resolve, reject) => loader.parse(buffer, "", resolve, error => reject(error instanceof Error ? error : new Error(String(error)))));
}

async function verifyAndRender() {
  if (verifyButton.disabled) return;
  verifyButton.disabled = true;
  disposeAsset();
  clearMetrics();
  empty.hidden = false;
  setStatus("verifying", "Recomputing request and GLB identities before renderer parse…");

  try {
    const request = await parseJsonFile(requestFile.files[0], "RTS request");
    const deliveryReceipt = await parseJsonFile(receiptFile.files[0], "Forge receipt");
    const glbBytes = new Uint8Array(await glbFile.files[0].arrayBuffer());
    const admission = await admitVerifiedForgeGlb({ request, deliveryReceipt, glbBytes });
    const realization = await realizeAdmittedForgeGlb({ admission, glbBytes, parse: parseWithThree });

    initStage();
    assetRoot = realization.scene;
    assetRoot.traverse(node => { if (node.isMesh) { node.castShadow = true; node.receiveShadow = true; } });
    assetBox = new THREE.Box3().setFromObject(assetRoot);
    const size = assetBox.getSize(new THREE.Vector3());
    const center = assetBox.getCenter(new THREE.Vector3());
    assetRoot.position.x -= center.x;
    assetRoot.position.z -= center.z;
    assetRoot.position.y -= assetBox.min.y;
    scene.add(assetRoot);
    assetBox = new THREE.Box3().setFromObject(assetRoot);

    const requestedHeight = Number(request.asset?.unit_meters);
    stageTitle.textContent = request.asset?.name || request.asset?.id || "Verified Forge asset";
    heightRail.textContent = Number.isFinite(requestedHeight) ? `REQUESTED HEIGHT · ${requestedHeight.toFixed(2)} m` : "REQUESTED HEIGHT · explicit request value unavailable";
    metrics.asset.textContent = request.asset?.id || "—";
    metrics.requested.textContent = Number.isFinite(requestedHeight) ? `${requestedHeight.toFixed(2)} m` : "—";
    metrics.bounds.textContent = `${size.x.toFixed(2)} × ${size.y.toFixed(2)} × ${size.z.toFixed(2)} m`;
    metrics.mesh.textContent = String(realization.evidence.mesh_count);
    metrics.digest.textContent = admission.glb.sha256;
    glbDigest = admission.glb.sha256;
    copyDigestButton.disabled = false;
    empty.hidden = true;
    setWireframe(false);
    applyView("command");
    setStatus("rendered", "Exact files admitted. Three.js rendered the replaceable GLB expression; no RTS runtime asset was installed.", "good");
    window.dispatchEvent(new CustomEvent("axm:forge-audition-rendered", { detail: { assetId: request.asset.id, glbSha256: glbDigest } }));
  } catch (error) {
    disposeAsset();
    stageTitle.textContent = "No asset loaded";
    heightRail.textContent = "REQUESTED HEIGHT · —";
    empty.hidden = false;
    setStatus("held", `Held before adoption: ${error.message}`, "held");
  } finally {
    updateReadyState();
  }
}

function renderLoop() {
  cancelAnimationFrame(raf);
  const frame = () => {
    if (camera && renderer && scene) {
      if (rotating && assetRoot && !reducedMotion) assetRoot.rotation.y += .0055;
      cameraOrbit();
      renderer.render(scene, camera);
      updateScreenMetric();
    }
    raf = requestAnimationFrame(frame);
  };
  frame();
}

verifyButton.addEventListener("click", verifyAndRender);
document.querySelectorAll("[data-view]").forEach(button => button.addEventListener("click", () => applyView(button.dataset.view)));
rotateButton.addEventListener("click", () => {
  rotating = !rotating;
  rotateButton.setAttribute("aria-pressed", String(rotating));
  rotateButton.textContent = rotating ? "Stop rotation" : "Rotate asset";
});
wireButton.addEventListener("click", () => setWireframe(!wireframe));
resetButton.addEventListener("click", () => {
  azimuth = Math.PI * .23;
  elevation = Math.PI * .28;
  rotating = false;
  rotateButton.setAttribute("aria-pressed", "false");
  rotateButton.textContent = "Rotate asset";
  setWireframe(false);
  applyView("command");
});
copyDigestButton.addEventListener("click", async () => {
  if (!glbDigest) return;
  try {
    await navigator.clipboard.writeText(glbDigest);
    statusMessage.textContent = "Copied exact GLB identity. The rendered asset remains audition-only.";
  } catch {
    statusMessage.textContent = "Clipboard unavailable. The exact GLB identity remains visible in the receipt above.";
  }
});

setStatus("waiting", "Choose all three exact files. Nothing is parsed automatically.");
applyView("command");
