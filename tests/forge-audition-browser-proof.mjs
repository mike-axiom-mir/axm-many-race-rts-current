import { chromium } from "playwright";
import { createHash } from "node:crypto";
import { readFile, writeFile } from "node:fs/promises";
import path from "node:path";

const fixtureDir = process.env.AXM_FORGE_GLB_FIXTURE_DIR;
if (!fixtureDir) throw new Error("AXM_FORGE_GLB_FIXTURE_DIR is required");
const baseUrl = process.env.AXM_FORGE_AUDITION_URL || "http://127.0.0.1:4173/forge-audition.html";
const requestPath = path.join(fixtureDir, "forge-request.json");
const receiptPath = path.join(fixtureDir, "rts-northpole-guard.glb.receipt.json");
const glbPath = path.join(fixtureDir, "rts-northpole-guard.glb");
const outDir = process.env.AXM_FORGE_AUDITION_EVIDENCE_DIR || fixtureDir;

const screenshotDigest = async file => `sha256:${createHash("sha256").update(await readFile(file)).digest("hex")}`;

async function installThreeRoute(page) {
  await page.route("https://cdn.jsdelivr.net/npm/three@0.180.0/**", async route => {
    const url = new URL(route.request().url());
    const marker = "/npm/three@0.180.0/";
    const offset = url.pathname.indexOf(marker);
    if (offset < 0) return route.abort();
    const relative = decodeURIComponent(url.pathname.slice(offset + marker.length));
    const local = path.join(process.cwd(), "node_modules", "three", relative);
    try {
      await readFile(local);
      await route.fulfill({ path: local, contentType: "text/javascript; charset=utf-8" });
    } catch {
      await route.abort();
    }
  });
}

function observe(page, evidence) {
  page.on("pageerror", error => evidence.pageErrors.push(error.message));
  page.on("console", message => { if (message.type() === "error") evidence.consoleErrors.push(message.text()); });
  page.on("requestfailed", request => evidence.failedRequests.push(`${request.method()} ${request.url()} :: ${request.failure()?.errorText || "failed"}`));
}

async function setFiles(page, receipt = receiptPath) {
  await page.locator("#requestFile").setInputFiles(requestPath);
  await page.locator("#receiptFile").setInputFiles(receipt);
  await page.locator("#glbFile").setInputFiles(glbPath);
}

async function renderJourney(page) {
  await setFiles(page);
  await page.locator("#verifyButton").click();
  await page.locator('#renderState[data-state="rendered"]').waitFor({ timeout: 15000 });
  if (!(await page.locator("#stageEmpty").isHidden())) throw new Error("pre-render guidance remained visible over verified asset");
  const commandHeight = Number.parseInt(await page.locator("#screenMetric").textContent(), 10);
  await page.locator('[data-view="distant"]').click();
  await page.waitForTimeout(120);
  const distantHeight = Number.parseInt(await page.locator("#screenMetric").textContent(), 10);
  if (!(Number.isFinite(commandHeight) && Number.isFinite(distantHeight) && commandHeight > distantHeight && distantHeight > 0)) {
    throw new Error(`expected command apparent height > distant apparent height > 0, got ${commandHeight}/${distantHeight}`);
  }
  await page.locator("#wireButton").click();
  if (await page.locator("#wireButton").getAttribute("aria-pressed") !== "true") throw new Error("wireframe control did not expose pressed state");
  await page.locator("#resetButton").click();
  await page.waitForTimeout(80);
  return { commandHeight, distantHeight };
}

const evidence = {
  status: "PENDING",
  assetId: null,
  requestedHeight: null,
  renderedBounds: null,
  meshCount: null,
  commandApparentHeightPx: null,
  distantApparentHeightPx: null,
  desktopScrollWidth: null,
  desktopViewportWidth: null,
  mobileScrollWidth: null,
  mobileViewportWidth: null,
  mobileMinInteractiveHeight: null,
  mobileHeldRecovered: false,
  glbSha256: null,
  routedPinnedThreeRequests: 0,
  externalNetworkUsed: false,
  pageErrors: [],
  consoleErrors: [],
  failedRequests: [],
  screenshots: {}
};

