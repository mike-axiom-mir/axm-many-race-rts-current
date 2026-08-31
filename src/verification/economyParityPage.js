import { runEconomyParitySuite } from "../core/economyParityHarness.js";

const summaryNode = document.getElementById("summary");
const resultsNode = document.getElementById("results");

function evidence(test) {
  const copy = { ...test };
  delete copy.name;
  delete copy.pass;
  return JSON.stringify(copy, null, 2);
}

try {
  const report = runEconomyParitySuite();
  summaryNode.className = `summary ${report.ok ? "pass" : "fail"}`;
  summaryNode.textContent = `${report.passed}/${report.total} parity checks passed. Gameplay authority transferred: ${report.authorityTransferred ? "yes" : "no"}.`;
  for (const test of report.tests) {
    const row = document.createElement("tr");
    row.innerHTML = `<td class="${test.pass ? "pass" : "fail"}">${test.pass ? "PASS" : "FAIL"}</td><td>${test.name}</td><td><code></code></td>`;
    row.querySelector("code").textContent = evidence(test);
    resultsNode.appendChild(row);
  }
  window.__AXM_RTS_ECONOMY_PARITY__ = report;
} catch (error) {
  summaryNode.className = "summary fail";
  summaryNode.textContent = `Parity harness failed to execute: ${error?.message || String(error)}`;
  window.__AXM_RTS_ECONOMY_PARITY__ = { ok: false, error: error?.message || String(error) };
}
