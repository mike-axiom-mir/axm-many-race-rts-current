import { createServer } from "node:http";
import { readFile, stat } from "node:fs/promises";
import { resolve, sep } from "node:path";
import { chromium } from "playwright";

const root = resolve(process.cwd());
const fixtureDir = resolve(process.env.AXM_FORGE_GLB_FIXTURE_DIR || "");
if (!process.env.AXM_FORGE_GLB_FIXTURE_DIR) throw new Error("AXM_FORGE_GLB_FIXTURE_DIR is required");

const types = new Map([
  [".js", "text/javascript"], [".mjs", "text/javascript"], [".json", "application/json"],
  [".glb", "model/gltf-binary"], [".png", "image/png"], [".html", "text/html"]
]);

function extension(pathname) {
  const index = pathname.lastIndexOf(".");
  return index >= 0 ? pathname.slice(index) : "";
}

const proofHtml = `<!doctype html>
<html><head><meta charset="utf-8"><script type="importmap">{
  "imports": {
    "three": "/node_modules/three/build/three.module.js",
    "three/addons/": "/node_modules/three/examples/jsm/"
  }
}</script></head><body><canvas id="view" width="320" height="240"></canvas><script type="module">
import * as THREE from "three";
import { GLTFLoader } from "three/addons/loaders/GLTFLoader.js";
import { admitVerifiedForgeGlb, realizeAdmittedForgeGlb } from "/src/verifiedForgeGlbConsumer.js";

window.__AXM_FORGE_GLB_PROOF__ = { status: "RUNNING" };
try {
  const [requestResponse, receiptResponse, glbResponse] = await Promise.all([
    fetch("/fixture/forge-request.json"),
    fetch("/fixture/rts-northpole-guard.glb.receipt.json"),
    fetch("/fixture/rts-northpole-guard.glb")
  ]);
  if (![requestResponse, receiptResponse, glbResponse].every(response => response.ok)) throw new Error("fixture fetch failed");
  const request = await requestResponse.json();
  const receipt = await receiptResponse.json();
  const glb = new Uint8Array(await glbResponse.arrayBuffer());

  const admission = await admitVerifiedForgeGlb({ request, deliveryReceipt: receipt, glbBytes: glb });
  const loader = new GLTFLoader();
  let parseCalls = 0;
  const realized = await realizeAdmittedForgeGlb({
    admission,
    glbBytes: glb,
    parse: buffer => new Promise((resolveParse, rejectParse) => {
      parseCalls += 1;
      loader.parse(buffer, "", resolveParse, rejectParse);
    })
  });

  const scene = new THREE.Scene();
  scene.background = new THREE.Color(0x20242a);
  scene.add(realized.scene);
  scene.add(new THREE.HemisphereLight(0xffffff, 0x222233, 3));
  const camera = new THREE.PerspectiveCamera(50, 320 / 240, 0.01, 100);
  camera.position.set(3, 2.5, 4);
  camera.lookAt(0, 0.9, 0);
  const box = new THREE.Box3().setFromObject(realized.scene);
  const size = new THREE.Vector3();
  box.getSize(size);
  if (![size.x, size.y, size.z].every(Number.isFinite) || size.lengthSq() <= 0) throw new Error("loaded GLB has no finite nonzero bounds");

  const renderer = new THREE.WebGLRenderer({ canvas: document.querySelector("#view"), antialias: false });
  renderer.setSize(320, 240, false);
  renderer.render(scene, camera);
  const info = renderer.info.render;
  if (info.calls < 1 || info.triangles < 1) throw new Error("Three.js renderer drew no geometry");

  window.__AXM_FORGE_GLB_PROOF__ = {
    status: "PASS",
    parseCalls,
    assetId: admission.request.asset_id,
    glbSha256: admission.glb.sha256,
    admissionSha256: admission.admission_sha256,
    embeddedImages: admission.glb.embedded_images,
    meshCount: realized.evidence.mesh_count,
    renderCalls: info.calls,
    triangles: info.triangles,
    bounds: [size.x, size.y, size.z],
    consumerAuthority: admission.authority,
    realizationAuthority: realized.evidence.authority,
    renderGraphMutationPerformedByHost: true
  };
} catch (error) {
  window.__AXM_FORGE_GLB_PROOF__ = { status: "FAIL", error: String(error?.stack || error) };
}
</script></body></html>`;

const server = createServer(async (request, response) => {
  try {
    const url = new URL(request.url, "http://127.0.0.1");
    if (url.pathname === "/proof") {
      response.writeHead(200, { "content-type": "text/html", "cache-control": "no-store" });
      response.end(proofHtml);
      return;
    }
    let file;
    if (url.pathname.startsWith("/fixture/")) {
      const relative = url.pathname.slice("/fixture/".length);
      file = resolve(fixtureDir, relative);
      if (file !== fixtureDir && !file.startsWith(fixtureDir + sep)) throw new Error("unsafe fixture path");
    } else {
      file = resolve(root, "." + url.pathname);
      if (file !== root && !file.startsWith(root + sep)) throw new Error("unsafe repository path");
    }
    if (!(await stat(file)).isFile()) throw new Error("not a file");
    response.writeHead(200, { "content-type": types.get(extension(file)) || "application/octet-stream", "cache-control": "no-store" });
    response.end(await readFile(file));
  } catch {
    response.writeHead(404, { "content-type": "text/plain" });
    response.end("not found");
  }
});

await new Promise(resolveListen => server.listen(0, "127.0.0.1", resolveListen));
const address = server.address();
const browser = await chromium.launch({ headless: true });
const page = await browser.newPage({ viewport: { width: 640, height: 480 } });
const pageErrors = [];
const consoleErrors = [];
page.on("pageerror", error => pageErrors.push(String(error)));
page.on("console", message => { if (message.type() === "error") consoleErrors.push(message.text()); });

try {
  await page.goto(`http://127.0.0.1:${address.port}/proof`, { waitUntil: "load" });
  await page.waitForFunction(() => ["PASS", "FAIL"].includes(window.__AXM_FORGE_GLB_PROOF__?.status), null, { timeout: 30000 });
  const result = await page.evaluate(() => window.__AXM_FORGE_GLB_PROOF__);
  if (result.status !== "PASS") throw new Error(result.error || "browser proof failed");
  if (result.parseCalls !== 1) throw new Error(`expected one explicit GLTFLoader parse, got ${result.parseCalls}`);
  if (result.assetId !== "rts-northpole-guard") throw new Error(`unexpected asset ${result.assetId}`);
  if (result.meshCount < 1 || result.renderCalls < 1 || result.triangles < 1) throw new Error("renderer evidence is incomplete");
  if (result.consumerAuthority.render_graph_mutation !== false || result.consumerAuthority.canonical_game_state_mutation !== false) throw new Error("consumer authority widened");
  if (result.realizationAuthority.render_graph_mutation !== false || result.realizationAuthority.canonical_game_state_mutation !== false) throw new Error("realization authority widened");
  if (pageErrors.length || consoleErrors.length) throw new Error(`browser errors: ${JSON.stringify({ pageErrors, consoleErrors })}`);
  console.log(JSON.stringify({ ...result, pageErrors, consoleErrors }, null, 2));
} finally {
  await browser.close();
  await new Promise(resolveClose => server.close(resolveClose));
}
