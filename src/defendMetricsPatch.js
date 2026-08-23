import { DEFEND_DIFFICULTIES, DEFEND_UPGRADES } from "./defendConfig.js";

let timer = null;

function esc(value) {
  return String(value ?? "").replace(/[&<>\"]/g, char => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;" }[char]));
}

function formatTime(seconds) {
  const total = Math.max(0, Math.floor(Number(seconds || 0)));
  const minutes = Math.floor(total / 60);
  const secs = total % 60;
  return `${minutes}:${String(secs).padStart(2, "0")}`;
}

function injectStyle() {
  if (document.getElementById("axmDefendMetricsStyle")) return;
  const style = document.createElement("style");
  style.id = "axmDefendMetricsStyle";
  style.textContent = `
    #endPanel.metrics-expanded{width:min(980px,calc(100vw - 24px));max-height:86vh;overflow:auto;text-align:left}
    #endPanel.metrics-expanded>h2,#endPanel.metrics-expanded>#endText,#endPanel.metrics-expanded>#endKicker{text-align:center}
    #matchMetrics{margin-top:14px}
    .metric-tabs{display:flex;gap:5px;flex-wrap:wrap;justify-content:center;margin-bottom:10px}
    .metric-tabs button{min-width:100px;font-size:9px;text-transform:uppercase;letter-spacing:.08em}
    .metric-tabs button.active{border-color:var(--accent);background:#1b4055}
    .metric-hero{display:grid;grid-template-columns:repeat(4,minmax(0,1fr));gap:7px;margin-bottom:9px}
    .metric-card{padding:9px;border-radius:10px;background:rgba(255,255,255,.04);border:1px solid rgba(255,255,255,.07);min-width:0}
    .metric-card span{display:block;color:var(--muted);font-size:8px;text-transform:uppercase;letter-spacing:.08em}
    .metric-card b{display:block;font-size:18px;margin-top:2px;overflow-wrap:anywhere}
    .metric-callout{padding:9px 11px;border:1px solid rgba(231,198,106,.28);border-radius:10px;background:rgba(231,198,106,.07);margin:8px 0;color:#eadca9;font-size:10px}
    .metric-section h3{font-size:11px;text-transform:uppercase;letter-spacing:.1em;color:#c7dce8;margin:12px 0 6px}
    .metric-table-wrap{overflow-x:auto;border:1px solid rgba(255,255,255,.07);border-radius:10px}
    .metric-table{width:100%;border-collapse:collapse;min-width:560px;font-size:9px}
    .metric-table th,.metric-table td{padding:7px 8px;border-bottom:1px solid rgba(255,255,255,.055);text-align:right;white-space:nowrap}
    .metric-table th:first-child,.metric-table td:first-child{text-align:left}
    .metric-table th{color:var(--muted);font-size:8px;text-transform:uppercase;letter-spacing:.07em;background:rgba(255,255,255,.025)}
    .metric-table tr:last-child td{border-bottom:0}
    .metric-note{color:var(--muted);font-size:8px;margin-top:7px}
    .metric-good{color:var(--good)}.metric-bad{color:var(--danger)}
    @media(max-width:700px){.metric-hero{grid-template-columns:repeat(2,minmax(0,1fr))}.metric-tabs button{min-width:0;flex:1}.metric-card b{font-size:15px}}
  `;
  document.head.appendChild(style);
}

function seatEntry(state, seat) {
  return {
    id: seat.id,
    label: seat.label || seat.id,
    factionId: seat.factionId,
    controller: seat.controller,
    damage: 0,
    kills: 0,
    recruited: 0,
    lost: 0,
    orders: 0
  };
}

function difficultyName(id) {
  return DEFEND_DIFFICULTIES[id]?.name || id || "Standard";
}

function upgradeById(id) {
  return DEFEND_UPGRADES.find(upgrade => upgrade.id === id) || null;
}

