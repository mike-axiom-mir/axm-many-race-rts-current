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

test("real Skirmish HP loss answers with bounded visible damage feedback", async ({ page }) => {
  test.setTimeout(45_000);
  const failures = captureRuntimeFailures(page);

  await page.addInitScript(() => {
    window.__axmDamageFeedbackEvents = [];
    window.addEventListener("axm:combat-damage-feedback", event => {
      const fx = window.__AXM_RTS_WORLD__?.__axmCombatDamageFeedbackFx;
      window.__axmDamageFeedbackEvents.push({
        detail: event.detail,
        activeAtDispatch: fx?.entries?.length || 0
      });
    });
  });

  const response = await page.goto("/skirmish.html", { waitUntil: "networkidle" });
  expect(response?.ok()).toBe(true);
  await page.locator("#factionCards .faction-card").first().click();
  await page.waitForFunction(() => Boolean(window.__AXM_RTS_WORLD__));

  const staged = await page.evaluate(() => {
    const world = window.__AXM_RTS_WORLD__;
    const player = world.entities.find(entity => entity?.parent && entity.userData?.owner === "player" && entity.userData?.type === "squad");
    const enemy = world.entities.find(entity => entity?.parent && entity.userData?.owner === "enemy" && entity.userData?.type === "squad");
    if (!player || !enemy) throw new Error("expected starting player/enemy formations");

    // Test setup only: stage the repository's real formations into visible contact.
    // The browser still relies on the shipped combat tick to author HP loss and the
    // shipped feedback observer to decide whether anything may be shown.
    player.position.set(-8.0, 0, -4.0);
    enemy.position.set(-6.55, 0, -4.0);
    player.userData.target = null;
    enemy.userData.target = null;
    player.userData.cooldown = 0;
    enemy.userData.cooldown = 999;
    world.cameraTarget.set(-7.25, 0, -4.0);

    return {
      playerHp: Number(player.userData.hp),
      enemyHp: Number(enemy.userData.hp),
      enemyMaxHp: Number(enemy.userData.maxHp)
    };
  });

  await page.waitForFunction(() => window.__axmDamageFeedbackEvents.length > 0, null, { timeout: 10_000 });
  const observed = await page.evaluate(() => window.__axmDamageFeedbackEvents[0]);
  const event = observed.detail;
  expect(observed.activeAtDispatch).toBeGreaterThan(0);
  expect(event.schema).toBe("axm.rts.visible-damage-feedback/v0.1");
  expect(event.source).toBe("observable-hp-loss");
  expect(event.targetOwner).toBe("enemy");
  expect(event.targetType).toBe("squad");
  expect(event.lethal).toBe(false);
  expect(event.impactStrength).toBeGreaterThan(0);
  expect(event.authority).toEqual({ gameplayMutation: false, combatAttribution: false, canon: false });

  const live = await page.evaluate(() => {
    const world = window.__AXM_RTS_WORLD__;
    const enemy = world.entities.find(entity => entity?.parent && entity.userData?.owner === "enemy" && entity.userData?.type === "squad");
    const fx = world.__axmCombatDamageFeedbackFx;
    const entry = fx?.entries?.[0];
    return {
      enemyHp: Number(enemy?.userData?.hp),
      activeEntries: fx?.entries?.length || 0,
      groupName: fx?.group?.name || null,
      reducedMotion: Boolean(fx?.reducedMotion),
      ringOpacity: Number(entry?.ring?.material?.opacity || 0),
      ringScale: Number(entry?.ring?.scale?.x || 0),
      canvasVisible: Boolean(document.querySelector("#viewport canvas")),
      pageWidth: document.documentElement.scrollWidth,
      viewportWidth: window.innerWidth
    };
  });

  expect(live.enemyHp).toBeLessThan(staged.enemyHp);
  expect(live.activeEntries).toBeGreaterThan(0);
  expect(live.activeEntries).toBeLessThanOrEqual(20);
  expect(live.groupName).toBe("axm-combat-damage-feedback");
  expect(live.ringOpacity).toBeGreaterThan(0);
  expect(live.ringScale).toBeGreaterThan(0);
  expect(live.canvasVisible).toBe(true);
  expect(live.pageWidth).toBe(live.viewportWidth);

  await mkdir("test-results/experience-evidence", { recursive: true });
  await page.screenshot({ path: "test-results/experience-evidence/skirmish-damage-feedback.png", fullPage: true });

  await page.evaluate(() => {
    const world = window.__AXM_RTS_WORLD__;
    const player = world.entities.find(entity => entity?.parent && entity.userData?.owner === "player" && entity.userData?.type === "squad");
    if (player) {
      player.userData.cooldown = 999;
      player.userData.target = null;
    }
  });
  await page.waitForTimeout(900);
  const settled = await page.evaluate(() => window.__AXM_RTS_WORLD__?.__axmCombatDamageFeedbackFx?.entries?.length || 0);
  expect(settled).toBe(0);
  expect(failures, failures.join("\n")).toEqual([]);

  const receipt = {
    staged,
    observed,
    live,
    settledEntries: settled,
    runtimeFailures: failures
  };
  await writeFile("test-results/experience-evidence/skirmish-damage-feedback.json", `${JSON.stringify(receipt, null, 2)}\n`, "utf8");
});
