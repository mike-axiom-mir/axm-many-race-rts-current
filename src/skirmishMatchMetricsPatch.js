import { RTSWorld } from "./world.js";
import { DEFAULT_MAP } from "./maps.js";

const previousResetDynamic = RTSWorld.prototype.resetDynamic;
const previousTick = RTSWorld.prototype.tick;
const previousUpdateCombat = RTSWorld.prototype.updateCombat;
const previousRemoveEntity = RTSWorld.prototype.removeEntity;

function sameTeam(world, ownerA, ownerB) {
  if (ownerA === ownerB) return true;
  const teams = world?.__axmTeamByOwner || {};
  return teams[ownerA] != null && teams[ownerB] != null && teams[ownerA] === teams[ownerB];
}

function ownerStats(owner) {
  return {
    owner,
    damage: 0,
    kills: 0,
    formationsFielded: 0,
    formationsLost: 0,
    structuresFielded: 0,
    structuresLost: 0,
    foundersFielded: 0,
    foundersLost: 0,
    capitalsLost: 0,
    orders: 0,
    peakFormations: 0
  };
}

function freshMetrics() {
  return {
    active: false,
    elapsed: 0,
    result: null,
    resultsShown: false,
    currentAttackerOwner: null,
    owners: new Map(),
    seenEntities: new WeakSet(),
    unattributedKills: 0,
    uiClock: 0,
    activeTab: "summary"
  };
}

function ensureMetrics(world) {
  if (!world.__axmSkirmishMetrics) world.__axmSkirmishMetrics = freshMetrics();
  return world.__axmSkirmishMetrics;
}

function statsFor(metrics, owner) {
  if (!owner) return null;
  if (!metrics.owners.has(owner)) metrics.owners.set(owner, ownerStats(owner));
  return metrics.owners.get(owner);
}

function ownerOrder(owner) {
  if (owner === "player") return 0;
  if (owner === "enemy") return 1;
  const match = String(owner).match(/seat-(\d+)/);
  return match ? Number(match[1]) : 99;
}

function living(world, owner, type) {
  return (world.entities || []).filter(entity =>
    entity?.parent && entity.userData?.hp > 0 && entity.userData?.owner === owner && (!type || entity.userData.type === type)
  );
}

function observeEntities(world) {
  const metrics = ensureMetrics(world);
  for (const entity of world.entities || []) {
    if (!entity?.parent || entity.userData?.hp <= 0 || !entity.userData?.owner) continue;
    const stats = statsFor(metrics, entity.userData.owner);
    if (!metrics.seenEntities.has(entity)) {
      metrics.seenEntities.add(entity);
      if (entity.userData.type === "squad") stats.formationsFielded++;
      else if (entity.userData.type === "building") stats.structuresFielded++;
      else if (entity.userData.type === "founder") stats.foundersFielded++;
    }
  }
  for (const [owner, stats] of metrics.owners.entries()) {
    stats.peakFormations = Math.max(stats.peakFormations, living(world, owner, "squad").length);
  }
}

function resultText() {
  const badge = document.getElementById("ageBadge");
  const value = String(badge?.textContent || "").trim().toUpperCase();
  if (value === "VICTORY" || value === "DEFEAT") return value;
  return null;
}

function formatTime(seconds) {
  const total = Math.max(0, Math.floor(Number(seconds || 0)));
  const minutes = Math.floor(total / 60);
  return `${minutes}:${String(total % 60).padStart(2, "0")}`;
}

function esc(value) {
  return String(value ?? "").replace(/[&<>\"]/g, char => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;" }[char]));
}

function ownerLabel(world, owner) {
  if (owner === "player") return "Player";
  if (owner === "enemy") return "Enemy";
  return String(owner).replace("seat-", "Seat ");
}

function factionLabel(world, owner) {
  const faction = world.__axmFactionByOwner?.[owner];
  return faction?.name || faction?.id || "Unknown faction";
}

