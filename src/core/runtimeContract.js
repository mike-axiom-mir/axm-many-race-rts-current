export const RUNTIME_CAPABILITIES = Object.freeze([
  "simulation",
  "rendering",
  "commands",
  "economy",
  "combat",
  "vision",
  "terrain",
  "scenario-rules",
  "persistence"
]);

export function createRuntimeContract({ id, mode, projection, capabilities = [], notes = "" } = {}) {
  if (!id) throw new Error("Runtime contract requires an id.");
  const uniqueCapabilities = [...new Set(capabilities.map(String))];
  const unknown = uniqueCapabilities.filter(capability => !RUNTIME_CAPABILITIES.includes(capability));
  if (unknown.length) throw new Error(`Unknown runtime capabilities: ${unknown.join(", ")}`);

  return Object.freeze({
    version: 1,
    id: String(id),
    mode: String(mode || id),
    projection: projection === "globe" ? "globe" : "flat",
    capabilities: Object.freeze(uniqueCapabilities),
    notes: String(notes || "")
  });
}

export const RUNTIME_CONTRACTS = Object.freeze({
  skirmish: createRuntimeContract({
    id: "skirmish",
    projection: "flat",
    capabilities: ["simulation", "rendering", "commands", "economy", "combat", "vision", "terrain", "persistence"],
    notes: "Primary flat RTS runtime."
  }),
  defend: createRuntimeContract({
    id: "defend",
    projection: "flat",
    capabilities: ["simulation", "rendering", "commands", "economy", "combat", "terrain", "persistence"],
    notes: "Defense-mode runtime with cooperative sector extensions."
  }),
  globe: createRuntimeContract({
    id: "globe",
    projection: "globe",
    capabilities: ["simulation", "rendering", "commands", "economy", "combat", "terrain", "scenario-rules"],
    notes: "Spherical great-circle RTS runtime; never flatten its geometry contract."
  }),
  domination: createRuntimeContract({
    id: "domination",
    projection: "flat",
    capabilities: ["simulation", "rendering", "commands", "economy", "combat", "persistence"],
    notes: "Strategic domination layer plus battle adapter."
  })
});

export function runtimeContract(id) {
  return RUNTIME_CONTRACTS[String(id)] || null;
}
