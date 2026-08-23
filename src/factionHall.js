import { FACTIONS } from "./factions.js";
import { factionNpcFor } from "./factionNpcs.js";

const list = document.getElementById("factionList");
const hero = document.getElementById("factionHero");
const details = document.getElementById("factionDetails");
const ids = Object.keys(FACTIONS);
let selected = ids[0];

function colorHex(value) {
  return `#${Number(value || 0).toString(16).padStart(6, "0")}`;
}

function renderList() {
  list.innerHTML = "";
  for (const id of ids) {
    const f = FACTIONS[id];
    const button = document.createElement("button");
    button.className = `faction-button ${id === selected ? "active" : ""}`;
    button.innerHTML = `<div class="symbol">${f.symbol}</div><div><b>${escapeHtml(f.name)}</b><small>${escapeHtml(f.founder)}</small></div>`;
    button.addEventListener("click", () => { selected = id; render(); });
    list.appendChild(button);
  }
}

function renderFaction() {
  const f = FACTIONS[selected];
  const npc = factionNpcFor(selected);
  hero.style.setProperty("--faction-color", colorHex(f.color));
  hero.innerHTML = `
    <div class="tag">${escapeHtml(f.founderTitle || "FOUNDER")}</div>
    <div class="symbol-big">${f.symbol}</div>
    <h2>${escapeHtml(f.name)}</h2>
    <p class="muted" style="max-width:760px;margin-top:8px;line-height:1.55">${escapeHtml(f.tagline)}</p>
    <div class="founder">Founder: <b>${escapeHtml(f.founder)}</b></div>
    <div class="tagrow">${f.traits.map(trait => `<span class="chip">${escapeHtml(trait)}</span>`).join("")}</div>`;

  const economy = Object.entries(f.economy).map(([k,v]) => `<div class="stat"><span>${escapeHtml(k)}</span><b>${Math.round(v*100)}%</b></div>`).join("");
  const military = Object.entries(f.military).map(([k,v]) => `<div class="stat"><span>${escapeHtml(k)}</span><b>${typeof v === "number" ? v : escapeHtml(String(v))}</b></div>`).join("");
  const units = f.units.map(unit => `<div class="unit"><b>${escapeHtml(unit.name)}</b>${escapeHtml(unit.description || "")}<br><span class="muted">HP ${unit.hp} • DMG ${unit.damage} • SPD ${unit.speed}</span></div>`).join("");
  const buildings = f.buildings.map(building => `<div class="unit"><b>${escapeHtml(building.name)}</b>${escapeHtml(building.description || "")}<br><span class="muted">${escapeHtml(building.role)}</span></div>`).join("");

  details.innerHTML = `
    <article class="card"><h3>Faction rule</h3><p>${escapeHtml(f.special)}</p></article>
    <article class="card"><h3>Economy profile</h3>${economy}</article>
    <article class="card"><h3>Military profile</h3>${military}</article>
    <article class="card"><h3>Units</h3><div class="unit-grid">${units}</div></article>
    <article class="card"><h3>Buildings</h3><div class="unit-grid">${buildings}</div></article>
    <article class="card npc"><h3>Native faction NPC — ${escapeHtml(npc?.name || "Unassigned")}</h3>
      <p>${escapeHtml(npc?.summary || "Native strategist profile still to be authored.")}</p>
      ${npc ? `<div class="tagrow">${npc.strategicDoctrine.map(item => `<span class="chip">${escapeHtml(item)}</span>`).join("")}</div>
      <p style="margin-top:10px"><b>Battle Map hooks:</b> ${escapeHtml(npc.battleMapHooks.join(" • "))}</p>
      <p class="voice" style="margin-top:10px">“${escapeHtml(npc.voice.opening)}”</p>` : ""}
    </article>`;
}

function render() { renderList(); renderFaction(); }
function escapeHtml(value) { return String(value).replace(/[&<>\"]/g, c => ({ "&":"&amp;", "<":"&lt;", ">":"&gt;", '"':"&quot;" }[c])); }
render();