function finalResources() {
  const rows = [];
  for (const resource of document.querySelectorAll("#resources .resource")) {
    const label = resource.querySelector("span")?.textContent?.trim() || "Resource";
    const value = resource.querySelector("strong")?.textContent?.trim() || "0";
    rows.push({ label, value });
  }
  return rows;
}

function strategicStateRows() {
  const rows = [];
  for (const row of document.querySelectorAll("#strategyState .state-row")) {
    const label = row.querySelector("span")?.textContent?.trim();
    const value = row.querySelector("b")?.textContent?.trim();
    if (label && value) rows.push({ label, value });
  }
  return rows;
}

function injectStyle() {
  if (document.getElementById("axmSkirmishMetricsStyle")) return;
  const style = document.createElement("style");
  style.id = "axmSkirmishMetricsStyle";
  style.textContent = `
    #skirmishResultsPanel{position:absolute;z-index:40;left:50%;top:50%;transform:translate(-50%,-50%);width:min(980px,calc(100vw - 26px));max-height:86vh;overflow:auto;border-radius:18px;padding:18px;background:var(--panel);border:1px solid var(--line);box-shadow:0 26px 80px rgba(0,0,0,.5);backdrop-filter:blur(16px)}
    #skirmishResultsPanel h2{text-align:center;font-size:27px;margin:2px 0 4px}.sm-sub{text-align:center;color:var(--muted);font-size:10px;margin-bottom:12px}
    .sm-tabs{display:flex;justify-content:center;gap:6px;flex-wrap:wrap;margin-bottom:10px}.sm-tabs button{min-width:105px;font-size:9px;text-transform:uppercase;letter-spacing:.08em}.sm-tabs button.active{border-color:var(--accent);background:#1c4055}
    .sm-grid{display:grid;grid-template-columns:repeat(4,minmax(0,1fr));gap:7px;margin-bottom:9px}.sm-card{padding:9px;border-radius:10px;border:1px solid rgba(255,255,255,.07);background:rgba(255,255,255,.035);min-width:0}.sm-card span{display:block;color:var(--muted);font-size:8px;text-transform:uppercase;letter-spacing:.07em}.sm-card b{display:block;font-size:17px;margin-top:2px;overflow-wrap:anywhere}
    .sm-table-wrap{overflow-x:auto;border:1px solid rgba(255,255,255,.07);border-radius:10px}.sm-table{border-collapse:collapse;width:100%;min-width:640px;font-size:9px}.sm-table th,.sm-table td{padding:7px 8px;text-align:right;border-bottom:1px solid rgba(255,255,255,.055);white-space:nowrap}.sm-table th:first-child,.sm-table td:first-child{text-align:left}.sm-table th{color:var(--muted);font-size:8px;text-transform:uppercase;letter-spacing:.06em;background:rgba(255,255,255,.025)}.sm-table tr:last-child td{border-bottom:0}
    .sm-section{margin-top:11px}.sm-section h3{font-size:10px;text-transform:uppercase;letter-spacing:.09em;color:#c7dce8;margin-bottom:6px}.sm-note{font-size:8px;color:var(--muted);margin-top:7px}.sm-actions{display:flex;gap:7px;margin-top:13px}.sm-actions button,.sm-actions a{flex:1;text-align:center}.sm-actions a{color:var(--text);text-decoration:none;border:1px solid #3a526b;border-radius:9px;padding:9px 10px;background:#172839}.sm-good{color:var(--good)}.sm-bad{color:var(--danger)}
    @media(max-width:700px){.sm-grid{grid-template-columns:repeat(2,minmax(0,1fr))}.sm-tabs button{min-width:0;flex:1}.sm-card b{font-size:14px}}
  `;
  document.head.appendChild(style);
}

function tabButton(id, label, active) {
  return `<button type="button" data-sm-tab="${id}" class="${active === id ? "active" : ""}">${label}</button>`;
}

