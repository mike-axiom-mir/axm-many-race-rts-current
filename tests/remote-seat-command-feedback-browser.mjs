import { createServer } from "node:http";
import { mkdir, readFile } from "node:fs/promises";
import { createRequire } from "node:module";
import { dirname, join, resolve, sep } from "node:path";
import { fileURLToPath, pathToFileURL } from "node:url";

const here = dirname(fileURLToPath(import.meta.url));
const repoRoot = resolve(here, "..");
const srcRoot = resolve(repoRoot, "src");
const modulesRoot = process.env.AXM_BRIDGE_NODE_MODULES;
if (!modulesRoot) throw new Error("AXM_BRIDGE_NODE_MODULES is required");

const require = createRequire(import.meta.url);
const playwrightEntry = require.resolve("playwright", { paths: [modulesRoot] });
const playwrightModule = await import(pathToFileURL(playwrightEntry).href);
const playwright = playwrightModule.default || playwrightModule;
const { chromium } = playwright;
if (!chromium) throw new Error("Playwright Chromium export is unavailable");

const providerPath = join(modulesRoot, "axm-city-browser-direct", "manual_webrtc.mjs");
const threePath = join(modulesRoot, "three", "build", "three.module.js");
const threeCorePath = join(modulesRoot, "three", "build", "three.core.js");
const evidenceDir = resolve(process.env.AXM_FEEDBACK_EVIDENCE_DIR || join(repoRoot, "evidence"));
await mkdir(evidenceDir, { recursive: true });

