import test from "node:test";
import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";

const html = await readFile(new URL("../forge-audition.html", import.meta.url), "utf8");
const css = await readFile(new URL("../forge-audition.css", import.meta.url), "utf8");
const js = await readFile(new URL("../src/forgeAudition.js", import.meta.url), "utf8");

test("audition requires three caller-owned files and an explicit render action", () => {
  for (const id of ["requestFile", "receiptFile", "glbFile", "verifyButton"]) assert.match(html, new RegExp(`id="${id}"`));
  assert.match(html, /Nothing is parsed automatically/);
  assert.match(js, /verifyButton\.addEventListener\("click", verifyAndRender\)/);
  assert.doesNotMatch(js, /fetch\s*\(/);
  assert.doesNotMatch(js, /localStorage|sessionStorage/);
});

test("audition reuses verified consumer and keeps runtime authority closed", () => {
  assert.match(js, /admitVerifiedForgeGlb/);
  assert.match(js, /realizeAdmittedForgeGlb/);
  assert.match(html, /DISPLAY ≠ INSTALL · DISPLAY ≠ VISUAL APPROVAL · NOT CANON/);
  assert.match(html, /cannot install the asset into a formation/);
  assert.match(html, /existing runtime dependency/);
});

test("tactical readability is measured at bounded RTS views without inventing a quality score", () => {
  assert.match(js, /detail: \{ meters: 4\.5/);
  assert.match(js, /command: \{ meters: 12/);
  assert.match(js, /distant: \{ meters: 26/);
  assert.match(js, /projectedHeightPx/);
  assert.match(html, /not an automatic quality score/);
});

test("phone and accessibility realization keep explicit interaction affordances", () => {
  assert.match(css, /min-height: 44px/);
  assert.match(css, /\.stage-empty\[hidden\]\s*\{\s*display:\s*none/);
  assert.match(css, /\.skip-link\s*\{[^}]*opacity:\s*0[^}]*pointer-events:\s*none/s);
  assert.match(css, /\.skip-link:focus\s*\{[^}]*opacity:\s*1[^}]*pointer-events:\s*auto/s);
  assert.match(css, /prefers-reduced-motion/);
  assert.match(css, /prefers-contrast: more/);
  assert.match(css, /forced-colors: active/);
  assert.match(html, /role="status" aria-live="polite"/);
});