function summaryHtml(world, metrics) {
  const player = statsFor(metrics, "player") || ownerStats("player");
  const domination = world.__axmMapDominationMomentum?.byOwner?.player;
  const score = Math.round(Number(domination?.score || 0));
  const faction = factionLabel(world, "player");
  const result = metrics.result || "RESULT";
  return `
    <div class="sm-grid">
      <div class="sm-card"><span>Result</span><b class="${result === "VICTORY" ? "sm-good" : "sm-bad"}">${esc(result)}</b></div>
      <div class="sm-card"><span>Match time</span><b>${formatTime(metrics.elapsed)}</b></div>
      <div class="sm-card"><span>Map</span><b>${esc(DEFAULT_MAP?.name || "Skirmish")}</b></div>
      <div class="sm-card"><span>Faction</span><b>${esc(faction)}</b></div>
    </div>
    <div class="sm-grid">
      <div class="sm-card"><span>Final map domination</span><b>${score > 0 ? "+" : ""}${score}%</b></div>
      <div class="sm-card"><span>Peak formations</span><b>${player.peakFormations}</b></div>
      <div class="sm-card"><span>Formations surviving</span><b>${living(world, "player", "squad").length}</b></div>
      <div class="sm-card"><span>Structures surviving</span><b>${living(world, "player", "building").length}</b></div>
    </div>
    <p class="sm-note">Skirmish results use observable world state. Private lifetime resource-collected/spent totals are not invented.</p>`;
}

function militaryHtml(world, metrics) {
  const owners = [...metrics.owners.keys()].sort((a, b) => ownerOrder(a) - ownerOrder(b));
  const rows = owners.map(owner => {
    const stats = statsFor(metrics, owner);
    return `<tr><td>${esc(ownerLabel(world, owner))}<br><small>${esc(factionLabel(world, owner))}</small></td><td>${Math.round(stats.damage)}</td><td>${stats.kills}</td><td>${stats.formationsFielded}</td><td>${stats.formationsLost}</td><td>${living(world, owner, "squad").length}</td><td>${stats.structuresLost + stats.capitalsLost}</td></tr>`;
  }).join("");
  return `
    <div class="sm-grid">
      <div class="sm-card"><span>Unattributed / defense kills</span><b>${metrics.unattributedKills}</b></div>
      <div class="sm-card"><span>Your field damage</span><b>${Math.round(statsFor(metrics, "player")?.damage || 0)}</b></div>
      <div class="sm-card"><span>Your formation losses</span><b>${statsFor(metrics, "player")?.formationsLost || 0}</b></div>
      <div class="sm-card"><span>Your orders</span><b>${statsFor(metrics, "player")?.orders || 0}</b></div>
    </div>
    <div class="sm-section"><h3>Military scoreboard</h3><div class="sm-table-wrap"><table class="sm-table"><thead><tr><th>Side</th><th>Field damage</th><th>Direct kills</th><th>Formations fielded</th><th>Lost</th><th>Survived</th><th>Structures lost</th></tr></thead><tbody>${rows}</tbody></table></div></div>
    <p class="sm-note">Field damage and direct kills come from squad/founder combat. Tower/projectile finishing kills that cannot be safely attributed to one formation remain separate instead of being assigned to a player.</p>`;
}

