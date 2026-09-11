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
