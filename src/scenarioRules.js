export const RULE_EVENTS = [
  ["map.start", "Map starts"],
  ["timer.elapsed", "Timer elapsed"],
  ["zone.enter", "Entity enters zone"],
  ["zone.leave", "Entity leaves zone"],
  ["site.captured", "Strategic site captured"],
  ["object.destroyed", "Object destroyed"],
  ["resource.reached", "Resource threshold reached"],
  ["age.reached", "Age reached"],
  ["objective.completed", "Objective completed"],
  ["variable.changed", "Variable changed"],
  ["manual", "Manual / scripted event"]
].map(([id, label]) => ({ id, label }));

export const CONDITION_TYPES = [
  ["always", "Always"],
  ["owner.is", "Owner is"],
  ["faction.is", "Faction is"],
  ["age.atLeast", "Age is at least"],
  ["resource.atLeast", "Resource is at least"],
  ["resource.atMost", "Resource is at most"],
  ["variable.equals", "Variable equals"],
  ["variable.atLeast", "Variable is at least"],
  ["tag.present", "Event object has tag"],
  ["objective.complete", "Objective is complete"],
  ["object.alive", "Object is alive"],
  ["object.destroyed", "Object is destroyed"]
].map(([id, label]) => ({ id, label }));

export const ACTION_TYPES = [
  ["message.show", "Show message"],
  ["resource.add", "Add resource"],
  ["resource.set", "Set resource"],
  ["variable.set", "Set variable"],
  ["variable.add", "Add to variable"],
  ["object.enable", "Enable object"],
  ["object.disable", "Disable object"],
  ["object.owner", "Change object owner"],
  ["object.skin", "Change object skin"],
  ["spawn.formation", "Spawn formation"],
  ["spawn.decoration", "Spawn decoration"],
  ["objective.complete", "Complete objective"],
  ["objective.fail", "Fail objective"],
  ["victory", "Declare victory"],
  ["defeat", "Declare defeat"],
  ["camera.focus", "Focus camera"],
  ["weather.set", "Set weather / ambience"],
  ["diplomacy.set", "Set diplomacy"],
  ["rule.emit", "Emit custom event"]
].map(([id, label]) => ({ id, label }));

export function createRule(index = 1) {
  return {
    id: `rule-${index}`,
    name: `Rule ${index}`,
    enabled: true,
    once: false,
    priority: 0,
    cooldown: 0,
    event: { type: "map.start", subject: "self", value: null },
    conditions: [],
    actions: [{ type: "message.show", text: "Scenario rule fired." }],
    notes: ""
  };
}

export function normalizeRule(rule, index = 0) {
  const base = createRule(index + 1);
  return {
    ...base,
    ...(rule || {}),
    enabled: rule?.enabled !== false,
    once: Boolean(rule?.once),
    priority: Number(rule?.priority) || 0,
    cooldown: Math.max(0, Number(rule?.cooldown) || 0),
    event: { ...base.event, ...(rule?.event || {}) },
    conditions: Array.isArray(rule?.conditions) ? rule.conditions.map(item => ({ ...item })) : [],
    actions: Array.isArray(rule?.actions) ? rule.actions.map(item => ({ ...item })) : []
  };
}

export function validateRule(rule) {
  const normalized = normalizeRule(rule);
  const errors = [];
  const warnings = [];
  if (!normalized.id) errors.push("Rule id is required.");
  if (!RULE_EVENTS.some(event => event.id === normalized.event?.type)) errors.push(`Unknown event: ${normalized.event?.type}`);
  if (normalized.actions.length === 0) warnings.push("Rule has no actions.");
  for (const condition of normalized.conditions) {
    if (!CONDITION_TYPES.some(type => type.id === condition.type)) warnings.push(`Unknown condition: ${condition.type}`);
  }
  for (const action of normalized.actions) {
    if (!ACTION_TYPES.some(type => type.id === action.type)) warnings.push(`Unknown action: ${action.type}`);
  }
  return { valid: errors.length === 0, errors, warnings, rule: normalized };
}

export function conditionPasses(condition, context = {}) {
  const c = condition || { type: "always" };
  const eventObject = context.eventObject || null;
  switch (c.type) {
    case "always": return true;
    case "owner.is": return (eventObject?.owner || context.owner) === c.owner;
    case "faction.is": return context.factionId === c.factionId;
    case "age.atLeast": return Number(context.age || 0) >= Number(c.age || 0);
    case "resource.atLeast": return Number(context.resources?.[c.resource] || 0) >= Number(c.value || 0);
    case "resource.atMost": return Number(context.resources?.[c.resource] || 0) <= Number(c.value || 0);
    case "variable.equals": return compareValue(context.variables?.[c.key], c.value);
    case "variable.atLeast": return Number(context.variables?.[c.key] || 0) >= Number(c.value || 0);
    case "tag.present": return Array.isArray(eventObject?.tags) && eventObject.tags.includes(c.tag);
    case "objective.complete": return Boolean(context.objectives?.[c.objectiveId]?.complete);
    case "object.alive": return Boolean(context.objects?.[c.objectId]?.alive);
    case "object.destroyed": return context.objects?.[c.objectId]?.alive === false;
    default: return false;
  }
}

