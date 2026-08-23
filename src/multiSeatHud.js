import { loadLobby } from "./seatControllers.js";
import { FACTIONS } from "./factions.js";

function injectStyle() {
  if (document.getElementById("axm-seat-hud-style")) return;
  const style = document.createElement("style");
  style.id = "axm-seat-hud-style";
  style.textContent = `
    .axm-seat-hud{position:absolute;z-index:6;top:84px;left:50%;transform:translateX(-50%);display:flex;gap:5px;flex-wrap:wrap;justify-content:center;pointer-events:none;max-width:52vw}
    .axm-seat-chip{display:flex;gap:5px;align-items:center;padding:5px 7px;border-radius:999px;background:rgba(7,14,21,.80);border:1px solid rgba(160,194,216,.22);font:700 8px/1 system-ui,sans-serif;color:#c7d8e4;backdrop-filter:blur(8px)}
    .axm-seat-dot{width:7px;height:7px;border-radius:50%}.axm-seat-chip.dead{opacity:.38;text-decoration:line-through}
    @media(max-width:900px){.axm-seat-hud{top:66px;max-width:95vw}.axm-seat-chip{font-size:7px;padding:4px 6px}}
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
  document.querySelector("main")?.appendChild(hud);
  return hud;
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
    const chip = document.createElement("div");
    chip.className = `axm-seat-chip ${world && !capital ? "dead" : ""}`;
    chip.innerHTML = `<span class="axm-seat-dot" style="background:${COLORS[index]}"></span><span>S${index + 1} • T${seat.team} • ${faction?.symbol || "?"} ${escapeHtml(seat.label || seat.controller)}</span>`;
    hud.appendChild(chip);
  });
}

function escapeHtml(value) { return String(value).replace(/[&<>\"]/g, c => ({ "&":"&amp;", "<":"&lt;", ">":"&gt;", '"':"&quot;" }[c])); }
setInterval(update, 500);
update();
