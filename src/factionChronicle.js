import { MatchStatsStore, factionStats, readMatchStats, statsOverview, exportMatchStatsSnapshot } from "./matchStatsStore.js";

const $ = id => document.getElementById(id);
const ui = {
  controller: $("controllerFilter"), mode: $("modeFilter"), sort: $("sortFilter"),
  trackedMatches: $("trackedMatches"), factionsUsed: $("factionsUsed"), favoriteFaction: $("favoriteFaction"), trackedTime: $("trackedTime"),
  storage: $("storageState"), summary: $("filterSummary"), empty: $("emptyState"), grid: $("factionGrid"), recent: $("recentMatches"), export: $("exportBtn")
};

function esc(value) {
  return String(value ?? "").replace(/[&<>\"]/g, char => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;" }[char]));
}

function formatDuration(seconds) {
  const total = Math.max(0, Math.floor(Number(seconds || 0)));
  const hours = Math.floor(total / 3600);
  const minutes = Math.floor((total % 3600) / 60);
  const secs = total % 60;
  if (hours) return `${hours}h ${String(minutes).padStart(2, "0")}m`;
  return `${minutes}:${String(secs).padStart(2, "0")}`;
}

function formatNumber(value) {
  const number = Math.max(0, Number(value || 0));
  return number >= 1000000 ? `${(number / 1000000).toFixed(1)}m` : number >= 1000 ? `${(number / 1000).toFixed(1)}k` : String(Math.round(number));
}

function filterOptions() {
  const options = {};
  if (ui.controller.value !== "all") options.controller = ui.controller.value;
  if (ui.mode.value !== "all") options.mode = ui.mode.value;
  return options;
}

function participantMatches(participant, options) {
  if (options.controller && participant.controller !== options.controller) return false;
  return true;
}

function filteredMatches(options) {
  const ledger = readMatchStats();
  return ledger.matches.filter(match => {
    if (options.mode && match.mode !== options.mode) return false;
    return (match.participants || []).some(participant => participantMatches(participant, options));
  });
}

function sortedFactions(options) {
  const rows = factionStats(options);
  const sort = ui.sort.value;
  return [...rows].sort((a, b) => {
    if (sort === "wins") return b.wins - a.wins || b.matches - a.matches;
    if (sort === "win-rate") return b.winRate - a.winRate || b.matches - a.matches;
    if (sort === "damage") return b.damage - a.damage || b.matches - a.matches;
    if (sort === "time") return b.timeSeconds - a.timeSeconds || b.matches - a.matches;
    return b.matches - a.matches || b.wins - a.wins;
  });
}

function modeLabel(id) {
  if (id === "defend-workshop") return "Workshop";
  if (id === "skirmish") return "Skirmish";
  return String(id || "Other").replace(/-/g, " ");
}

function resultClass(result) {
  const value = String(result || "").toLowerCase();
  if (["victory", "win", "won"].includes(value)) return "result-win";
  if (["defeat", "loss", "lost"].includes(value)) return "result-loss";
  return "result-other";
}

function controllerLabel(value) {
  if (value === "faction-ai") return "Faction AI";
  if (value === "connected-ai") return "Connected AI";
  if (value === "human") return "Human";
  return value || "All controllers";
}

function renderOverview(options, factions, matches) {
  const overview = statsOverview(options);
  ui.trackedMatches.textContent = String(matches.length);
  ui.factionsUsed.textContent = String(factions.length);
  ui.favoriteFaction.textContent = overview.favoriteFaction?.factionName || "—";
  ui.trackedTime.textContent = formatDuration(matches.reduce((sum, match) => sum + Number(match.durationSeconds || 0), 0));
  ui.storage.textContent = MatchStatsStore.storageAvailable() ? "LOCAL READY" : "UNAVAILABLE";
  ui.storage.style.color = MatchStatsStore.storageAvailable() ? "" : "var(--danger)";
  const controller = ui.controller.value === "all" ? "All controllers" : controllerLabel(ui.controller.value);
  const mode = ui.mode.value === "all" ? "all modes" : modeLabel(ui.mode.value);
  ui.summary.textContent = `${controller} • ${mode}`;
}

