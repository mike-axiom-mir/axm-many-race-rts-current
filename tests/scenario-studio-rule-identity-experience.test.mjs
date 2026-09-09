import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { ScenarioRuleEngine, validateScenarioMapRuleIdentity } from "../src/scenarioRules.js";

function rule(id) {
  return {
    id,
    name: id || "Missing id",
    enabled: true,
    once: false,
    priority: 0,
    cooldown: 0,
    event: { type: "map.start", subject: "self" },
    conditions: [],
    actions: [{ type: "message.show", text: "ok" }]
  };
}

test("authoring validator rejects duplicate global runtime ids", () => {
  const result = validateScenarioMapRuleIdentity({ globalRules: [rule("alpha"), rule("alpha")] });
  assert.equal(result.valid, false);
  assert.deepEqual(result.errors, [{ code: "RULE_ID_DUPLICATE", index: 1, id: "alpha" }]);
});

test("authoring validator uses the runtime object namespace when finding collisions", () => {
  const map = {
    globalRules: [rule("zone-a:rule-1")],
    ruleZones: [{ id: "zone-a", rules: [rule("rule-1")] }]
  };
  const result = validateScenarioMapRuleIdentity(map);
  assert.equal(result.valid, false);
  assert.deepEqual(result.errors, [{ code: "RULE_ID_DUPLICATE", index: 1, id: "zone-a:rule-1" }]);
});

test("authoring admission and runtime admission agree on a valid namespaced map", () => {
  const map = {
    globalRules: [rule("opening")],
    ruleZones: [
      { id: "north", rules: [rule("capture")] },
      { id: "south", rules: [rule("capture")] }
    ]
  };
  assert.equal(validateScenarioMapRuleIdentity(map).valid, true);
  assert.doesNotThrow(() => new ScenarioRuleEngine().load(map));
});

test("Scenario Studio exposes repairable ids and gates outbound actions through runtime identity", () => {
  const source = readFileSync(new URL("../src/scenarioStudio.js", import.meta.url), "utf8");
  assert.match(source, /data-r=\"id\"/);
  assert.match(source, /Runtime ID:/);
  assert.match(source, /validateScenarioMapRuleIdentity\(state\.map\)/);
  assert.match(source, /admitRuleIdentity\(\"export\"\)/);
  assert.match(source, /admitRuleIdentity\(\"copy\"\)/);
  assert.match(source, /admitRuleIdentity\(\"play\"\)/);
  assert.match(source, /createUniqueRule\(state\.map\.globalRules\)/);
});