function teamDamage(metrics) {
  let maxHp = 0;
  let remaining = 0;
  for (const [entity, record] of metrics.enemyRecords.entries()) {
    maxHp += Number(record.maxHp || 0);
    if (entity?.parent && entity.userData?.hp > 0) remaining += Number(entity.userData.hp || 0);
  }
  return Math.max(0, maxHp - remaining);
}

function seatSurvivors(world, seatId) {
  return (world.entities || []).filter(entity =>
    entity?.parent && entity.userData?.hp > 0 && entity.userData?.owner === "player" && entity.userData?.seatId === seatId && entity.userData.type === "squad"
  ).length;
}

function teamSurvivors(world) {
  return (world.entities || []).filter(entity => entity?.parent && entity.userData?.hp > 0 && entity.userData?.owner === "player" && entity.userData.type === "squad").length;
}

function totalSeatMetric(metrics, key) {
  let total = 0;
  for (const seat of metrics.seats.values()) total += Number(seat[key] || 0);
  return total;
}

function tabButton(id, label, active) {
  return `<button type="button" data-metric-tab="${id}" class="${active === id ? "active" : ""}">${label}</button>`;
}

function summaryHtml(api, metrics) {
  const { state, world } = api;
  const workshopMax = Number(state.workshop?.userData?.maxHp || metrics.workshopMaxHp || 1);
  const workshopHp = state.workshop?.parent ? Math.max(0, Number(state.workshop.userData.hp || 0)) : 0;
  const integrity = Math.round(workshopHp / Math.max(1, workshopMax) * 100);
  const cleared = metrics.waveTimeline.length;
  const result = state.workshop?.parent && state.targetWaves > 0 && state.wave >= state.targetWaves ? "Victory" : state.ended && !state.workshop?.parent ? "Defeat" : state.ended ? "Run ended" : "Active";
  const wavesLabel = state.targetWaves > 0 ? `${cleared} / ${state.targetWaves}` : `${cleared}`;
  const timelineRows = metrics.waveTimeline.length
    ? metrics.waveTimeline.map(row => `<tr><td>Wave ${row.wave}</td><td>${formatTime(row.time)}</td><td>${Math.round(row.integrity)}%</td><td>${Math.round(row.reward)}</td></tr>`).join("")
    : `<tr><td colspan="4">No wave was cleared.</td></tr>`;
  return `
    <div class="metric-hero">
      <div class="metric-card"><span>Result</span><b class="${result === "Victory" ? "metric-good" : "metric-bad"}">${esc(result)}</b></div>
      <div class="metric-card"><span>Waves cleared</span><b>${wavesLabel}</b></div>
      <div class="metric-card"><span>Match time</span><b>${formatTime(metrics.elapsed)}</b></div>
      <div class="metric-card"><span>Workshop integrity</span><b>${integrity}%</b></div>
    </div>
    <div class="metric-callout"><b>MVP: Passive Supply.</b> It generated ${Math.floor(metrics.passiveEarned)} supply by simply showing up every second.</div>
    <div class="metric-hero">
      <div class="metric-card"><span>Difficulty</span><b>${esc(difficultyName(state.difficultyId))}</b></div>
      <div class="metric-card"><span>Peak hostiles</span><b>${metrics.peakHostiles}</b></div>
      <div class="metric-card"><span>Upgrades taken</span><b>${state.upgrades?.length || 0}</b></div>
      <div class="metric-card"><span>Peak towers</span><b>${metrics.peakTowers}</b></div>
    </div>
    <div class="metric-section"><h3>Wave timeline</h3><div class="metric-table-wrap"><table class="metric-table"><thead><tr><th>Milestone</th><th>Time</th><th>Integrity</th><th>Supply reward</th></tr></thead><tbody>${timelineRows}</tbody></table></div></div>`;
}

