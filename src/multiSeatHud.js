import { loadLobby } from "./seatControllers.js";
import { FACTIONS } from "./factions.js";

const RESULT_SCHEMA = "axm.rts.seat-command-result/v0.1";
const commandResults = new Map();

function injectStyle() {
  if (document.getElementById("axm-seat-hud-style")) return;
  const style = document.createElement("style");
  style.id = "axm-seat-hud-style";
  style.textContent = `
    .axm-seat-hud{position:absolute;z-index:6;top:84px;left:50%;transform:translateX(-50%);display:flex;gap:5px;flex-wrap:wrap;justify-content:center;pointer-events:none;max-width:64vw}
    .axm-seat-chip{display:flex;gap:5px;align-items:center;flex-wrap:wrap;padding:5px 7px;border-radius:999px;background:rgba(7,14,21,.80);border:1px solid rgba(160,194,216,.22);font:700 8px/1 system-ui,sans-serif;color:#c7d8e4;backdrop-filter:blur(8px)}
    .axm-seat-dot{width:7px;height:7px;border-radius:50%}.axm-seat-chip.dead{opacity:.38;text-decoration:line-through}
    .axm-seat-result{flex-basis:100%;padding-left:12px;font-size:7px;line-height:1.2;letter-spacing:.055em;color:#8ee7b7;white-space:normal}
    .axm-seat-result.held{color:#ffd27d}
    .axm-seat-announcer{position:absolute!important;width:1px!important;height:1px!important;padding:0!important;margin:-1px!important;overflow:hidden!important;clip:rect(0,0,0,0)!important;white-space:nowrap!important;border:0!important}
    @media(max-width:900px){.axm-seat-hud{top:66px;max-width:96vw}.axm-seat-chip{font-size:7px;padding:4px 6px}.axm-seat-result{font-size:6.5px}}
  `;
  document.head.appendChild(style);
}

const COLORS = ["#78ddff", "#ff7b83", "#ffd66d", "#c69cff"];
const OWNER_IDS = ["player", "enemy", "seat-3", "seat-4"];

function ensureHud() {
  let hud = document.getElementById("axm-seat-hud");
  if (hud) return hud;
  injectStyle();
  hud = document.createElement("div");
  hud.id = "axm-seat-hud";
  hud.className = "axm-seat-hud";
  hud.setAttribute("aria-label", "Active match seats");
  document.querySelector("main")?.appendChild(hud);
  return hud;
}

function ensureAnnouncer() {
  let node = document.getElementById("axm-seat-announcer");
  if (node) return node;
  injectStyle();
  node = document.createElement("div");
  node.id = "axm-seat-announcer";
  node.className = "axm-seat-announcer";
  node.setAttribute("role", "status");
  node.setAttribute("aria-live", "polite");
  node.setAttribute("aria-atomic", "true");
  document.body.appendChild(node);
  return node;
}

function resultLabel(result) {
  const command = result.commandType ? String(result.commandType).replaceAll("-", " ").toUpperCase() : "COMMAND";
  if (result.status === "APPLIED") return `APPLIED · ${command}`;
  return `HELD · ${command} · ${result.reason || "UNKNOWN"}`;
}

function update() {
  const hud = ensureHud();
  const lobby = loadLobby();
  const world = window.__AXM_RTS_WORLD__;
  hud.innerHTML = "";
  lobby.seats.forEach((seat, index) => {
    if (seat.controller === "closed") return;
    const owner = OWNER_IDS[index];
    const faction = FACTIONS[seat.factionId];
    const capital = world?.entities?.find(entity => entity.parent && entity.userData?.type === "capital" && entity.userData?.owner === owner);
    const result = commandResults.get(seat.id);
    const chip = document.createElement("div");
    chip.className = `axm-seat-chip ${world && !capital ? "dead" : ""}`;
    const resultHtml = result
      ? `<span class="axm-seat-result ${result.status === "HELD" ? "held" : ""}" data-seat-command-result="${escapeHtml(seat.id)}">${escapeHtml(resultLabel(result))}</span>`
      : "";
    chip.innerHTML = `<span class="axm-seat-dot" style="background:${COLORS[index]}"></span><span>S${index + 1} • T${seat.team} • ${faction?.symbol || "?"} ${escapeHtml(seat.label || seat.controller)}</span>${resultHtml}`;
    hud.appendChild(chip);
  });
}

function escapeHtml(value) { return String(value).replace(/[&<>\"]/g, c => ({ "&":"&amp;", "<":"&lt;", ">":"&gt;", '"':"&quot;" }[c])); }

window.addEventListener("axm-seat-command-result", event => {
  const result = event.detail || {};
  if (result.schema !== RESULT_SCHEMA || !result.seatId || !["APPLIED", "HELD"].includes(result.status)) return;
  commandResults.set(result.seatId, result);
  const seatNumber = Number(String(result.seatId).split("-")[1]) || result.seatId;
  ensureAnnouncer().textContent = `Seat ${seatNumber} command ${result.status.toLowerCase()}: ${result.commandType || "unknown command"}${result.status === "HELD" && result.reason ? `, ${result.reason}` : ""}.`;
  update();
});

setInterval(update, 500);
update();
