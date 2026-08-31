import { runEconomyDriftHarness } from "../core/economyDriftHarness.js";

const report = runEconomyDriftHarness();
window.__AXM_RTS_ECONOMY_DRIFT_HARNESS__ = report;

const summary = document.getElementById("driftSummary");
const rows = document.getElementById("driftRows");

summary.textContent = report.ok
  ? `${report.passed}/${report.total} drift-probe checks passed. Gameplay authority unchanged.`
  : `${report.failed}/${report.total} drift-probe checks failed.`;
summary.dataset.ok = String(report.ok);

for (const test of report.tests) {
  const row = document.createElement("tr");
  row.dataset.status = test.pass ? "pass" : "fail";
  row.innerHTML = `<td><strong>${test.pass ? "PASS" : "FAIL"}</strong></td><td>${test.name}</td><td><code>${JSON.stringify(test)}</code></td>`;
  rows.appendChild(row);
}