function militaryHtml(api, metrics) {
  const { world } = api;
  const damage = teamDamage(metrics);
  const fieldDamage = totalSeatMetric(metrics, "damage");
  const sharedDamage = Math.max(0, damage - fieldDamage);
  const recruited = totalSeatMetric(metrics, "recruited");
  const lost = totalSeatMetric(metrics, "lost");
  return `
    <div class="metric-hero">
      <div class="metric-card"><span>Enemy formations defeated</span><b>${metrics.enemiesDefeated}</b></div>
      <div class="metric-card"><span>Team damage dealt</span><b>${Math.round(damage)}</b></div>
      <div class="metric-card"><span>Allied formations lost</span><b>${lost}</b></div>
      <div class="metric-card"><span>Allied survivors</span><b>${teamSurvivors(world)}</b></div>
    </div>
    <div class="metric-hero">
      <div class="metric-card"><span>Seat field damage</span><b>${Math.round(fieldDamage)}</b></div>
      <div class="metric-card"><span>Shared defense damage</span><b>${Math.round(sharedDamage)}</b></div>
      <div class="metric-card"><span>Shared defense kills</span><b>${metrics.sharedDefenseKills}</b></div>
      <div class="metric-card"><span>Recruited formations</span><b>${recruited}</b></div>
    </div>
    <div class="metric-hero">
      <div class="metric-card"><span>Workshop damage taken</span><b>${Math.round(metrics.workshopDamageTaken)}</b></div>
      <div class="metric-card"><span>Manual repair actions</span><b>${metrics.repairs}</b></div>
      <div class="metric-card"><span>Manual repair restored</span><b>${Math.round(metrics.manualRepairHp)}</b></div>
      <div class="metric-card"><span>Towers lost</span><b>${metrics.towersLost}</b></div>
    </div>
    <p class="metric-note">Shared defense includes Workshop Guard Towers and other non-seat damage. Individual seat damage is measured from direct formation/founder attacks only; tower work is not assigned to a selected player.</p>`;
}

function economyHtml(api, metrics) {
  const { state } = api;
  const finalSupply = Math.max(0, Number(state.supply || 0));
  const earned = metrics.passiveEarned + metrics.waveRewards + metrics.cacheSupply;
  const spent = Math.max(0, metrics.startingSupply + earned - finalSupply);
  return `
    <div class="metric-hero">
      <div class="metric-card"><span>Starting supply</span><b>${Math.floor(metrics.startingSupply)}</b></div>
      <div class="metric-card"><span>Passive generated</span><b>${Math.floor(metrics.passiveEarned)}</b></div>
      <div class="metric-card"><span>Wave rewards</span><b>${Math.floor(metrics.waveRewards)}</b></div>
      <div class="metric-card"><span>Emergency caches</span><b>${Math.floor(metrics.cacheSupply)}</b></div>
    </div>
    <div class="metric-hero">
      <div class="metric-card"><span>Total earned after start</span><b>${Math.floor(earned)}</b></div>
      <div class="metric-card"><span>Estimated spent</span><b>${Math.floor(spent)}</b></div>
      <div class="metric-card"><span>Final supply</span><b>${Math.floor(finalSupply)}</b></div>
      <div class="metric-card"><span>Final passive rate</span><b>${Number(state.passiveRate || 0).toFixed(2)}/s</b></div>
    </div>
    <div class="metric-section"><h3>Shared economy truth</h3><div class="metric-callout">Supply is a <b>team resource</b>. The scoreboard does not divide it between seats or pretend one player personally earned the passive tick.</div></div>
    <p class="metric-note">Estimated spent is Starting Supply + tracked earned Supply − Final Supply. It covers recruitment, towers and repair spending without inventing per-seat ownership of the shared wallet.</p>`;
}