function compareValue(actual, expected) {
  if (typeof expected === "number") return Number(actual) === expected;
  if (typeof expected === "boolean") return Boolean(actual) === expected;
  return String(actual ?? "") === String(expected ?? "");
}

export class ScenarioRuleEngine {
  constructor(adapter = {}) {
    this.adapter = adapter;
    this.rules = [];
    this.variables = {};
    this.fired = new Set();
    this.lastFiredAt = new Map();
    this.clock = 0;
    this.queue = [];
  }

  load(map) {
    this.rules = [
      ...(map?.globalRules || []).map(normalizeRule),
      ...collectObjectRules(map)
    ].filter(rule => rule.enabled).sort((a, b) => b.priority - a.priority);
    this.variables = { ...(map?.variables || {}) };
    this.fired.clear();
    this.lastFiredAt.clear();
    this.clock = 0;
    this.queue.length = 0;
  }

  emit(type, payload = {}) {
    this.queue.push({ type, ...payload, at: this.clock });
  }

  start(payload = {}) {
    this.emit("map.start", payload);
  }

  update(dt, baseContext = {}) {
    this.clock += Math.max(0, Number(dt) || 0);
    this.emitElapsedTimers();
    let guard = 0;
    while (this.queue.length && guard++ < 100) {
      const event = this.queue.shift();
      this.processEvent(event, baseContext);
    }
  }

  emitElapsedTimers() {
    for (const rule of this.rules) {
      if (rule.event?.type !== "timer.elapsed") continue;
      const seconds = Math.max(0, Number(rule.event.seconds ?? rule.event.value) || 0);
      const key = `${rule.id}:timer`;
      if (this.clock >= seconds && !this.fired.has(key)) {
        this.fired.add(key);
        this.emit("timer.elapsed", { seconds, ruleTimerId: rule.id });
      }
    }
  }

  processEvent(event, baseContext) {
    const context = {
      ...baseContext,
      ...this.adapter.getContext?.(),
      variables: this.variables,
      event,
      eventObject: event.object || event.site || null
    };

    for (const rule of this.rules) {
      if (!rule.enabled || rule.event?.type !== event.type) continue;
      if (event.ruleTimerId && event.ruleTimerId !== rule.id) continue;
      if (rule.once && this.fired.has(rule.id)) continue;
      const last = this.lastFiredAt.get(rule.id) ?? -Infinity;
      if (this.clock - last < rule.cooldown) continue;
      if (!this.eventMatches(rule.event, event)) continue;
      if (!rule.conditions.every(condition => conditionPasses(condition, context))) continue;

      this.lastFiredAt.set(rule.id, this.clock);
      if (rule.once) this.fired.add(rule.id);
      for (const action of rule.actions) this.execute(action, context);
    }
  }

  eventMatches(pattern = {}, event = {}) {
    if (pattern.subject && pattern.subject !== "self" && pattern.subject !== "any") {
      const subject = event.object?.id || event.site?.id || event.objectId || event.subject;
      if (subject !== pattern.subject) return false;
    }
    if (pattern.owner && pattern.owner !== "any" && event.owner !== pattern.owner) return false;
    if (pattern.value != null && event.value != null && !compareValue(event.value, pattern.value)) return false;
    return true;
  }

  execute(action, context) {
    const a = action || {};
    switch (a.type) {
      case "variable.set":
        this.variables[a.key] = a.value;
        this.emit("variable.changed", { key: a.key, value: a.value });
        break;
      case "variable.add": {
        const value = Number(this.variables[a.key] || 0) + Number(a.value || 0);
        this.variables[a.key] = value;
        this.emit("variable.changed", { key: a.key, value });
        break;
      }
      case "rule.emit":
        this.emit(a.eventType || "manual", { subject: a.subject, value: a.value });
        break;
      default:
        this.adapter.performAction?.(a, { ...context, variables: this.variables, emit: (type, payload) => this.emit(type, payload) });
    }
  }
}

function collectObjectRules(map) {
  const collections = ["strategicSites", "resourceZones", "terrainStamps", "decorations", "ruleZones", "surfacePaint"];
  const rules = [];
  for (const key of collections) {
    for (const object of map?.[key] || []) {
      for (const [index, rule] of (object.rules || []).entries()) {
        const normalized = normalizeRule(rule, index);
        normalized.id = normalized.id || `${object.id}-rule-${index + 1}`;
        normalized.event = { subject: object.id, ...normalized.event };
        rules.push(normalized);
      }
    }
  }
  return rules;
}
