import { expect, test } from "@playwright/test";

test("army doctrine reports acceptance, progress, keyboard parity, and a clean render", async ({ page }) => {
  const failures = [];
  page.on("pageerror", error => failures.push(`pageerror: ${error.message}`));
  page.on("console", message => {
    if (message.type() === "error") failures.push(`console: ${message.text()}`);
  });
  page.on("requestfailed", request => failures.push(`request: ${request.url()} (${request.failure()?.errorText || "failed"})`));

  const response = await page.goto("/skirmish.html", { waitUntil: "networkidle" });
  expect(response?.ok()).toBe(true);
  await page.locator("#factionCards .faction-card").first().click();

  const feedback = page.locator("#armyOrderFeedback");
  await expect(feedback).toBeVisible();
  await expect(page.locator("#armyOrderPhase")).toHaveText("STANDING BY");

  await page.locator('[data-command="attack"]').click();
  await expect(page.locator('[data-command="attack"]')).toHaveAttribute("aria-pressed", "true");
  await expect(page.locator("#armyOrderName")).toHaveText("Push enemy capital");
  await expect(page.locator("#armyOrderPhase")).toHaveText(/ADVANCING|HOLDING/);
  await expect(page.locator("#armyOrderProgress")).toHaveAttribute("aria-valuenow", /\d+/);
  await expect(page.locator("#armyOrderAnnouncement")).toContainText(/accepted by \d+ formation/);

  await page.keyboard.press("1");
  await expect(page.locator('[data-command="defend"]')).toHaveAttribute("aria-pressed", "true");
  await expect(page.locator('[data-command="attack"]')).toHaveAttribute("aria-pressed", "false");
  await expect(page.locator("#armyOrderName")).toHaveText("Defend homeland");

  await page.screenshot({ path: "test-results/experience-evidence/army-order-feedback.png", fullPage: true });
  expect(failures, failures.join("\n")).toEqual([]);
});