function playersHtml(api, metrics) {
  const { world } = api;
  const rows = [...metrics.seats.values()].map(seat => {
    const faction = world.__axmFactionByOwner?.player;
    const factionName = api.state.seats.find(item => item.id === seat.id)?.factionId || seat.factionId;
    return `<tr><td>${esc(seat.label)}<br><small>${esc(factionName)} • ${esc(seat.controller)}</small></td><td>${Math.round(seat.damage)}</td><td>${seat.kills}</td><td>${seat.recruited}</td><td>${seat.lost}</td><td>${seatSurvivors(world, seat.id)}</td><td>${seat.orders}</td></tr>`;
  }).join("");
  return `
    <div class="metric-section"><h3>Seat contribution</h3><div class="metric-table-wrap"><table class="metric-table"><thead><tr><th>Seat</th><th>Field damage</th><th>Last-hit kills</th><th>Recruited</th><th>Lost</th><th>Survivors</th><th>Orders</th></tr></thead><tbody>${rows || `<tr><td colspan="7">No active seats.</td></tr>`}</tbody></table></div></div>
    <p class="metric-note">“Last-hit kills” credits only a seat formation/founder that delivered the finishing combat hit. Tower kills remain Shared Defense kills. Orders count explicit human/connected-seat macro commands, not hidden AI thinking ticks.</p>`;
}

function renderResults(api, metrics) {
  injectStyle();
  const panel = document.getElementById("endPanel");
  if (!panel) return;
  panel.classList.add("metrics-expanded");
  let root = document.getElementById("matchMetrics");
  if (!root) {
    root = document.createElement("div");
    root.id = "matchMetrics";
    panel.querySelector(".end-actions")?.insertAdjacentElement("beforebegin", root);
  }
  metrics.resultsShown = true;
  metrics.activeTab ||= "summary";

  const draw = () => {
    const tabs = `<div class="metric-tabs">${tabButton("summary", "Summary", metrics.activeTab)}${tabButton("military", "Military", metrics.activeTab)}${tabButton("economy", "Economy", metrics.activeTab)}${tabButton("players", "Players", metrics.activeTab)}</div>`;
    let content = summaryHtml(api, metrics);
    if (metrics.activeTab === "military") content = militaryHtml(api, metrics);
    else if (metrics.activeTab === "economy") content = economyHtml(api, metrics);
    else if (metrics.activeTab === "players") content = playersHtml(api, metrics);
    root.innerHTML = `${tabs}<div class="metric-tab-content">${content}</div>`;
    for (const button of root.querySelectorAll("[data-metric-tab]")) button.addEventListener("click", () => {
      metrics.activeTab = button.dataset.metricTab;
      draw();
    });
  };
  draw();
}

function attachRepairTracking(api, metrics) {
  const button = document.getElementById("repairBtn");
  if (!button || button.dataset.axmMetricsBound) return;
  button.dataset.axmMetricsBound = "1";
  button.addEventListener("click", () => {
    if (!api.state.started || api.state.ended || !api.state.workshop?.parent) return;
    const beforeHp = Number(api.state.workshop.userData.hp || 0);
    const beforeSupply = Number(api.state.supply || 0);
    setTimeout(() => {
      const afterHp = Number(api.state.workshop?.userData?.hp || 0);
      const afterSupply = Number(api.state.supply || 0);
      if (afterHp > beforeHp && afterSupply < beforeSupply) {
        metrics.repairs++;
        metrics.manualRepairHp += afterHp - beforeHp;
      }
    }, 0);
  });
}

function attachOrderTracking(api, metrics) {
  if (document.documentElement.dataset.axmDefendMetricOrders) return;
  document.documentElement.dataset.axmDefendMetricOrders = "1";
  document.addEventListener("click", event => {
    const button = event.target?.closest?.("[data-command],[data-coop-sector]");
    if (!button || !api.state.started || api.state.ended) return;
    const action = button.dataset.coopSector;
    if (action === "reset") {
      for (const seat of api.state.seats || []) metrics.seats.get(seat.id) && metrics.seats.get(seat.id).orders++;
      return;
    }
    const entry = metrics.seats.get(api.state.activeSeatId);
    if (entry) entry.orders++;
  });
  window.addEventListener("axm-defend-seat-command", event => {
    const entry = metrics.seats.get(event.detail?.seatId);
    if (entry) entry.orders++;
  });
}

