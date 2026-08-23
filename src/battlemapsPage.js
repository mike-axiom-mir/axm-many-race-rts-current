import { listBattleMaps } from "./battleMaps.js";

const $ = id => document.getElementById(id);
const ui = {
  cards: $("battleCards"), name: $("detailName"), subtitle: $("detailSubtitle"), description: $("detailDescription"),
  objectives: $("detailObjectives"), setup: $("detailSetup"), play: $("playBtn")
};

const battles = listBattleMaps();
let selected = battles[0] || null;

function renderCards() {
  ui.cards.innerHTML = "";
  for (const battle of battles) {
    const card = document.createElement("article");
    card.className = `battle-card ${selected?.id === battle.id ? "selected" : ""}`;
    card.innerHTML = `
      <div class="tag">${escapeHtml(battle.map.projection.toUpperCase())} • ${escapeHtml(battle.difficulty.toUpperCase())}</div>
      <h2>${escapeHtml(battle.name)}</h2>
      <p>${escapeHtml(battle.description)}</p>
      <div class="tags">${battle.tags.map(tag => `<span class="tagchip">${escapeHtml(tag)}</span>`).join("")}</div>`;
    card.addEventListener("click", () => { selected = battle; render(); });
    ui.cards.appendChild(card);
  }
}

function renderDetail() {
  if (!selected) return;
  ui.name.textContent = selected.name;
  ui.subtitle.textContent = selected.subtitle || "";
  ui.description.textContent = selected.description || "";
  ui.objectives.innerHTML = selected.objectives.map(objective => `<div class="objective"><b>${objective.type === "secondary" ? "Secondary" : "Primary"}</b><br>${escapeHtml(objective.text)}</div>`).join("");
  ui.setup.innerHTML = [
    ["Map", selected.map.mapId || "Embedded custom map"],
    ["Projection", selected.map.projection],
    ["Difficulty", selected.difficulty],
    ["Build mode", selected.modifiers.buildMode],
    ["Economy", selected.modifiers.economyMode],
    ["Reinforcements", selected.modifiers.reinforcements]
  ].map(([key, value]) => `<div class="objective"><b>${escapeHtml(key)}</b><br>${escapeHtml(String(value))}</div>`).join("");
  ui.play.href = selected.map.projection === "globe" ? "./globe.html" : "./skirmish.html";
  ui.play.textContent = selected.map.projection === "globe" ? "Open Globe Runtime" : "Open Flat Runtime";
  localStorage.setItem("axm.manyRaceRts.selectedBattleMap", JSON.stringify(selected));
}

function render() { renderCards(); renderDetail(); }
function escapeHtml(value) { return String(value).replace(/[&<>\"]/g, c => ({ "&":"&amp;", "<":"&lt;", ">":"&gt;", '"':"&quot;" }[c])); }

render();