const browser = await chromium.launch({ headless: true });
try {
  const desktop = await browser.newPage({ viewport: { width: 1365, height: 900 }, deviceScaleFactor: 1 });
  observe(desktop, evidence);
  await installThreeRoute(desktop);
  desktop.on("request", request => { if (request.url().startsWith("https://cdn.jsdelivr.net/npm/three@0.180.0/")) evidence.routedPinnedThreeRequests += 1; });
  await desktop.goto(baseUrl, { waitUntil: "networkidle" });
  const desktopHeights = await renderJourney(desktop);
  evidence.commandApparentHeightPx = desktopHeights.commandHeight;
  evidence.distantApparentHeightPx = desktopHeights.distantHeight;
  evidence.assetId = (await desktop.locator("#assetMetric").textContent()).trim();
  evidence.requestedHeight = (await desktop.locator("#requestedMetric").textContent()).trim();
  evidence.renderedBounds = (await desktop.locator("#boundsMetric").textContent()).trim();
  evidence.meshCount = Number.parseInt(await desktop.locator("#meshMetric").textContent(), 10);
  evidence.glbSha256 = (await desktop.locator("#digestMetric").textContent()).trim();
  evidence.desktopScrollWidth = await desktop.evaluate(() => document.documentElement.scrollWidth);
  evidence.desktopViewportWidth = await desktop.evaluate(() => window.innerWidth);
  const desktopShot = path.join(outDir, "forge-audition-desktop-command.png");
  await desktop.screenshot({ path: desktopShot, fullPage: true });
  evidence.screenshots.desktop = { file: path.basename(desktopShot), sha256: await screenshotDigest(desktopShot) };

  const mobile = await browser.newPage({ viewport: { width: 390, height: 844 }, deviceScaleFactor: 1 });
  observe(mobile, evidence);
  await installThreeRoute(mobile);
  mobile.on("request", request => { if (request.url().startsWith("https://cdn.jsdelivr.net/npm/three@0.180.0/")) evidence.routedPinnedThreeRequests += 1; });
  await mobile.goto(baseUrl, { waitUntil: "networkidle" });

  const validReceipt = JSON.parse(await readFile(receiptPath, "utf8"));
  const invalidReceipt = structuredClone(validReceipt);
  invalidReceipt.delivery.sha256 = `sha256:${"0".repeat(64)}`;
  const invalidReceiptPath = path.join(outDir, "held-receipt.json");
  await writeFile(invalidReceiptPath, `${JSON.stringify(invalidReceipt, null, 2)}\n`);
  await setFiles(mobile, invalidReceiptPath);
  await mobile.locator("#verifyButton").click();
  await mobile.locator('#renderState[data-state="held"]').waitFor({ timeout: 10000 });
  const heldText = await mobile.locator("#statusMessage").textContent();
  if (!heldText.includes("delivery SHA-256 differs")) throw new Error(`held state did not explain content mismatch: ${heldText}`);
  const heldShot = path.join(outDir, "forge-audition-mobile-held.png");
  await mobile.screenshot({ path: heldShot, fullPage: true });
  evidence.screenshots.mobileHeld = { file: path.basename(heldShot), sha256: await screenshotDigest(heldShot) };

  await mobile.locator("#receiptFile").setInputFiles(receiptPath);
  await mobile.locator("#verifyButton").click();
  await mobile.locator('#renderState[data-state="rendered"]').waitFor({ timeout: 15000 });
  if (!(await mobile.locator("#stageEmpty").isHidden())) throw new Error("mobile pre-render guidance remained visible after recovery");
  evidence.mobileHeldRecovered = true;
  evidence.mobileScrollWidth = await mobile.evaluate(() => document.documentElement.scrollWidth);
  evidence.mobileViewportWidth = await mobile.evaluate(() => window.innerWidth);
  evidence.mobileMinInteractiveHeight = await mobile.locator("button:visible, .file-control:visible").evaluateAll(nodes => Math.min(...nodes.map(node => node.getBoundingClientRect().height)));
  const mobileShot = path.join(outDir, "forge-audition-mobile-rendered.png");
  await mobile.screenshot({ path: mobileShot, fullPage: true });
  evidence.screenshots.mobileRendered = { file: path.basename(mobileShot), sha256: await screenshotDigest(mobileShot) };

  if (evidence.assetId !== "rts-northpole-guard") throw new Error(`unexpected asset identity ${evidence.assetId}`);
  if (evidence.requestedHeight !== "1.82 m") throw new Error(`unexpected requested height ${evidence.requestedHeight}`);
  if (!(evidence.meshCount >= 1)) throw new Error("no rendered mesh reported");
  if (evidence.desktopScrollWidth !== evidence.desktopViewportWidth) throw new Error("desktop horizontal overflow detected");
  if (evidence.mobileScrollWidth !== evidence.mobileViewportWidth) throw new Error("mobile horizontal overflow detected");
  if (evidence.mobileMinInteractiveHeight < 44) throw new Error(`mobile target below 44px: ${evidence.mobileMinInteractiveHeight}`);
  if (evidence.pageErrors.length || evidence.consoleErrors.length || evidence.failedRequests.length) throw new Error("browser runtime errors were observed");
  if (evidence.routedPinnedThreeRequests < 2) throw new Error("pinned Three.js route was not exercised");
  evidence.status = "PASS";
} finally {
  await browser.close();
}

console.log(JSON.stringify(evidence, null, 2));
