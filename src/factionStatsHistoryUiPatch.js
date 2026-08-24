import { factionStats } from "./matchStatsStore.js";

let timer = null;

function esc(value) {
  return String(value ?? "").replace(/[&<>\"]/g, char => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;" }[char]));
}

function injectStyle() {
  if (document.getElementById("axmFactionHistoryStyle")) return;
  const style = document.createElement("style");
  style.id = "axmFactionHistoryStyle";
  style.textContent = `
    .axm-faction-history{margin:10px 0;padding:9px 11px;border:1px solid rgba(125,215,255,.22);border-radius:10px;background:rgba(125,215,255,.055);font-size:9px;color:var(--muted,#9eafc0)}
    .axm-faction-history .head{display:flex;align-items:center;justify-content:space-between;gap:8px;flex-wrap:wrap}.axm-faction-history strong{color:var(--text,#edf4fb);font-size:10px}.axm-faction-history .open{color:var(--accent,#7dd7ff);text-decoration:none;border:1px solid rgba(125,215,255,.22);border-radius:7px;padding:4px 7px;background:rgba(125,215,255,.045)}
    .axm-faction-history .rows{display:flex;flex-wrap:wrap;gap:6px;margin-top:5px}.axm-faction-history .row{padding:5px 7px;border-radius:7px;background:rgba(255,255,255,.035)}
  `;
  document.head.appendChild(style);
}

function humanFactionIds() {
  const defend = window.__AXM_DEFEND_WORKSHOP__;
  if (defend?.state?.ended) {
    return [...new Set((defend.state.seats || []).filter(seat => seat.controller === "human").map(seat => seat.factionId).filter(Boolean))];
  }
  const world = window.__AXM_RTS_WORLD__;
  if (world?.__axmSkirmishMetrics?.result) {
    const id = world.__axmFactionByOwner?.player?.id;
    return id ? [id] : [];
  }
  return [];
}

function targetPanel() {
  const defend = window.__AXM_DEFEND_WORKSHOP__;
  if (defend?.state?.ended) return document.getElementById("endPanel");
  const world = window.__AXM_RTS_WORLD__;
  if (world?.__axmSkirmishMetrics?.result) return document.getElementById("skirmishResultsPanel");
  return null;
}

function render() {
  const panel = targetPanel();
  const factionIds = humanFactionIds();
  if (!panel || !factionIds.length) return false;
  injectStyle();
  const all = factionStats({ controller: "human" });
  const rows = factionIds.map(id => all.find(item => item.factionId === id)).filter(Boolean);
  if (!rows.length) return false;
  let root = panel.querySelector(".axm-faction-history");
  if (!root) {
    root = document.createElement("div");
    root.className = "axm-faction-history";
    const actions = panel.querySelector(".end-actions,.sm-actions");
    if (actions) actions.insertAdjacentElement("beforebegin", root);
    else panel.appendChild(root);
  }
  root.innerHTML = `<div class="head"><strong>Faction History</strong><a class="open" href="./faction-stats.html">Open Chronicle →</a></div><div class="rows">${rows.map(row => {
    const rate = row.matches ? Math.round(row.winRate * 100) : 0;
    return `<div class="row"><b>${esc(row.factionName)}</b> • ${row.matches} match${row.matches === 1 ? "" : "es"} • ${row.wins}W / ${row.losses}L • ${rate}% wins</div>`;
  }).join("")}</div>`;
  return true;
}

function attach() {
  if (document.documentElement.dataset.axmFactionHistoryAttached) return true;
  document.documentElement.dataset.axmFactionHistoryAttached = "1";
  let clock = 0;
  const step = () => {
    clock++;
    if (render() || clock > 7200) {
      if (timer) clearInterval(timer);
      timer = null;
    }
  };
  timer = setInterval(step, 250);
  step();
  return true;
}

attach();
