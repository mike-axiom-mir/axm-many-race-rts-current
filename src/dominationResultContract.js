export const DOMINATION_BATTLE_RESULT_VERSION = 1;

function clone(value) {
  return JSON.parse(JSON.stringify(value));
}

function resultError(code, text) {
  return `${code}: ${text}`;
}

function forceIdentity(force) {
  const factionId = String(force?.factionId || "");
  const unitId = String(force?.unitId || "");
  const veterancy = Number(force?.veterancy || 0);
  return `${factionId}\u0000${unitId}\u0000${veterancy}`;
}

function validateSurvivors(label, survivors, stagedForces, errors) {
  if (survivors == null) return;
  if (!Array.isArray(survivors)) {
    errors.push(resultError("RESULT_SURVIVORS_NOT_ARRAY", `${label} survivors must be an array when provided.`));
    return;
  }

  const allowance = new Map();
  for (const force of Array.isArray(stagedForces) ? stagedForces : []) {
    const count = Number(force?.count || 0);
    if (!force?.factionId || !force?.unitId || !Number.isFinite(count) || count < 0) continue;
    const key = forceIdentity(force);
    allowance.set(key, (allowance.get(key) || 0) + count);
  }

  const consumed = new Map();
  survivors.forEach((force, index) => {
    if (!force || typeof force !== "object" || Array.isArray(force)) {
      errors.push(resultError("RESULT_SURVIVOR_INVALID", `${label} survivor ${index + 1} must be an object.`));
      return;
    }
    if (!force.factionId || !force.unitId) {
      errors.push(resultError("RESULT_SURVIVOR_IDENTITY_MISSING", `${label} survivor ${index + 1} must name factionId and unitId.`));
      return;
    }
    const veterancy = Number(force.veterancy || 0);
    if (!Number.isFinite(veterancy) || veterancy < 0) {
      errors.push(resultError("RESULT_SURVIVOR_VETERANCY_INVALID", `${label} survivor ${index + 1} has invalid veterancy.`));
      return;
    }
    const count = Number(force.count);
    if (!Number.isInteger(count) || count < 0) {
      errors.push(resultError("RESULT_SURVIVOR_COUNT_INVALID", `${label} survivor ${index + 1} count must be a non-negative integer.`));
      return;
    }

    const key = forceIdentity(force);
    if (!allowance.has(key)) {
      errors.push(resultError("RESULT_SURVIVOR_FORCE_UNKNOWN", `${label} survivor ${index + 1} was not present in the staged battle forces.`));
      return;
    }
    const next = (consumed.get(key) || 0) + count;
    if (next > allowance.get(key)) {
      errors.push(resultError("RESULT_SURVIVOR_COUNT_EXCEEDS_STAGED", `${label} survivor counts exceed the formations admitted to the battle.`));
      return;
    }
    consumed.set(key, next);
  });
}

function validateCityResults(packet, cities, errors) {
  if (cities == null) return;
  if (typeof cities !== "object" || Array.isArray(cities)) {
    errors.push(resultError("RESULT_CITIES_INVALID", "City results must be an object when provided."));
    return;
  }

  const knownCities = new Set((packet?.cityObjectives || []).map(city => city?.id).filter(Boolean));
  const allowedOwners = new Set([
    packet?.attacker?.teamId,
    packet?.defender?.teamId,
    "neutral"
  ].filter(Boolean));

  for (const [cityId, owner] of Object.entries(cities)) {
    if (!knownCities.has(cityId)) {
      errors.push(resultError("RESULT_CITY_UNKNOWN", `City result ${cityId} is not part of the staged battle.`));
      continue;
    }
    if (!allowedOwners.has(owner)) {
      errors.push(resultError("RESULT_CITY_OWNER_INVALID", `City result ${cityId} names an owner outside the participating sides.`));
    }
  }
}

export function validateDominationBattlePacket(packet) {
  const errors = [];
  const warnings = [];
  if (!packet || packet.kind !== "domination-territory-battle") errors.push("Not a World Domination territory battle packet.");
  if (!packet?.contestId) errors.push("Contest id is required.");
  if (!packet?.sourceTerritoryId || !packet?.targetTerritoryId) errors.push("Source and target territory ids are required.");
  if (!packet?.attacker?.teamId) errors.push("Attacking clan is required.");
  if (!Array.isArray(packet?.attacker?.forces) || !packet.attacker.forces.length) errors.push("Expedition packet contains no attacking formations.");
  if (!packet?.map) warnings.push("Target territory does not have a battle map attached yet.");
  if (!Array.isArray(packet?.cityObjectives) || !packet.cityObjectives.length) warnings.push("Territory has no city objectives.");
  return { valid: errors.length === 0, errors, warnings };
}

export function createDominationBattleResult(packet, overrides = {}) {
  const cities = Object.fromEntries((packet?.cityObjectives || []).map(city => [city.id, overrides.winner || packet?.defender?.teamId || "neutral"]));
  return {
    schemaVersion: DOMINATION_BATTLE_RESULT_VERSION,
    kind: "domination-territory-result",
    dominationMatchId: packet?.dominationMatchId || null,
    contestId: packet?.contestId || null,
    winner: overrides.winner || packet?.defender?.teamId || "neutral",
    attackerSurvivors: Array.isArray(overrides.attackerSurvivors) ? clone(overrides.attackerSurvivors) : [],
    defenderSurvivors: Array.isArray(overrides.defenderSurvivors) ? clone(overrides.defenderSurvivors) : [],
    cities: { ...cities, ...(overrides.cities || {}) },
    battleStats: { durationSeconds: 0, ...(overrides.battleStats || {}) },
    completedAt: Date.now()
  };
}

export function validateDominationBattleResult(packet, result) {
  const errors = [];
  const packetValidation = validateDominationBattlePacket(packet);
  if (!packetValidation.valid) {
    errors.push(...packetValidation.errors.map(error => resultError("STAGED_BATTLE_INVALID", error)));
  }
  if (!result || result.kind !== "domination-territory-result") errors.push(resultError("RESULT_KIND_INVALID", "Not a World Domination result packet."));
  if (result?.schemaVersion !== DOMINATION_BATTLE_RESULT_VERSION) errors.push(resultError("RESULT_SCHEMA_UNSUPPORTED", `Expected result schema ${DOMINATION_BATTLE_RESULT_VERSION}.`));
  if (result?.dominationMatchId !== packet?.dominationMatchId) errors.push(resultError("RESULT_MATCH_MISMATCH", "Result belongs to a different World Domination match."));
  if (result?.contestId !== packet?.contestId) errors.push(resultError("RESULT_CONTEST_MISMATCH", "Result contest id does not match the staged battle."));
  const allowedWinners = [packet?.attacker?.teamId, packet?.defender?.teamId].filter(Boolean);
  if (!allowedWinners.includes(result?.winner)) errors.push(resultError("RESULT_WINNER_INVALID", "Result winner is not one of the participating sides."));

  validateSurvivors("Attacker", result?.attackerSurvivors, packet?.attacker?.forces, errors);
  validateSurvivors("Defender", result?.defenderSurvivors, packet?.defender?.forces, errors);
  validateCityResults(packet, result?.cities, errors);
  return { valid: errors.length === 0, errors };
}

export function withValidatedDominationBattleResult(packet, result, onAccepted) {
  const validation = validateDominationBattleResult(packet, result);
  if (!validation.valid) return { ok: false, errors: validation.errors };
  return onAccepted();
}