function observeEntities(api, metrics) {
  const { world, state } = api;
  for (const entity of world.entities || []) {
    if (!entity?.parent || entity.userData?.hp <= 0) continue;
    if (entity.userData.owner === "enemy" && entity.userData.type === "squad" && !metrics.seenEnemies.has(entity)) {
      metrics.seenEnemies.add(entity);
      metrics.enemiesSpawned++;
      metrics.enemyRecords.set(entity, { maxHp: Number(entity.userData.maxHp || entity.userData.hp || 0) });
    }
    if (entity.userData.owner === "player" && entity.userData.type === "squad" && entity.userData.seatId && entity.userData.seatId !== "workshop" && !metrics.seenAlliedSquads.has(entity)) {
      metrics.seenAlliedSquads.add(entity);
      const seat = metrics.seats.get(entity.userData.seatId);
      if (seat && metrics.baselineReady) seat.recruited++;
    }
    if (entity.userData.owner === "player" && entity.userData.role === "defense" && entity.userData.seatId === "workshop" && !metrics.seenTowers.has(entity)) {
      metrics.seenTowers.add(entity);
      if (metrics.baselineReady) metrics.towersBuilt++;
    }
  }
  metrics.peakHostiles = Math.max(metrics.peakHostiles, world.getLiving("enemy", "squad").length);
  metrics.peakTowers = Math.max(metrics.peakTowers, (state.towers || []).filter(tower => tower?.parent).length);
}

function observeEconomyAndWaves(api, metrics, dt) {
  const { state, world } = api;
  if (state.started && !state.ended) {
    metrics.elapsed += Number(dt || 0);
    metrics.passiveEarned += Number(state.passiveRate || 0) * Number(dt || 0);
  }

  const workshopHp = state.workshop?.parent ? Number(state.workshop.userData.hp || 0) : 0;
  if (metrics.previousWorkshopHp != null && workshopHp < metrics.previousWorkshopHp) metrics.workshopDamageTaken += metrics.previousWorkshopHp - workshopHp;
  metrics.previousWorkshopHp = workshopHp;
  metrics.workshopMaxHp = Math.max(metrics.workshopMaxHp, Number(state.workshop?.userData?.maxHp || 0));

  if (metrics.previousWaveActive && !state.waveActive && world.getLiving("enemy", "squad").length === 0 && state.waveSpec) {
    const reward = Math.round(Number(state.waveSpec.clearReward || 0) * Number(state.waveRewardMult || 1));
    metrics.waveRewards += reward;
    const maxHp = Math.max(1, Number(state.workshop?.userData?.maxHp || metrics.workshopMaxHp || 1));
    const hp = state.workshop?.parent ? Math.max(0, Number(state.workshop.userData.hp || 0)) : 0;
    if (!metrics.waveTimeline.some(row => row.wave === state.wave)) metrics.waveTimeline.push({ wave: state.wave, time: metrics.elapsed, integrity: hp / maxHp * 100, reward });
  }
  metrics.previousWaveActive = Boolean(state.waveActive);

  const upgrades = state.upgrades || [];
  while (metrics.previousUpgradeCount < upgrades.length) {
    const id = upgrades[metrics.previousUpgradeCount++];
    const upgrade = upgradeById(id);
    if (Number(upgrade?.effect?.supply) > 0) metrics.cacheSupply += Number(upgrade.effect.supply);
  }
}

