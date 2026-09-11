import { createServer } from "node:http";
import { readFile } from "node:fs/promises";
import { createRequire } from "node:module";
import { dirname, join, resolve } from "node:path";
import { fileURLToPath, pathToFileURL } from "node:url";

const here = dirname(fileURLToPath(import.meta.url));
const repoRoot = resolve(here, "..");
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
const sourcePaths = new Map([
  ["/src/cityBrowserDirectSeat.js", join(repoRoot, "src", "cityBrowserDirectSeat.js")],
  ["/src/world.js", join(repoRoot, "src", "world.js")],
  ["/src/canvas2dRenderer.js", join(repoRoot, "src", "canvas2dRenderer.js")],
  ["/src/seatControllers.js", join(repoRoot, "src", "seatControllers.js")],
  ["/src/seatCommandAuthorityPatch.js", join(repoRoot, "src", "seatCommandAuthorityPatch.js")],
]);

const proofHtml = `<!doctype html>
<meta charset="utf-8">
<title>AXM City browser-direct RTS seat proof</title>
<script>window.__AXM_BROWSER_PROOF__ = { status: "BOOT" };</script>
<script type="importmap">{"imports":{"three":"/vendor/three.mjs"}}</script>
<script type="module">
import { ManualBrowserPeer, describeBrowserDirectCapability } from "/vendor/provider.mjs";
import { createCityBrowserDirectSeatBridge, consumeBrowserDirectSeatMessage } from "/src/cityBrowserDirectSeat.js";
import { RTSWorld } from "/src/world.js";
import { createDefaultLobby, saveLobby } from "/src/seatControllers.js";

const commands = [];
window.__AXM_BROWSER_PROOF__ = { status: "RUNNING" };

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

  await import("/src/seatCommandAuthorityPatch.js?city-browser-direct-proof=1");
  const world = Object.create(RTSWorld.prototype);
  world.entities = [];
  world.__axmTeamByOwner = {};
  window.__AXM_RTS_WORLD__ = world;

  const gameId = "axm-many-race-rts";
  const build = "city-browser-direct-proof-v0.1";
  const applicationSessionId = "proof-session-001";
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

  let replayCode = null;
  const replayReceive = consumeBrowserDirectSeatMessage({ peer: host, bridge });
  guest.send(firstMessage);
  try {
    await replayReceive;
  } catch (error) {
    replayCode = error?.code || error?.name || "UNKNOWN";
  }

  const secondMessage = {
    ...firstMessage,
    sequence: 2,
    command: { type: "move", point: [-9, 0, 5] },
  };
  const secondReceive = consumeBrowserDirectSeatMessage({ peer: host, bridge });
  guest.send(secondMessage);
  const secondReceipt = await secondReceive;

  host.close();
  guest.close();
  RTSWorld.prototype.command = originalCommand;

  if (commands.length !== 2) throw new Error("expected exactly two commands to reach the existing RTS seat gate");
  if (commands[0].owner !== "seat-3" || JSON.stringify(commands[0].point) !== JSON.stringify([12, 0, 8])) {
    throw new Error("first remote command did not reach the bound seat-3 world command");
  }
  if (commands[1].owner !== "seat-3" || JSON.stringify(commands[1].point) !== JSON.stringify([-9, 0, 5])) {
    throw new Error("second remote command did not reach the bound seat-3 world command");
  }
  if (replayCode !== "MESSAGE_HELD") throw new Error("replayed sequence did not fail closed");
  if (firstReceipt.authority.gameplayStateMutation !== false || firstReceipt.authority.seatSelection !== false) {
    throw new Error("bridge authority widened during the real provider path");
  }
  if (firstReceipt.truth.downstreamGameplayEffectPossible !== true || firstReceipt.truth.humanIdentityAuthenticated !== false) {
    throw new Error("bridge truth boundary drifted");
  }

  window.__AXM_BROWSER_PROOF__ = {
    status: "PASS",
    provider: describeBrowserDirectCapability(),
    firstReceipt,
    secondReceipt,
    replayCode,
    commands,
    commandDoor: "axm-seat-command",
    selectedSeat: "seat-3",
  };
} catch (error) {
  window.__AXM_BROWSER_PROOF__ = {
    status: "FAIL",
    message: error?.message || String(error),
    code: error?.code || null,
    stack: error?.stack || null,
  };
}
</script>`;

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
    else path = sourcePaths.get(pathname) || null;
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
const page = await browser.newPage();
const pageErrors = [];
const consoleErrors = [];
const failedRequests = [];
page.on("pageerror", (error) => pageErrors.push(error.message));
page.on("console", (entry) => { if (entry.type() === "error") consoleErrors.push(entry.text()); });
page.on("requestfailed", (request) => failedRequests.push(`${request.method()} ${request.url()} ${request.failure()?.errorText || "failed"}`));

try {
  await page.goto(baseUrl, { waitUntil: "load" });
  try {
    await page.waitForFunction(() => ["PASS", "FAIL"].includes(globalThis.__AXM_BROWSER_PROOF__?.status), null, { timeout: 30000 });
  } catch (error) {
    throw new Error(`browser proof did not settle: ${error?.message || String(error)}; pageErrors=${JSON.stringify(pageErrors)}; consoleErrors=${JSON.stringify(consoleErrors)}; failedRequests=${JSON.stringify(failedRequests)}`);
  }
  const proof = await page.evaluate(() => globalThis.__AXM_BROWSER_PROOF__);
  if (proof?.status !== "PASS") throw new Error(`browser proof failed: ${JSON.stringify(proof)}`);
  if (pageErrors.length) throw new Error(`page errors: ${JSON.stringify(pageErrors)}`);
  if (consoleErrors.length) throw new Error(`console errors: ${JSON.stringify(consoleErrors)}`);
  if (failedRequests.length) throw new Error(`failed requests: ${JSON.stringify(failedRequests)}`);
  process.stdout.write(`${JSON.stringify({ ...proof, pageErrors, consoleErrors, failedRequests }, null, 2)}\n`);
} finally {
  await browser.close();
  await new Promise((resolveClose) => server.close(resolveClose));
}
