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

async function installVirtualGamepad(page) {
  await page.addInitScript(() => {
    const state = { buttons: Array(16).fill(0), axes: [0, 0, 0, 0], timestamp: 1 };
    const pad = {
      id: "AXM Virtual Standard Gamepad",
      index: 0,
      connected: true,
      mapping: "standard",
      get timestamp() { return state.timestamp; },
      get axes() { return [...state.axes]; },
      get buttons() {
        return state.buttons.map(value => ({
          pressed: value > 0.5,
          touched: value > 0,
          value
        }));
      },
      vibrationActuator: null
    };
    Object.defineProperty(navigator, "getGamepads", {
      configurable: true,
      value: () => [pad, null, null, null]
    });
    window.__AXM_TEST_GAMEPAD__ = {
      button(index, value) {
        state.buttons[index] = value;
        state.timestamp += 1;
      },
      axis(index, value) {
        state.axes[index] = value;
        state.timestamp += 1;
      }
    };
  });
}

async function pulse(page, button, holdMs = 90) {
  await page.evaluate(index => window.__AXM_TEST_GAMEPAD__.button(index, 1), button);
  await page.waitForTimeout(holdMs);
  await page.evaluate(index => window.__AXM_TEST_GAMEPAD__.button(index, 0), button);
  await page.waitForTimeout(holdMs);
}

test("Defend the Workshop is playable through the shared-seat gamepad macro loop", async ({ page }) => {
  const failures = captureRuntimeFailures(page);
  await installVirtualGamepad(page);
  const response = await page.goto("/defend.html", { waitUntil: "networkidle" });
  expect(response?.ok()).toBe(true);
  await expect(page.locator("#viewport canvas")).toBeVisible();
  await expect(page.locator("#controllerStatus")).toContainText("GAMEPAD · CONNECTED");

  const secondSeatController = page.locator("#seatSetup .seat-card").nth(1).locator("select").first();
  await secondSeatController.selectOption("human");
  await expect(page.locator("#setupValidation")).toContainText("2 allied seats ready");

  await pulse(page, 0); // A: start from setup.
  await expect(page.locator("#setup")).toHaveClass(/hidden/);
  await expect(page.locator("#activeSeat option")).toHaveCount(2);
  await expect(page.locator("#wavePanel")).not.toHaveClass(/hidden/);

  await pulse(page, 5); // RB: shared-screen active seat selector.
  await expect(page.locator("#activeSeat")).toHaveValue("seat-2");
  await expect(page.locator("#controllerFeedback")).toContainText("Seat 2");

  await pulse(page, 0); // A: context action starts the waiting wave.
  await expect.poll(async () => page.evaluate(() => window.__AXM_DEFEND_WORKSHOP__?.state.waveActive)).toBe(true);

  await pulse(page, 15); // D-pad right: issue a real east macro order.
  const eastTargets = await page.evaluate(() => {
    const runtime = window.__AXM_DEFEND_WORKSHOP__;
    const active = runtime.state.activeSeatId;
    return runtime.world.entities
      .filter(entity => entity.parent && entity.userData.owner === "player" && entity.userData.seatId === active)
      .map(entity => entity.userData.target?.x)
      .filter(Number.isFinite);
  });
  expect(eastTargets.some(value => Math.abs(value - 24) < 0.001)).toBe(true);
  await expect(page.locator("#controllerFeedback")).toHaveText("Push east");

  const socketsBefore = await page.evaluate(() => window.__AXM_DEFEND_WORKSHOP__.state.usedSockets.size);
  await pulse(page, 2); // X: build through the existing authoritative UI action.
  const socketsAfter = await page.evaluate(() => window.__AXM_DEFEND_WORKSHOP__.state.usedSockets.size);
  expect(socketsAfter).toBe(socketsBefore + 1);
  await expect(page.locator("#controllerFeedback")).toContainText("Guard Tower");

  await page.screenshot({ path: "test-results/defend-controller-desktop.png", fullPage: true });

  await page.setViewportSize({ width: 390, height: 844 });
  const overflow = await page.evaluate(() => document.documentElement.scrollWidth - window.innerWidth);
  expect(overflow).toBeLessThanOrEqual(0);
  await expect(page.locator("#controllerStatus")).toBeVisible();
  await page.screenshot({ path: "test-results/defend-controller-mobile.png", fullPage: true });

  expect(failures, failures.join("\n")).toEqual([]);
});
