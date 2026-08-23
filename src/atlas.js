import { ATLAS_TYPES, atlasType, getAtlasEntries } from "./atlasRegistry.js";

const $ = id => document.getElementById(id);
const ui = { search: $("search"), filters: $("typeFilters"), list: $("entryList"), title: $("resultTitle"), count: $("resultCount"), empty: $("emptyDetail"), detail: $("detailBody") };
let entries = getAtlasEntries();
let type = "all";
let selectedId = null;

function esc(value) { return String(value ?? "").replace(/[&<>"]/g, c => ({ "&":"&amp;", "<":"&lt;", ">":"&gt;", '"':"&quot;" }[c])); }

function haystack(entry) {
  return [entry.name, entry.subtitle, entry.summary, entry.factionId, ...(entry.tags || []), ...Object.keys(entry.stats || {}), ...Object.values(entry.stats || {}), ...(entry.sections || []).flatMap(s => [s.title, s.body])].join(" ").toLowerCase();
}

function filtered() {
  const q = ui.search.value.trim().toLowerCase();
  return entries.filter(entry => (type === "all" || entry.type === type) && (!q || haystack(entry).includes(q)));
}

function counts() {
  const map = new Map();
  for (const entry of entries) map.set(entry.type, (map.get(entry.type) || 0) + 1);
  return map;
}

function renderFilters() {
  const byType = counts();
  ui.filters.innerHTML = "";
  const options = [{ id: "all", label: "Everything", icon: "◇" }, ...ATLAS_TYPES];
  for (const option of options) {
    const button = document.createElement("button");
    button.className = `type-filter ${type === option.id ? "active" : ""}`;
    const count = option.id === "all" ? entries.length : (byType.get(option.id) || 0);
    button.innerHTML = `<span>${esc(option.icon)} &nbsp;${esc(option.label)}</span><small>${count}</small>`;
    button.addEventListener("click", () => { type = option.id; render(); });
    ui.filters.appendChild(button);
  }
}

function renderList() {
  const rows = filtered();
  const typeLabel = type === "all" ? "All entries" : atlasType(type).label;
  ui.title.textContent = typeLabel;
  ui.count.textContent = `${rows.length} of ${entries.length}`;
  ui.list.innerHTML = "";

  if (!rows.length) {
    ui.list.innerHTML = `<div style="padding:30px;text-align:center;color:#99adbf">Nothing matches this Atlas filter yet.</div>`;
    return;
  }

  for (const entry of rows) {
    const row = document.createElement("div");
    row.className = `entry ${entry.id === selectedId ? "active" : ""}`;
    row.innerHTML = `<div class="entry-icon">${esc(entry.icon)}</div><div><b>${esc(entry.name)}</b><p>${esc(entry.subtitle)}${entry.factionId ? ` • ${esc(entry.factionId)}` : ""}</p></div><span class="chip">${esc(atlasType(entry.type).label)}</span>`;
    row.addEventListener("click", () => { selectedId = entry.id; renderList(); renderDetail(entry); });
    ui.list.appendChild(row);
  }
}

function renderDetail(entry) {
  if (!entry) {
    ui.empty.classList.remove("hidden");
    ui.detail.classList.add("hidden");
    return;
  }
  ui.empty.classList.add("hidden");
  ui.detail.classList.remove("hidden");
  const stats = Object.entries(entry.stats || {}).filter(([, value]) => value !== undefined && value !== null && value !== "");
  const tags = (entry.tags || []).slice(0, 18);
  ui.detail.innerHTML = `
    <div class="detail-hero"><div class="icon">${esc(entry.icon)}</div><div><div class="eyebrow">${esc(atlasType(entry.type).label)}</div><h2>${esc(entry.name)}</h2><div class="subtitle">${esc(entry.subtitle)}</div></div></div>
    <p class="summary">${esc(entry.summary)}</p>
    ${tags.length ? `<div class="tags">${tags.map(tag => `<span class="tag">${esc(tag)}</span>`).join("")}</div>` : ""}
    ${stats.length ? `<div class="stats">${stats.map(([key,value]) => `<div class="stat"><span>${esc(key)}</span><b>${esc(value)}</b></div>`).join("")}</div>` : ""}
    ${(entry.sections || []).map(section => `<section class="section"><h3>${esc(section.title)}</h3><p>${esc(section.body)}</p></section>`).join("")}
    <section class="section"><h3>Atlas source</h3><p>Atlas is a reader, not the source authority. This entry was generated or registered from game/content data under source key <b>${esc(entry.source || "unspecified")}</b>.</p></section>`;
}

function render() {
  entries = getAtlasEntries();
  renderFilters();
  renderList();
  if (selectedId) renderDetail(entries.find(entry => entry.id === selectedId) || null);
}

ui.search.addEventListener("input", renderList);
window.addEventListener("axm-atlas-updated", render);
render();
