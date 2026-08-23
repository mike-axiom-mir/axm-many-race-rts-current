import { FACTIONS } from "./factions.js";
import { factionNpcFor } from "./factionNpcs.js";
import { resolvedCombatProfile, roleCounterText } from "./combatRules.js";

const list = document.getElementById("factionList");
const hero = document.getElementById("factionHero");
const details = document.getElementById("factionDetails");
const ids = Object.keys(FACTIONS);
let selected = ids[0];

function colorHex(value) { return `#${Number(value || 0).toString(16).padStart(6, "0")}`; }
function pct(value = 0) { return `${Math.round(Number(value || 0) * 100)}%`; }

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

function supportText(support) {
  if (!support) return null;
  const amount = support.kind === "heal" ? `${support.amount}/s heal` : `${Math.round(Number(support.amount || 0) * 100)}% ${support.kind}`;
  return `${amount} aura • radius ${support.radius}`;
}

function unitCard(faction, unit) {
  const profile = resolvedCombatProfile(unit);
  const squadSize = unit.squadSize || faction.military?.squadSize || 5;
  const role = roleCounterText(profile.role);
  const unlockAge = Number.isFinite(unit.unlockAge) ? Number(unit.unlockAge) : Math.max(0, faction.units.indexOf(unit));
  const support = supportText(unit.support);
  return `<div class="unit">
    <b>${escapeHtml(unit.name)}</b>
    ${escapeHtml(unit.description || "")}<br>
    <span class="muted">${escapeHtml(role)} • squad ${squadSize}${support ? ` • ${escapeHtml(support)}` : ""}</span><br>
    <span class="muted">HP/member ${unit.hp} • DMG/member ${unit.damage} • RNG ${unit.range} • SPD ${unit.speed}</span><br>
    <span class="muted">Armor ${pct(profile.armor)} • attack ${profile.attackInterval.toFixed(2)}s • unlock Age ${unlockAge + 1}</span>
  </div>`;
}

function buildingCard(faction, building) {
  const scaledHp = building.hp ? Math.round(building.hp * (faction.building?.health || 1)) : null;
  const tower = building.role === "defense";
  const support = supportText(building.support);
  const items = [
    building.role,
    `Age ${Number(building.unlockAge || 0) + 1}`,
    scaledHp ? `HP ${scaledHp}` : null,
    building.armor != null ? `Armor ${pct(building.armor)}` : null,
    building.upgradeHub ? "Upgrade hub" : null,
    building.reinforcementPoint ? "Forward muster" : null,
    support,
    tower && building.defense ? `DMG ${building.defense}` : null,
    tower && building.defenseRange ? `RNG ${building.defenseRange}` : null,
    tower && building.fireInterval ? `${Number(building.fireInterval).toFixed(2)}s fire` : null
  ].filter(Boolean).join(" • ");
  return `<div class="unit"><b>${escapeHtml(building.name)}</b>${escapeHtml(building.description || "")}<br><span class="muted">${escapeHtml(items)}</span></div>`;
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
  const units = f.units.map(unit => unitCard(f, unit)).join("");
  const buildings = f.buildings.map(building => buildingCard(f, building)).join("");

  details.innerHTML = `
    <article class="card"><h3>Faction rule</h3><p>${escapeHtml(f.special)}</p></article>
    <article class="card"><h3>Economy profile</h3>${economy}</article>
    <article class="card"><h3>Military profile</h3>${military}</article>
    <article class="card"><h3>Combat language</h3><p><b>Line</b> checks Mobile • <b>Mobile</b> closes on Ranged • <b>Ranged</b> pressures Line • <b>Siege</b> breaks Structures. Support auras add depth without creating a fifth counter class.</p></article>
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