const proofHtml = `<!doctype html>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width,initial-scale=1">
<title>AXM RTS remote seat feedback proof</title>
<style>
  html,body{margin:0;min-height:100%;background:#071019;color:#dceaf2;font-family:system-ui,sans-serif}
  main{position:relative;min-height:100vh;overflow:hidden}
  .proof-note{position:absolute;left:16px;bottom:16px;max-width:32rem;padding:10px 12px;border:1px solid rgba(160,194,216,.2);background:rgba(7,14,21,.72);font-size:12px;line-height:1.45}
</style>
<main><div class="proof-note">Exact browser-direct provider → existing RTS seat command door → ordinary in-match seat HUD acknowledgement. The HUD reports command admission only; it does not invent network identity or gameplay authority.</div></main>
<script>window.__AXM_FEEDBACK_PROOF__ = { status: "BOOT" };</script>
<script type="importmap">{"imports":{"three":"/vendor/three.mjs"}}</script>
<script type="module">
import { ManualBrowserPeer, describeBrowserDirectCapability } from "/vendor/provider.mjs";
import { createCityBrowserDirectSeatBridge, consumeBrowserDirectSeatMessage } from "/src/cityBrowserDirectSeat.js";
import { RTSWorld } from "/src/world.js";
import { createDefaultLobby, saveLobby } from "/src/seatControllers.js";

const commands = [];
const seatResults = [];
window.__AXM_FEEDBACK_PROOF__ = { status: "RUNNING" };
window.addEventListener("axm-seat-command-result", event => seatResults.push(event.detail));

try {
  const originalCommand = RTSWorld.prototype.command;
  RTSWorld.prototype.command = function proofCommand(owner, point) {
    commands.push({ owner, point: [point.x, point.y, point.z] });
  };

  const lobby = createDefaultLobby();
  lobby.seats[2].controller = "human";
  lobby.seats[2].label = "Remote Human 3";
  lobby.seats[2].ready = true;
  saveLobby(lobby);

  await import("/src/seatCommandAuthorityPatch.js?remote-seat-feedback-proof=1");
  await import("/src/multiSeatHud.js?remote-seat-feedback-proof=1");

  const world = Object.create(RTSWorld.prototype);
  world.entities = ["player", "enemy", "seat-3", "seat-4"].map(owner => ({
    parent: {},
    userData: { hp: 100, type: "capital", owner },
  }));
  world.__axmTeamByOwner = { player: 1, enemy: 2, "seat-3": 3, "seat-4": 4 };
  window.__AXM_RTS_WORLD__ = world;

  const gameId = "axm-many-race-rts";
  const build = "remote-seat-feedback-v0.1";
  const applicationSessionId = "feedback-session-001";
  const host = new ManualBrowserPeer({ gameId, build });
  const guest = new ManualBrowserPeer({ gameId, build });

  const offer = await host.createOffer();
  const answer = await guest.acceptOffer(offer);
  await host.acceptAnswer(answer);
  await Promise.all([host.waitForOpen(), guest.waitForOpen()]);

  const bridge = createCityBrowserDirectSeatBridge({
    providerCapability: describeBrowserDirectCapability(),
    binding: {
      gameId,
      build,
      applicationSessionId,
      seatId: "seat-3",
      dispatchSeatCommand(detail) {
        window.dispatchEvent(new CustomEvent("axm-seat-command", { detail }));
      },
    },
  });

  const firstMessage = {
    schema: "axm.rts.remote-seat-command/v0.1",
    gameId,
    build,
    applicationSessionId,
    seatId: "seat-3",
    sequence: 1,
    command: { type: "move", point: [12, 0, 8] },
  };
  const firstReceive = consumeBrowserDirectSeatMessage({ peer: host, bridge });
  guest.send(firstMessage);
  const firstReceipt = await firstReceive;
  if (seatResults.length !== 1 || seatResults[0]?.status !== "APPLIED" || seatResults[0]?.commandType !== "move") {
    throw new Error(`first command did not publish one APPLIED seat result: ${JSON.stringify(seatResults)}`);
  }

  const replayReceive = consumeBrowserDirectSeatMessage({ peer: host, bridge });
  guest.send(firstMessage);
  let replayCode = null;
  try {
    await replayReceive;
  } catch (error) {
    replayCode = error?.code || error?.name || "UNKNOWN";
  }
  if (replayCode !== "MESSAGE_HELD") throw new Error("replayed sequence did not fail closed");
  if (seatResults.length !== 1) throw new Error("bridge-held replay produced a false seat acknowledgement");

  const secondMessage = {
    ...firstMessage,
    sequence: 2,
    command: { type: "move", point: [-9, 0, 5] },
  };
  const secondReceive = consumeBrowserDirectSeatMessage({ peer: host, bridge });
  guest.send(secondMessage);
  const secondReceipt = await secondReceive;
  await new Promise(resolve => setTimeout(resolve, 650));

  const hudResult = document.querySelector('[data-seat-command-result="seat-3"]');
  if (!hudResult) throw new Error("seat-3 acknowledgement was not rendered into the real multi-seat HUD");
  if (!hudResult.textContent.includes("APPLIED") || !hudResult.textContent.includes("MOVE")) {
    throw new Error(`seat-3 HUD acknowledgement was not readable: ${hudResult.textContent}`);
  }
  if (seatResults.length !== 2 || seatResults.some(result => result.authority !== "OBSERVATION_ONLY")) {
    throw new Error(`seat result count/authority drifted: ${JSON.stringify(seatResults)}`);
  }
  if (commands.length !== 2 || commands.some(command => command.owner !== "seat-3")) {
    throw new Error(`ordinary world command witness drifted: ${JSON.stringify(commands)}`);
  }

  host.close();
  guest.close();
  RTSWorld.prototype.command = originalCommand;

  window.__AXM_FEEDBACK_PROOF__ = {
    status: "PASS",
    firstReceipt,
    secondReceipt,
    replayCode,
    commands,
    seatResults,
    finalHudText: hudResult.textContent,
    authority: "OBSERVATION_ONLY",
  };
} catch (error) {
  window.__AXM_FEEDBACK_PROOF__ = {
    status: "FAIL",
    message: error?.message || String(error),
    code: error?.code || null,
    stack: error?.stack || null,
  };
}
</script>`;

function sourcePath(pathname) {
  if (!pathname.startsWith("/src/")) return null;
  const candidate = resolve(repoRoot, `.${pathname}`);
  if (candidate !== srcRoot && !candidate.startsWith(`${srcRoot}${sep}`)) return null;
  return candidate;
}