function attach() {
  const api = window.__AXM_DEFEND_WORKSHOP__;
  if (!api?.world || !api?.state || api.__metricsPatched) return false;
  api.__metricsPatched = true;
  const { world, state } = api;
  const metrics = {
    startingSupply: Number(state.supply || 0), passiveEarned: 0, waveRewards: 0, cacheSupply: 0,
    elapsed: 0, workshopDamageTaken: 0, manualRepairHp: 0, repairs: 0, peakHostiles: 0,
    enemiesSpawned: 0, enemiesDefeated: 0, sharedDefenseKills: 0, towersBuilt: 0, towersLost: 0, peakTowers: 0,
    currentAttackerSeat: null, previousWorkshopHp: Number(state.workshop?.userData?.hp || 0), workshopMaxHp: Number(state.workshop?.userData?.maxHp || 0),
    previousWaveActive: Boolean(state.waveActive), previousUpgradeCount: (state.upgrades || []).length,
    seats: new Map((state.seats || []).map(seat => [seat.id, seatEntry(state, seat)])),
    seenEnemies: new WeakSet(), seenAlliedSquads: new WeakSet(), seenTowers: new WeakSet(), enemyRecords: new Map(), waveTimeline: [],
    baselineReady: false, resultsShown: false, activeTab: "summary"
  };

  observeEntities(api, metrics);
  metrics.baselineReady = true;

  const originalCombat = world.updateCombat.bind(world);
  world.updateCombat = function metricsCombat(entity, dt) {
    const seatId = entity?.userData?.owner === "player" ? entity.userData?.seatId : null;
    const seat = seatId ? metrics.seats.get(seatId) : null;
    if (!seat || (entity.userData.type !== "squad" && entity.userData.type !== "founder")) return originalCombat(entity, dt);
    const limit = Number(entity.userData.range || 1.2) + 3;
    const before = new Map();
    for (const target of this.entities || []) {
      if (!target?.parent || target.userData?.hp <= 0 || target.userData?.owner !== "enemy") continue;
      if (entity.position.distanceTo(target.position) <= limit + Number(target.userData.radius || 0)) before.set(target, Number(target.userData.hp || 0));
    }
    metrics.currentAttackerSeat = seatId;
    const result = originalCombat(entity, dt);
    metrics.currentAttackerSeat = null;
    for (const [target, hpBefore] of before.entries()) {
      const hpAfter = Number(target.userData?.hp || 0);
      if (hpAfter < hpBefore) seat.damage += Math.min(hpBefore, hpBefore - hpAfter);
    }
    return result;
  };

  const originalRemove = world.removeEntity.bind(world);
  world.removeEntity = function metricsRemove(entity) {
    if (entity?.userData?.owner === "enemy" && entity.userData.type === "squad") {
      metrics.enemiesDefeated++;
      const killer = metrics.currentAttackerSeat ? metrics.seats.get(metrics.currentAttackerSeat) : null;
      if (killer) killer.kills++;
      else metrics.sharedDefenseKills++;
    }
    if (entity?.userData?.owner === "player" && entity.userData.type === "squad" && entity.userData.seatId && entity.userData.seatId !== "workshop") {
      const seat = metrics.seats.get(entity.userData.seatId);
      if (seat) seat.lost++;
    }
    if (entity?.userData?.owner === "player" && entity.userData.role === "defense" && entity.userData.seatId === "workshop") metrics.towersLost++;
    return originalRemove(entity);
  };

  const originalTick = world.tick.bind(world);
  world.tick = function metricsTick(time, dt) {
    const result = originalTick(time, dt);
    observeEntities(api, metrics);
    observeEconomyAndWaves(api, metrics, dt);
    if (state.ended && !metrics.resultsShown) renderResults(api, metrics);
    return result;
  };

  attachRepairTracking(api, metrics);
  attachOrderTracking(api, metrics);
  api.metrics = metrics;
  api.getMatchMetrics = () => ({
    elapsed: metrics.elapsed,
    passiveEarned: metrics.passiveEarned,
    waveRewards: metrics.waveRewards,
    cacheSupply: metrics.cacheSupply,
    workshopDamageTaken: metrics.workshopDamageTaken,
    enemiesSpawned: metrics.enemiesSpawned,
    enemiesDefeated: metrics.enemiesDefeated,
    teamDamage: teamDamage(metrics),
    seats: [...metrics.seats.values()].map(seat => ({ ...seat, survivors: seatSurvivors(world, seat.id) })),
    waveTimeline: metrics.waveTimeline.map(row => ({ ...row }))
  });
  return true;
}

if (!attach()) {
  timer = setInterval(() => {
    if (attach() && timer) clearInterval(timer);
  }, 120);
}
