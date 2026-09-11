import { mkdir, writeFile } from "node:fs/promises";
import { expect, test } from "@playwright/test";

function captureRuntimeFailures(page) {
  const failures = [];
  page.on("pageerror", error => failures.push(`pageerror: ${error.message}`));
  page.on("console", message => {
    if (message.type() === "error") failures.push(`console: ${message.text()}`);
  });
  page.on("requestfailed", request => failures.push(`request: ${request.url()} (${request.failure()?.errorText || "failed"})`));
  return failures;
}

test("real observed Skirmish damage schedules local WebAudio after human activation", async ({ page }) => {
  test.setTimeout(45_000);
  const failures = captureRuntimeFailures(page);
  await mkdir("test-results/experience-evidence", { recursive: true });

  await page.addInitScript(() => {
    window.__axmImpactAudioEvents = [];
    window.addEventListener("axm:combat-impact-audio", event => {
      window.__axmImpactAudioEvents.push(event.detail);
    });
  });

  let response = await page.goto("/settings.html", { waitUntil: "networkidle" });
  expect(response?.ok()).toBe(true);
  const volume = page.locator('[data-setting="masterVolume"]');
  await volume.fill("35");
  await expect(page.locator("#masterVolumeValue")).toHaveText("35%");
  await page.locator("#saveSettings").click();
  await expect.poll(() => page.evaluate(() => JSON.parse(localStorage.getItem("axm.manyRaceRts.settings") || "{}").masterVolume)).toBe("35");
  await page.screenshot({ path: "test-results/experience-evidence/skirmish-impact-audio-settings.png", fullPage: true });

  response = await page.goto("/skirmish.html", { waitUntil: "networkidle" });
  expect(response?.ok()).toBe(true);
  await page.locator("#factionCards .faction-card").first().click();
  await page.waitForFunction(() => Boolean(window.__AXM_RTS_WORLD__));
  await page.waitForFunction(() => window.__axmCombatImpactAudioInstalled?.context?.state === "running");

  const staged = await page.evaluate(() => {
    const world = window.__AXM_RTS_WORLD__;
    const player = world.entities.find(entity => entity?.parent && entity.userData?.owner === "player" && entity.userData?.type === "squad");
    const enemy = world.entities.find(entity => entity?.parent && entity.userData?.owner === "enemy" && entity.userData?.type === "squad");
    if (!player || !enemy) throw new Error("expected starting player/enemy formations");

    player.position.set(-8.0, 0, -4.0);
    enemy.position.set(-6.55, 0, -4.0);
    player.userData.target = null;
    enemy.userData.target = null;
    player.userData.cooldown = 0;
    enemy.userData.cooldown = 999;
    world.cameraTarget.set(-7.25, 0, -4.0);
    return { enemyHp: Number(enemy.userData.hp), enemyMaxHp: Number(enemy.userData.maxHp) };
  });

  await page.waitForFunction(() => window.__axmImpactAudioEvents.some(event => event.played === true), null, { timeout: 10_000 });
  const observed = await page.evaluate(() => ({
    receipt: window.__axmImpactAudioEvents.find(event => event.played === true),
    scheduledVoices: window.__axmCombatImpactAudioInstalled?.scheduled || 0,
    activeVoices: window.__axmCombatImpactAudioInstalled?.activeVoices || 0,
    contextState: window.__axmCombatImpactAudioInstalled?.context?.state || null,
    enemyHp: Number(window.__AXM_RTS_WORLD__.entities.find(entity => entity?.parent && entity.userData?.owner === "enemy" && entity.userData?.type === "squad")?.userData?.hp),
    activeVisualEntries: window.__AXM_RTS_WORLD__?.__axmCombatDamageFeedbackFx?.entries?.length || 0,
    pageWidth: document.documentElement.scrollWidth,
    viewportWidth: window.innerWidth
  }));

  expect(observed.enemyHp).toBeLessThan(staged.enemyHp);
  expect(observed.receipt.schema).toBe("axm.rts.combat-impact-audio/v0.1");
  expect(observed.receipt.source).toBe("axm:combat-damage-feedback");
  expect(observed.receipt.targetOwner).toBe("enemy");
  expect(observed.receipt.targetType).toBe("squad");
  expect(observed.receipt.played).toBe(true);
  expect(observed.receipt.reason).toBe("observable-hit-scheduled");
  expect(observed.receipt.masterVolume).toBe(0.35);
  expect(observed.receipt.voiceCount).toBe(1);
  expect(observed.receipt.activeVoices).toBeGreaterThanOrEqual(1);
  expect(observed.receipt.activeVoices).toBeLessThanOrEqual(observed.receipt.maxActiveVoices);
  expect(observed.receipt.maxActiveVoices).toBe(8);
  expect(observed.contextState).toBe("running");
  expect(observed.receipt.contextState).toBe("running");
  expect(observed.receipt.authority).toEqual({ gameplayMutation: false, combatAttribution: false, canon: false });
  expect(observed.scheduledVoices).toBeGreaterThanOrEqual(1);
  expect(observed.activeVoices).toBeLessThanOrEqual(8);
  expect(observed.activeVisualEntries).toBeGreaterThan(0);
  expect(observed.pageWidth).toBe(observed.viewportWidth);

  await page.screenshot({ path: "test-results/experience-evidence/skirmish-impact-audio.png", fullPage: true });
  expect(failures, failures.join("\n")).toEqual([]);

  await writeFile("test-results/experience-evidence/skirmish-impact-audio.json", `${JSON.stringify({ staged, observed, runtimeFailures: failures }, null, 2)}\n`, "utf8");
});
