import assert from "node:assert/strict";
import { mkdir } from "node:fs/promises";
import { spawn } from "node:child_process";
import { chromium } from "playwright";

const root = new URL("../", import.meta.url).pathname;
const output = new URL("../test-results/", import.meta.url).pathname;
await mkdir(output, { recursive: true });

const server = spawn("python3", ["-m", "http.server", "4173", "--bind", "127.0.0.1"], {
  cwd: root,
  stdio: ["ignore", "pipe", "pipe"]
});

async function waitForServer() {
  for (let attempt = 0; attempt < 50; attempt++) {
    try {
      const response = await fetch("http://127.0.0.1:4173/scenario.html");
      if (response.ok) return;
    } catch {}
    await new Promise(resolve => setTimeout(resolve, 100));
  }
  throw new Error("Scenario Studio server did not become ready.");
}

let browser;
try {
  await waitForServer();
  browser = await chromium.launch({ headless: true });
  const page = await browser.newPage({ viewport: { width: 390, height: 844 } });
  const pageErrors = [];
  const consoleErrors = [];
  page.on("pageerror", error => pageErrors.push(String(error)));
  page.on("console", message => { if (message.type() === "error") consoleErrors.push(message.text()); });

  await page.goto("http://127.0.0.1:4173/scenario.html", { waitUntil: "networkidle" });
  await page.locator("#mobileWorkspace").waitFor({ state: "visible" });
  await page.locator("#authorPanel").waitFor({ state: "visible" });
  assert.equal(await page.locator("#contentPanel").isVisible(), false);
  assert.equal(await page.locator('[data-mobile-pane="author"]').getAttribute("aria-pressed"), "true");

  const targetHeights = await page.locator("#mobileWorkspace button").evaluateAll(buttons =>
    buttons.map(button => button.getBoundingClientRect().height)
  );
  assert.ok(targetHeights.every(height => height >= 44), `phone workspace target below 44px: ${targetHeights.join(", ")}`);

  await page.locator('[data-mobile-pane="content"]').click();
  await page.locator("#contentPanel").waitFor({ state: "visible" });
  assert.equal(await page.locator("#authorPanel").isVisible(), false);
  assert.equal(await page.locator('[data-mobile-pane="content"]').getAttribute("aria-pressed"), "true");

  const contentBox = await page.locator("#contentPanel").boundingBox();
  const dockBox = await page.locator("#mobileWorkspace").boundingBox();
  assert.ok(contentBox && dockBox);
  assert.ok(contentBox.y + contentBox.height <= dockBox.y + 1, "content pane must not cover the phone workspace dock");

  await page.locator("#addGlobalRuleBtn").click();
  await page.locator("#addGlobalRuleBtn").click();
  let cards = page.locator("#globalRules .rule-card");
  assert.equal(await cards.count(), 2);
  const secondId = cards.nth(1).locator('[data-r="id"]');
  await secondId.fill("rule-1");
  await secondId.dispatchEvent("change");
  await page.locator("#validation").getByText("Runtime rule identity held").waitFor();
  await page.locator("#validation").getByText(/Runtime rule ID collision: rule-1/).waitFor();

  let blockedDownload = false;
  const blockedDownloadHandler = () => { blockedDownload = true; };
  page.on("download", blockedDownloadHandler);
  await page.locator("#exportBtn").click();
  await page.waitForTimeout(150);
  page.off("download", blockedDownloadHandler);
  assert.equal(blockedDownload, false);
  assert.match(await page.locator("#hint").textContent(), /HELD .* duplicate runtime ID rule-1 .* fix before export/);

  const contentOverflow = await page.evaluate(() => document.documentElement.scrollWidth - document.documentElement.clientWidth);
  assert.ok(contentOverflow <= 1, `content pane horizontal overflow: ${contentOverflow}px`);
  await page.screenshot({ path: `${output}/scenario-mobile-content-held.png`, fullPage: true });

  await secondId.fill("rule-2");
  await secondId.dispatchEvent("change");
  await page.locator("#validation").getByText("Runtime rule IDs unique").waitFor();
  const downloadPromise = page.waitForEvent("download");
  await page.locator("#exportBtn").click();
  const download = await downloadPromise;
  assert.match(download.suggestedFilename(), /\.axm-map\.json$/);

  const contentButton = page.locator('[data-mobile-pane="content"]');
  await contentButton.focus();
  await contentButton.press("Home");
  assert.equal(await page.locator('[data-mobile-pane="world"]').getAttribute("aria-pressed"), "true");
  assert.equal(await page.locator("#authorPanel").isVisible(), false);
  assert.equal(await page.locator("#contentPanel").isVisible(), false);
  assert.equal(await page.locator("#viewport canvas").isVisible(), true);
  await page.screenshot({ path: `${output}/scenario-mobile-world.png`, fullPage: true });

  await page.locator('[data-mobile-pane="world"]').press("ArrowRight");
  assert.equal(await page.locator('[data-mobile-pane="author"]').getAttribute("aria-pressed"), "true");
  await page.locator("#authorPanel").waitFor({ state: "visible" });
  assert.equal(await page.locator("#contentPanel").isVisible(), false);

  const authorOverflow = await page.evaluate(() => document.documentElement.scrollWidth - document.documentElement.clientWidth);
  assert.ok(authorOverflow <= 1, `author pane horizontal overflow: ${authorOverflow}px`);

  await page.setViewportSize({ width: 1440, height: 1050 });
  assert.equal(await page.locator("#mobileWorkspace").isVisible(), false);
  await page.locator("#authorPanel").waitFor({ state: "visible" });
  await page.locator("#contentPanel").waitFor({ state: "visible" });
  await page.screenshot({ path: `${output}/scenario-mobile-workspace-desktop-baseline.png`, fullPage: true });

  assert.deepEqual(pageErrors, []);
  assert.deepEqual(consoleErrors, []);
  console.log(JSON.stringify({
    status: "PASS",
    phoneViewport: "390x844",
    panesExercised: ["author", "content", "world"],
    ruleIdentityHoldAndRepair: true,
    minimumDockTargetPx: Math.min(...targetHeights),
    phoneHorizontalOverflowPx: Math.max(contentOverflow, authorOverflow),
    desktopPanelsRestored: true,
    pageErrors: pageErrors.length,
    consoleErrors: consoleErrors.length
  }));
} finally {
  await browser?.close();
  server.kill("SIGTERM");
}