const server = createServer(async (request, response) => {
  try {
    const pathname = new URL(request.url, "http://127.0.0.1").pathname;
    if (pathname === "/") {
      response.writeHead(200, { "content-type": "text/html; charset=utf-8", "cache-control": "no-store" });
      response.end(proofHtml);
      return;
    }
    let path = null;
    if (pathname === "/vendor/provider.mjs") path = providerPath;
    else if (pathname === "/vendor/three.mjs") path = threePath;
    else if (pathname === "/vendor/three.core.js") path = threeCorePath;
    else path = sourcePath(pathname);
    if (!path) {
      response.writeHead(404, { "content-type": "text/plain" });
      response.end("not found");
      return;
    }
    const content = await readFile(path);
    response.writeHead(200, { "content-type": "text/javascript; charset=utf-8", "cache-control": "no-store" });
    response.end(content);
  } catch (error) {
    response.writeHead(500, { "content-type": "text/plain" });
    response.end(error?.stack || String(error));
  }
});

await new Promise((resolveListen, rejectListen) => {
  server.once("error", rejectListen);
  server.listen(0, "127.0.0.1", resolveListen);
});
const address = server.address();
const baseUrl = `http://127.0.0.1:${address.port}`;
const browser = await chromium.launch({ headless: true });
const page = await browser.newPage({ viewport: { width: 1280, height: 720 } });
const pageErrors = [];
const consoleErrors = [];
const failedRequests = [];
page.on("pageerror", error => pageErrors.push(error.message));
page.on("console", entry => { if (entry.type() === "error") consoleErrors.push(entry.text()); });
page.on("requestfailed", request => failedRequests.push(`${request.method()} ${request.url()} ${request.failure()?.errorText || "failed"}`));

try {
  await page.goto(baseUrl, { waitUntil: "load" });
  await page.waitForFunction(() => ["PASS", "FAIL"].includes(globalThis.__AXM_FEEDBACK_PROOF__?.status), null, { timeout: 30000 });
  const proof = await page.evaluate(() => globalThis.__AXM_FEEDBACK_PROOF__);
  if (proof?.status !== "PASS") throw new Error(`browser proof failed: ${JSON.stringify(proof)}`);
  if (pageErrors.length) throw new Error(`page errors: ${JSON.stringify(pageErrors)}`);
  if (consoleErrors.length) throw new Error(`console errors: ${JSON.stringify(consoleErrors)}`);
  if (failedRequests.length) throw new Error(`failed requests: ${JSON.stringify(failedRequests)}`);

  const desktop = await page.evaluate(() => ({
    innerWidth,
    scrollWidth: document.documentElement.scrollWidth,
    text: document.querySelector('[data-seat-command-result="seat-3"]')?.textContent || null,
  }));
  if (desktop.scrollWidth !== desktop.innerWidth) throw new Error(`desktop horizontal overflow: ${JSON.stringify(desktop)}`);
  await page.screenshot({ path: join(evidenceDir, "remote-seat-feedback-desktop.png"), fullPage: true });

  await page.setViewportSize({ width: 390, height: 844 });
  await page.waitForTimeout(150);
  const mobile = await page.evaluate(() => ({
    innerWidth,
    scrollWidth: document.documentElement.scrollWidth,
    text: document.querySelector('[data-seat-command-result="seat-3"]')?.textContent || null,
    chipWidth: document.querySelector('[data-seat-command-result="seat-3"]')?.parentElement?.getBoundingClientRect().width || 0,
  }));
  if (mobile.scrollWidth !== mobile.innerWidth) throw new Error(`mobile horizontal overflow: ${JSON.stringify(mobile)}`);
  if (!mobile.text?.includes("APPLIED") || mobile.chipWidth > mobile.innerWidth) throw new Error(`mobile acknowledgement unreadable: ${JSON.stringify(mobile)}`);
  await page.screenshot({ path: join(evidenceDir, "remote-seat-feedback-mobile.png"), fullPage: true });

  process.stdout.write(`${JSON.stringify({ ...proof, desktop, mobile, pageErrors, consoleErrors, failedRequests }, null, 2)}\n`);
} finally {
  await browser.close();
  await new Promise(resolveClose => server.close(resolveClose));
}