function empireHtml(world, metrics) {
  const resources = finalResources();
  const strategy = strategicStateRows();
  const domination = world.__axmMapDominationMomentum?.byOwner?.player;
  const resourcesHtml = resources.length ? resources.map(row => `<div class="sm-card"><span>${esc(row.label)}</span><b>${esc(row.value)}</b></div>`).join("") : `<div class="sm-card"><span>Stockpile</span><b>Unavailable</b></div>`;
  const strategyRows = strategy.length ? strategy.map(row => `<tr><td>${esc(row.label)}</td><td>${esc(row.value)}</td></tr>`).join("") : `<tr><td colspan="2">No final strategic-state rows available.</td></tr>`;
  const bonus = domination?.score > 0 ? `Economy +${domination.economyAppliedPercent || domination.economyBonusPercent || 0}%` : domination?.score < 0 ? `Attack +${domination.attackBonusPercent || 0}%` : "No domination bonus";
  return `
    <div class="sm-section"><h3>Final player stockpile</h3><div class="sm-grid">${resourcesHtml}</div></div>
    <div class="sm-grid">
      <div class="sm-card"><span>Map domination</span><b>${Math.round(Number(domination?.score || 0))}%</b></div>
      <div class="sm-card"><span>Domination reward</span><b>${esc(bonus)}</b></div>
      <div class="sm-card"><span>Structures fielded</span><b>${statsFor(metrics, "player")?.structuresFielded || 0}</b></div>
      <div class="sm-card"><span>Structures remaining</span><b>${living(world, "player", "building").length}</b></div>
    </div>
    <div class="sm-section"><h3>Final empire state</h3><div class="sm-table-wrap"><table class="sm-table"><thead><tr><th>Metric</th><th>Final state</th></tr></thead><tbody>${strategyRows}</tbody></table></div></div>
    <p class="sm-note">This tab intentionally shows final stockpile/income/territory state rather than fabricating lifetime gathered/spent totals that the current Skirmish public runtime does not expose.</p>`;
}

function playersHtml(world, metrics) {
  const owners = [...metrics.owners.keys()].sort((a, b) => ownerOrder(a) - ownerOrder(b));
  const rows = owners.map(owner => {
    const stats = statsFor(metrics, owner);
    const team = world.__axmTeamByOwner?.[owner] ?? "—";
    const founder = living(world, owner, "founder").length ? "Alive" : stats.foundersFielded ? "Fallen" : "—";
    return `<tr><td>${esc(ownerLabel(world, owner))}</td><td>${esc(factionLabel(world, owner))}</td><td>${esc(team)}</td><td>${Math.round(stats.damage)}</td><td>${stats.kills}</td><td>${stats.formationsLost}</td><td>${living(world, owner, "squad").length}</td><td>${founder}</td></tr>`;
  }).join("");
  return `<div class="sm-section"><h3>Players / seats</h3><div class="sm-table-wrap"><table class="sm-table"><thead><tr><th>Seat</th><th>Faction</th><th>Team</th><th>Field damage</th><th>Direct kills</th><th>Losses</th><th>Survivors</th><th>Founder</th></tr></thead><tbody>${rows}</tbody></table></div></div>`;
}

function renderResults(world) {
  const metrics = ensureMetrics(world);
  if (metrics.resultsShown) return;
  injectStyle();
  metrics.resultsShown = true;
  metrics.activeTab ||= "summary";
  const panel = document.createElement("section");
  panel.id = "skirmishResultsPanel";
  document.querySelector("main")?.appendChild(panel);

  const draw = () => {
    const title = metrics.result === "VICTORY" ? "Strategic Victory" : "Strategic Defeat";
    const tabs = `<div class="sm-tabs">${tabButton("summary", "Summary", metrics.activeTab)}${tabButton("military", "Military", metrics.activeTab)}${tabButton("empire", "Empire", metrics.activeTab)}${tabButton("players", "Players", metrics.activeTab)}</div>`;
    let content = summaryHtml(world, metrics);
    if (metrics.activeTab === "military") content = militaryHtml(world, metrics);
    else if (metrics.activeTab === "empire") content = empireHtml(world, metrics);
    else if (metrics.activeTab === "players") content = playersHtml(world, metrics);
    panel.innerHTML = `<div class="eyebrow" style="text-align:center">MATCH RESULTS</div><h2>${title}</h2><p class="sm-sub">${esc(DEFAULT_MAP?.name || "Skirmish")} • ${formatTime(metrics.elapsed)}</p>${tabs}${content}<div class="sm-actions"><button type="button" id="smRestart">New world</button><a href="./index.html">Main menu</a></div>`;
    panel.querySelector("#smRestart")?.addEventListener("click", () => location.reload());
    for (const button of panel.querySelectorAll("[data-sm-tab]")) button.addEventListener("click", () => {
      metrics.activeTab = button.dataset.smTab;
      draw();
    });
  };
  draw();
}

