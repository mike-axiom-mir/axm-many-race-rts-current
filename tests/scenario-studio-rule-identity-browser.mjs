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
  const page = await browser.newPage({ viewport: { width: 1440, height: 1050 } });
  const pageErrors = [];
  const consoleErrors = [];
  page.on("pageerror", error => pageErrors.push(String(error)));
  page.on("console", message => { if (message.type() === "error") consoleErrors.push(message.text()); });

  await page.goto("http://127.0.0.1:4173/scenario.html", { waitUntil: "networkidle" });
  await page.locator("#addGlobalRuleBtn").waitFor({ state: "visible" });
  await assert.doesNotReject(() => page.locator("#validation").getByText("Runtime rule IDs unique").waitFor());

  await page.locator("#addGlobalRuleBtn").click();
  await page.locator("#addGlobalRuleBtn").click();
  let cards = page.locator("#globalRules .rule-card");
  assert.equal(await cards.count(), 2);
  assert.deepEqual(await cards.locator('[data-r="id"]').evaluateAll(inputs => inputs.map(input => input.value)), ["rule-1", "rule-2"]);

  await cards.nth(0).locator(".rule-remove").click();
  await page.locator("#addGlobalRuleBtn").click();
  cards = page.locator("#globalRules .rule-card");
  assert.deepEqual(await cards.locator('[data-r="id"]').evaluateAll(inputs => inputs.map(input => input.value)), ["rule-2", "rule-1"]);

  const newId = cards.nth(1).locator('[data-r="id"]');
  await newId.fill("rule-2");
  await newId.dispatchEvent("change");
  await page.locator("#validation").getByText("Runtime rule identity held").waitFor();
  await page.locator("#validation").getByText(/Runtime rule ID collision: rule-2/).waitFor();

  let blockedDownload = false;
  const blockedDownloadHandler = () => { blockedDownload = true; };
  page.on("download", blockedDownloadHandler);
  await page.locator("#exportBtn").click();
  await page.waitForTimeout(250);
  page.off("download", blockedDownloadHandler);
  assert.equal(blockedDownload, false);
  assert.match(await page.locator("#hint").textContent(), /HELD .* duplicate runtime ID rule-2 .* fix before export/);

  await page.screenshot({ path: `${output}/scenario-rule-identity-held-desktop.png`, fullPage: true });

  await newId.fill("rule-1");
  await newId.dispatchEvent("change");
  await page.locator("#validation").getByText("Runtime rule IDs unique").waitFor();
  const downloadPromise = page.waitForEvent("download");
  await page.locator("#exportBtn").click();
  const download = await downloadPromise;
  assert.match(download.suggestedFilename(), /\.axm-map\.json$/);

  await page.setViewportSize({ width: 390, height: 844 });
  const horizontalOverflow = await page.evaluate(() => document.documentElement.scrollWidth > document.documentElement.clientWidth + 1);
  assert.equal(horizontalOverflow, false);
  await page.screenshot({ path: `${output}/scenario-rule-identity-mobile.png`, fullPage: true });

  assert.deepEqual(pageErrors, []);
  assert.deepEqual(consoleErrors, []);
} finally {
  await browser?.close();
  server.kill("SIGTERM");
}
