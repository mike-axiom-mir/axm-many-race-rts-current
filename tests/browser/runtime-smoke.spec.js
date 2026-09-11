import { expect, test } from "@playwright/test";

function captureRuntimeFailures(page) {
  const failures = [];
  page.on("pageerror", error => failures.push(`pageerror: ${error.message}`));
  page.on("console", message => {
    if (message.type() === "error") failures.push(`console: ${message.text()}`);
  });
  page.on("requestfailed", request => {
    failures.push(`request: ${request.url()} (${request.failure()?.errorText || "failed"})`);
  });
  return failures;
}

async function open(page, path) {
  if (process.env.AXM_THREE_MODULE_PATH) {
    await page.route("https://cdn.jsdelivr.net/npm/three@0.180.0/build/three.module.js", route => route.fulfill({
      path: process.env.AXM_THREE_MODULE_PATH,
      contentType: "text/javascript"
    }));
  }
  const response = await page.goto(path, { waitUntil: "networkidle" });
  expect(response, `${path} returned no document response`).not.toBeNull();
  expect(response.ok(), `${path} returned HTTP ${response.status()}`).toBe(true);
}

function expectClean(failures) {
  expect(failures, failures.join("\n")).toEqual([]);
}

test("front door reaches a materialized four-seat lobby", async ({ page }) => {
  const failures = captureRuntimeFailures(page);
  await open(page, "/index.html");
  await expect(page.getByRole("heading", { name: "Many-Race RTS" })).toBeVisible();
  expect(await page.locator(".menu-card").count()).toBeGreaterThanOrEqual(10);

  await page.locator('a[href="./lobby.html"]').first().click();
  await page.waitForLoadState("networkidle");
  await expect(page.locator("#seatList .seat")).toHaveCount(4);
  await expect(page.locator("#validation")).toContainText("Lobby contract valid");
  await expect(page.locator("#launchBtn")).toHaveAttribute("href", "./skirmish.html");
  expectClean(failures);
});

test("flat skirmish renders and starts a faction", async ({ page }) => {
  const failures = captureRuntimeFailures(page);
  await open(page, "/skirmish.html");
  await expect(page.locator("#viewport canvas")).toBeVisible();
  expect(await page.locator("#factionCards .faction-card").count()).toBeGreaterThanOrEqual(4);

  await page.locator("#factionCards .faction-card").first().click();
  await expect(page.locator("#startScreen")).toHaveClass(/hidden/);
  await expect(page.locator("#leftHud")).not.toHaveClass(/hidden/);
  await expect(page.locator("#rightHud")).not.toHaveClass(/hidden/);
  await expect(page.locator("#factionName")).not.toHaveText("");
  await expect(page.locator("#resources > *")).toHaveCount(4);
  expectClean(failures);
});

test("phone skirmish keeps the battlefield and both command surfaces reachable", async ({ page }) => {
  const failures = captureRuntimeFailures(page);
  await page.setViewportSize({ width: 390, height: 844 });
  await open(page, "/skirmish.html");
  await expect(page.locator("#mobileHudNav")).not.toBeVisible();
  await page.locator("#factionCards .faction-card").first().click();

  const nav = page.locator("#mobileHudNav");
  await expect(nav).toBeVisible();
  await expect(nav.locator('[data-mobile-view="field"]')).toHaveAttribute("aria-pressed", "true");
  await expect(page.locator("#leftHud")).not.toBeVisible();
  await expect(page.locator("#rightHud")).not.toBeVisible();

  await nav.locator('[data-mobile-view="economy"]').click();
  await expect(page.locator("#leftHud")).toBeVisible();
  await expect(page.locator("#resources > *")).toHaveCount(4);

  await nav.locator('[data-mobile-view="strategy"]').click();
  await expect(page.locator("#leftHud")).not.toBeVisible();
  await expect(page.locator("#rightHud")).toBeVisible();
  await expect(page.locator("#strategyState > *")).not.toHaveCount(0);
  const panelBox = await page.locator("#rightHud").boundingBox();
  const navBox = await nav.boundingBox();
  expect(panelBox.y + panelBox.height).toBeLessThanOrEqual(navBox.y);

  await nav.locator('[data-mobile-view="strategy"]').focus();
  await page.keyboard.press("Home");
  await expect(nav.locator('[data-mobile-view="field"]')).toBeFocused();
  await expect(nav.locator('[data-mobile-view="field"]')).toHaveAttribute("aria-pressed", "true");
  await page.keyboard.press("ArrowRight");
  await expect(nav.locator('[data-mobile-view="economy"]')).toBeFocused();
  await expect(page.locator("#leftHud")).toBeVisible();

  await page.keyboard.press("Escape");
  await expect(nav.locator('[data-mobile-view="field"]')).toHaveAttribute("aria-pressed", "true");
  await expect(page.locator("#leftHud")).not.toBeVisible();
  await expect(page.locator("#rightHud")).not.toBeVisible();
  expect(await page.evaluate(() => document.documentElement.scrollWidth)).toBe(390);
  expectClean(failures);
});

test("globe conquest renders and starts a spherical match", async ({ page }) => {
  const failures = captureRuntimeFailures(page);
  await open(page, "/globe.html");
  await expect(page.locator("#viewport canvas")).toBeVisible();
  expect(await page.locator("#factionCards .faction-card").count()).toBeGreaterThanOrEqual(4);

  await page.locator("#factionCards .faction-card").first().click();
  await expect(page.locator("#startScreen")).toHaveClass(/hidden/);
  await expect(page.locator("#leftHud")).not.toHaveClass(/hidden/);
  await expect(page.locator("#rightHud")).not.toHaveClass(/hidden/);
  await expect(page.locator("#siteList > *")).toHaveCount(5);
  expectClean(failures);
});

test("map and scenario authoring surfaces render and switch modes", async ({ page }) => {
  const failures = captureRuntimeFailures(page);
  await open(page, "/builder.html");
  await expect(page.locator("#viewport canvas")).toBeVisible();
  await expect(page.locator("#projectionBadge")).toHaveText("FLAT MAP");
  await page.locator('[data-projection="globe"]').click();
  await expect(page.locator("#projectionBadge")).toHaveText("GLOBE MAP");

  await open(page, "/scenario.html");
  await expect(page.locator("#viewport canvas")).toBeVisible();
  await expect(page.locator("#mapBadge")).toHaveText("FLAT");
  expect(await page.locator("#decorPalette button").count()).toBeGreaterThan(0);
  await page.locator('[data-mode="surface"]').click();
  await expect(page.locator("#surfacePanel")).not.toHaveClass(/hidden/);
  expect(await page.locator("#skinPalette button").count()).toBeGreaterThan(0);
  expectClean(failures);
});

test("Defend the Workshop renders and enters a live run", async ({ page }) => {
  const failures = captureRuntimeFailures(page);
  await open(page, "/defend.html");
  await expect(page.locator("#viewport canvas")).toBeVisible();
  await expect(page.locator("#seatSetup")).not.toBeEmpty();
  await expect(page.locator("#startBtn")).toBeEnabled();

  await page.locator("#startBtn").click();
  await expect(page.locator("#setup")).toHaveClass(/hidden/);
  await expect(page.locator("#leftHud")).not.toHaveClass(/hidden/);
  await expect(page.locator("#rightHud")).not.toHaveClass(/hidden/);
  await expect(page.locator("#workshopHp")).not.toHaveText("0 / 0");
  await expect(page.locator("#wavePanel")).not.toHaveClass(/hidden/);
  expectClean(failures);
});