function factionCard(row) {
  const rate = row.matches ? Math.round(row.winRate * 100) : 0;
  const modes = Object.entries(row.modes || {}).sort((a, b) => b[1] - a[1]).map(([mode, count]) => `<span>${esc(modeLabel(mode))} ×${count}</span>`).join("");
  const optional = [];
  if (row.averageMapDomination !== null && row.averageMapDomination !== undefined) optional.push(`<div><span>Avg domination</span><b>${row.averageMapDomination > 0 ? "+" : ""}${Math.round(row.averageMapDomination)}%</b></div>`);
  if (row.bestWavesCleared > 0) optional.push(`<div><span>Best waves</span><b>${row.bestWavesCleared}</b></div>`);
  if (row.averageWorkshopIntegrity !== null && row.averageWorkshopIntegrity !== undefined) optional.push(`<div><span>Avg workshop</span><b>${Math.round(row.averageWorkshopIntegrity)}%</b></div>`);
  return `<article class="faction-card glass">
    <div class="title-row"><div><h3>${esc(row.factionName)}</h3><div class="record">${row.matches} match${row.matches === 1 ? "" : "es"} • ${row.wins}W / ${row.losses}L</div></div><div class="win-rate">${rate}%</div></div>
    <div class="mini-grid">
      <div><span>Play time</span><b>${formatDuration(row.timeSeconds)}</b></div>
      <div><span>Field damage</span><b>${formatNumber(row.damage)}</b></div>
      <div><span>Direct kills</span><b>${row.kills}</b></div>
      <div><span>Formations</span><b>${row.formationsFielded}</b></div>
      <div><span>Lost</span><b>${row.formationsLost}</b></div>
      <div><span>Orders</span><b>${row.orders}</b></div>
      ${optional.join("")}
    </div>
    <div class="mode-tags">${modes || "<span>No mode data</span>"}</div>
  </article>`;
}

function renderFactions(factions) {
  ui.empty.classList.toggle("hidden", factions.length > 0);
  ui.grid.innerHTML = factions.map(factionCard).join("");
}

function matchingParticipants(match, options) {
  return (match.participants || []).filter(participant => participantMatches(participant, options));
}

function recentRow(match, options) {
  const participants = matchingParticipants(match, options);
  const participantText = participants.map(participant => `${participant.factionName} · ${controllerLabel(participant.controller)}`).join(" / ") || "—";
  const damage = participants.reduce((sum, participant) => sum + Number(participant.damage || 0), 0);
  let context = match.mapName || match.mapId || "—";
  if (match.mode === "defend-workshop") context = `${match.difficulty || "standard"} • ${match.wavesCleared || 0} waves`;
  const when = match.recordedAt ? new Date(match.recordedAt) : null;
  const whenText = when && !Number.isNaN(when.getTime()) ? when.toLocaleString([], { year:"numeric", month:"short", day:"2-digit", hour:"2-digit", minute:"2-digit" }) : "Unknown";
  return `<tr><td>${esc(whenText)}</td><td>${esc(modeLabel(match.mode))}</td><td>${esc(participantText)}</td><td class="${resultClass(match.result)}">${esc(match.result || "unknown")}</td><td>${esc(context)}</td><td>${formatDuration(match.durationSeconds)}</td><td>${formatNumber(damage)}</td></tr>`;
}

function renderRecent(matches, options) {
  const rows = [...matches].sort((a, b) => String(b.recordedAt).localeCompare(String(a.recordedAt))).slice(0, 25);
  ui.recent.innerHTML = rows.length ? rows.map(match => recentRow(match, options)).join("") : `<tr><td colspan="7">No match receipts for this filter yet.</td></tr>`;
}

function render() {
  const options = filterOptions();
  const matches = filteredMatches(options);
  const factions = sortedFactions(options);
  renderOverview(options, factions, matches);
  renderFactions(factions);
  renderRecent(matches, options);
}

function exportJson() {
  const snapshot = exportMatchStatsSnapshot();
  const blob = new Blob([JSON.stringify(snapshot, null, 2)], { type: "application/json" });
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.download = `axm-faction-chronicle-${new Date().toISOString().slice(0,10)}.json`;
  document.body.appendChild(link);
  link.click();
  link.remove();
  setTimeout(() => URL.revokeObjectURL(url), 0);
}

ui.controller.addEventListener("change", render);
ui.mode.addEventListener("change", render);
ui.sort.addEventListener("change", render);
ui.export.addEventListener("click", exportJson);
render();