function trackOrderClicks() {
  if (document.documentElement.dataset.axmSkirmishMetricsOrders) return;
  document.documentElement.dataset.axmSkirmishMetricsOrders = "1";
  document.addEventListener("click", event => {
    const button = event.target?.closest?.("[data-command],[data-axm-combat-waypoint]");
    if (!button) return;
    const world = window.__AXM_RTS_WORLD__;
    if (!world) return;
    const metrics = ensureMetrics(world);
    if (!metrics.active || metrics.result) return;
    statsFor(metrics, "player").orders++;
  });
}

RTSWorld.prototype.resetDynamic = function skirmishMetricsReset() {
  this.__axmSkirmishMetrics = freshMetrics();
  document.getElementById("skirmishResultsPanel")?.remove();
  return previousResetDynamic.call(this);
};

RTSWorld.prototype.updateCombat = function skirmishMetricsCombat(entity, dt) {
  const metrics = ensureMetrics(this);
  const owner = entity?.userData?.owner;
  const eligible = owner && (entity.userData.type === "squad" || entity.userData.type === "founder");
  if (!eligible) return previousUpdateCombat.call(this, entity, dt);

  const range = Number(entity.userData.range || 1.2) + 3;
  const before = new Map();
  for (const target of this.entities || []) {
    if (!target?.parent || target.userData?.hp <= 0 || !target.userData?.owner || sameTeam(this, owner, target.userData.owner)) continue;
    if (entity.position.distanceTo(target.position) <= range + Number(target.userData.radius || 0)) before.set(target, Number(target.userData.hp || 0));
  }
  metrics.currentAttackerOwner = owner;
  const result = previousUpdateCombat.call(this, entity, dt);
  metrics.currentAttackerOwner = null;
  const stats = statsFor(metrics, owner);
  for (const [target, hpBefore] of before.entries()) {
    const hpAfter = Number(target.userData?.hp || 0);
    if (hpAfter < hpBefore) stats.damage += Math.min(hpBefore, hpBefore - hpAfter);
  }
  return result;
};

RTSWorld.prototype.removeEntity = function skirmishMetricsRemove(entity) {
  const metrics = ensureMetrics(this);
  const victimOwner = entity?.userData?.owner;
  const victimType = entity?.userData?.type;
  if (victimOwner) {
    const victim = statsFor(metrics, victimOwner);
    if (victimType === "squad") victim.formationsLost++;
    else if (victimType === "building") victim.structuresLost++;
    else if (victimType === "founder") victim.foundersLost++;
    else if (victimType === "capital") victim.capitalsLost++;

    const attackerOwner = metrics.currentAttackerOwner;
    if (attackerOwner && !sameTeam(this, attackerOwner, victimOwner)) statsFor(metrics, attackerOwner).kills++;
    else if (victimOwner !== "player" || attackerOwner == null) metrics.unattributedKills++;
  }
  return previousRemoveEntity.call(this, entity);
};

RTSWorld.prototype.tick = function skirmishMetricsTick(time, dt) {
  const result = previousTick.call(this, time, dt);
  const metrics = ensureMetrics(this);
  observeEntities(this);
  const hasPlayerCapital = living(this, "player", "capital").length > 0;
  if (hasPlayerCapital && !metrics.active) metrics.active = true;
  if (metrics.active && !metrics.result) metrics.elapsed += Number(dt || 0);
  metrics.uiClock += Number(dt || 0);
  if (metrics.uiClock >= .2) {
    metrics.uiClock = 0;
    const resultValue = resultText();
    if (metrics.active && resultValue && !metrics.result) {
      metrics.result = resultValue;
      renderResults(this);
    }
  }
  return result;
};

trackOrderClicks();
