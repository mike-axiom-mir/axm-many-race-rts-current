import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";

const source = await readFile(new URL("../src/scenarioRules.js", import.meta.url), "utf8");
const moduleUrl = `data:text/javascript;base64,${Buffer.from(source).toString("base64")}`;
const { ScenarioRuleEngine, validateRuleSetIdentity } = await import(moduleUrl);

function variableAdd(key, value = 1) {
  return { type: "variable.add", key, value };
}

test("duplicate global rule IDs are rejected before runtime state is installed", () => {
  const engine = new ScenarioRuleEngine();
  const map = {
    variables: { first: 0, second: 0 },
    globalRules: [
      { id: "shared", once: true, event: { type: "manual" }, actions: [variableAdd("first")] },
      { id: "shared", once: true, event: { type: "manual" }, actions: [variableAdd("second")] }
    ]
  };

  assert.throws(
    () => engine.load(map),
    error => error?.code === "RULE_IDENTITY_INVALID" && /RULE_ID_DUPLICATE:shared/.test(error.message)
  );
  assert.deepEqual(engine.rules, []);
  assert.deepEqual(engine.variables, {});
});

test("global IDs cannot collide with namespaced object-local rule IDs", () => {
  const engine = new ScenarioRuleEngine();
  const map = {
    globalRules: [
      { id: "zone-1:rule-1", event: { type: "manual" }, actions: [variableAdd("global")] }
    ],
    ruleZones: [
      {
        id: "zone-1",
        rules: [
          { id: "rule-1", event: { type: "manual", subject: "any" }, actions: [variableAdd("local")] }
        ]
      }
    ]
  };

  assert.throws(
    () => engine.load(map),
    error => error?.code === "RULE_IDENTITY_INVALID" && /RULE_ID_DUPLICATE:zone-1:rule-1/.test(error.message)
  );
});

test("identity validator rejects blank/non-string IDs without normalizing them into authority", () => {
  assert.deepEqual(validateRuleSetIdentity([{ id: "ok" }, { id: "   " }, { id: 7 }]), {
    valid: false,
    errors: [
      { code: "RULE_ID_REQUIRED", index: 1, id: "   " },
      { code: "RULE_ID_REQUIRED", index: 2, id: 7 }
    ]
  });
});

test("unique rule identities preserve existing once and repeat behavior", () => {
  const engine = new ScenarioRuleEngine();
  engine.load({
    variables: { once: 0, repeat: 0 },
    globalRules: [
      { id: "once-rule", once: true, priority: 10, event: { type: "manual" }, actions: [variableAdd("once")] },
      { id: "repeat-rule", event: { type: "manual" }, actions: [variableAdd("repeat")] }
    ]
  });

  engine.emit("manual");
  engine.update(0);
  engine.emit("manual");
  engine.update(0);

  assert.deepEqual(engine.variables, { once: 1, repeat: 2 });
});
