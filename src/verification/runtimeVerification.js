import { RUNTIME_VERIFICATION_TARGETS, verificationSummary } from "./runtimeManifest.js";

const resultsNode = document.getElementById("verificationResults");
const summaryNode = document.getElementById("verificationSummary");
const runButton = document.getElementById("runVerification");
const exportButton = document.getElementById("exportVerification");
let latestResults = [];

function rowFor(result) {
  const row = document.createElement("tr");
  const status = result.status === "pass" ? "PASS" : "FAIL";
  row.innerHTML = `
    <td><strong>${status}</strong></td>
    <td>${result.target.label}</td>
    <td>${result.target.kind}</td>
    <td><code>${result.target.href}</code></td>
    <td>${result.detail}</td>
  `;
  row.dataset.status = result.status;
  return row;
}

async function fetchTarget(target) {
  try {
    const response = await fetch(target.href, { cache: "no-store" });
    if (!response.ok) return { target, status: "fail", detail: `HTTP ${response.status}` };
    const text = await response.text();
    if (!/<html|<!doctype/i.test(text)) return { target, status: "fail", detail: "Response is not an HTML document" };
    return { target, status: "pass", detail: `HTTP ${response.status} • ${text.length.toLocaleString()} bytes` };
  } catch (error) {
    return { target, status: "fail", detail: error?.message || String(error) };
  }
}

async function frameLoadTarget(target, timeoutMs = 5000) {
  return new Promise(resolve => {
    const iframe = document.createElement("iframe");
    iframe.setAttribute("aria-hidden", "true");
    Object.assign(iframe.style, {
      position: "fixed",
      left: "-10000px",
      top: "0",
      width: "1280px",
      height: "720px",
      border: "0",
      opacity: "0",
      pointerEvents: "none"
    });
    let settled = false;
    const finish = result => {
      if (settled) return;
      settled = true;
      clearTimeout(timer);
      iframe.remove();
      resolve(result);
    };
    const timer = setTimeout(() => finish({ target, status: "fail", detail: "Iframe load timeout" }), timeoutMs);
    iframe.addEventListener("load", () => {
      try {
        const doc = iframe.contentDocument;
        const hasBody = Boolean(doc?.body);
        const hasContent = Boolean(doc?.body?.children?.length || doc?.body?.textContent?.trim());
        finish({
          target,
          status: hasBody && hasContent ? "pass" : "fail",
          detail: hasBody && hasContent ? "Page load event + rendered document at 1280×720" : "Loaded without usable document content"
        });
      } catch (error) {
        finish({ target, status: "fail", detail: error?.message || String(error) });
      }
    }, { once: true });
    document.body.appendChild(iframe);
    iframe.src = `${target.href}${target.href.includes("?") ? "&" : "?"}verify=${Date.now()}`;
  });
}

async function verifyTarget(target) {
  const fetched = await fetchTarget(target);
  if (fetched.status === "fail") return fetched;
  const loaded = await frameLoadTarget(target);
  if (loaded.status === "fail") return loaded;
  return { target, status: "pass", detail: `${fetched.detail} • ${loaded.detail}` };
}

function render(results) {
  resultsNode.replaceChildren(...results.map(rowFor));
  const summary = verificationSummary(results);
  summaryNode.textContent = `${summary.passed}/${summary.total} page smoke checks passed${summary.criticalFailures ? ` • ${summary.criticalFailures} critical failure(s)` : ""}.`;
  summaryNode.dataset.ok = String(summary.ok);
  exportButton.disabled = results.length === 0;
}

async function run() {
  runButton.disabled = true;
  exportButton.disabled = true;
  summaryNode.textContent = "Running browser page smoke checks…";
  latestResults = [];
  render(latestResults);

  for (const target of RUNTIME_VERIFICATION_TARGETS) {
    const result = await verifyTarget(target);
    latestResults.push(result);
    render(latestResults);
  }

  runButton.disabled = false;
}

function exportReceipt() {
  const receipt = {
    schema: "axm-rts-runtime-verification/v1",
    generatedAt: new Date().toISOString(),
    scope: "browser-page-smoke-only",
    warning: "PASS proves fetch + page load/render only. It does not prove full gameplay interactions, deterministic outcomes, or visual correctness.",
    summary: verificationSummary(latestResults),
    results: latestResults.map(result => ({
      id: result.target.id,
      href: result.target.href,
      kind: result.target.kind,
      critical: result.target.critical,
      status: result.status,
      detail: result.detail
    }))
  };
  const blob = new Blob([JSON.stringify(receipt, null, 2)], { type: "application/json" });
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.download = `axm-rts-runtime-verification-${Date.now()}.json`;
  link.click();
  URL.revokeObjectURL(url);
}

runButton?.addEventListener("click", run);
exportButton?.addEventListener("click", exportReceipt);
