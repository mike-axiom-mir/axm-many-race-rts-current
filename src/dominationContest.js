import { FACTIONS } from "./factions.js";
import { territoryDefinition, territoriesAreAdjacent } from "./dominationWorld.js";
import { dominationGarrisonCount, updateDominationVictory } from "./dominationState.js";
import { mapSlotForTerritory } from "./dominationMapSlots.js";

function clone(value) { return JSON.parse(JSON.stringify(value)); }

function takeFromGarrison(territory, requested = []) {
  const result = [];
  for (const request of requested) {
    const entry = territory.garrison.find(item => item.id === request.id);
    if (!entry) continue;
    const amount = Math.max(0, Math.min(Number(request.count)||0, Number(entry.count)||0));
    if (!amount) continue;
    entry.count -= amount;
    result.push({ ...clone(entry), count: amount });
  }
  territory.garrison = territory.garrison.filter(item => Number(item.count||0) > 0);
  return result;
}

function defaultExpeditionSelection(territory) {
  return (territory.garrison||[]).map(item => ({ id:item.id, count:Math.max(1, Math.floor(Number(item.count||0)*.65)) }));
}

function neutralDefenders(targetId) {
  const definition = territoryDefinition(targetId);
  if (!definition) return [];
  const factionIds = Object.keys(FACTIONS);
  const factionId = factionIds[(definition.name.length + definition.cities.length) % factionIds.length];
  const faction = FACTIONS[factionId];
  const cityFactor = Math.max(1, definition.cities.length);
  return [
    { id:`neutral:${targetId}:line`, factionId, unitId:faction.units[0].id, count:Math.max(2, cityFactor), veterancy:0 },
    ...(faction.units[1] ? [{ id:`neutral:${targetId}:heavy`, factionId, unitId:faction.units[1].id, count:Math.max(1,Math.floor(cityFactor/2)), veterancy:0 }] : [])
  ];
}

export function startTerritoryContest(match, {
  sourceId,
  targetId,
  teamId,
  seatId = null,
  selection = null
} = {}) {
  const source = match.territories[sourceId];
  const target = match.territories[targetId];
  if (!source || !target) return { ok:false, error:"Unknown source or target territory." };
  if (source.owner !== teamId) return { ok:false, error:"Source territory is not controlled by that clan." };
  if (target.owner === teamId) return { ok:false, error:"Target territory is already friendly." };
  if (!territoriesAreAdjacent(sourceId,targetId)) return { ok:false, error:"Only neighboring territories can be contested." };
  if (source.lockedByContestId || target.lockedByContestId) return { ok:false, error:"One of these territories is already committed to another live contest." };
  if (dominationGarrisonCount(source) <= 0) return { ok:false, error:"Source territory has no local formations available." };

  const requested = selection?.length ? selection : defaultExpeditionSelection(source);
  const expedition = takeFromGarrison(source,requested);
  if (!expedition.length) return { ok:false, error:"No formations were selected for the expedition." };

  const now = Date.now();
  const contestId = `contest:${sourceId}:${targetId}:${now}`;
  const sourceDef = territoryDefinition(sourceId);
  const targetDef = territoryDefinition(targetId);
  const targetMap = mapSlotForTerritory(targetId);
  const defenderTeamId = target.owner || "neutral";
  const defenders = target.owner ? clone(target.garrison) : neutralDefenders(targetId);
  const attackingSeat = match.teams[teamId]?.seats.find(seat=>seat.id===seatId) || match.teams[teamId]?.seats.find(seat=>seat.id===source.controllerSeatId) || match.teams[teamId]?.seats[0];

  const contest = {
    id:contestId,
    createdAt:now,
    updatedAt:now,
    status:targetMap ? "ready" : "awaiting-map",
    sourceId,targetId,
    attacker:{teamId,seatId:attackingSeat?.id||seatId,factionId:source.factionId||attackingSeat?.factionId,forces:expedition},
    defender:{teamId:defenderTeamId,seatId:target.controllerSeatId||null,factionId:target.factionId||defenders[0]?.factionId||null,forces:defenders},
    cities:(targetDef?.cities||[]).map(city=>({id:city.id,name:city.name,owner:target.cities.find(item=>item.id===city.id)?.owner||"neutral",required:true})),
    battle:{
      mapRef:targetMap,
      battleMapPool:[...(targetDef?.battleMapPool||[])],
      victoryRule:"capture-territory-cities",
      sourceName:sourceDef?.name||sourceId,
      targetName:targetDef?.name||targetId
    },
    result:null
  };

  source.lockedByContestId = contestId;
  target.lockedByContestId = contestId;
  match.activeContests.push(contest);
  match.eventLog.push({at:now,type:"contest.started",text:`${match.teams[teamId]?.name||teamId} moved formations from ${sourceDef?.name||sourceId} into ${targetDef?.name||targetId}.`});
  return {ok:true,contest};
}

export function makeContestBattlePackage(match, contestId) {
  const contest = match.activeContests.find(item=>item.id===contestId);
  if (!contest) return null;
  return {
    schemaVersion:1,
    kind:"domination-territory-battle",
    id:`battle:${contest.id}`,
    dominationMatchId:match.id,
    contestId:contest.id,
    map:clone(contest.battle.mapRef),
    sourceTerritoryId:contest.sourceId,
    targetTerritoryId:contest.targetId,
    attacker:clone(contest.attacker),
    defender:clone(contest.defender),
    cityObjectives:clone(contest.cities),
    rules:{
      onlySourceExpedition:true,
      liveReinforcements:false,
      backgroundTerritoriesContinueProduction:true,
      localEconomyPaysProduction:true,
      victory:"capture-territory-cities"
    }
  };
}

function mergeForces(target, forces) {
  for (const force of forces||[]) {
    if (Number(force.count||0)<=0) continue;
    let existing = target.find(item=>item.factionId===force.factionId&&item.unitId===force.unitId&&Number(item.veterancy||0)===Number(force.veterancy||0));
    if (!existing) { existing={...clone(force),id:`return:${force.factionId}:${force.unitId}:${Date.now()}:${target.length}`}; target.push(existing); }
    else existing.count += Number(force.count||0);
  }
}

export function resolveTerritoryContest(match, contestId, result = {}) {
  const index = match.activeContests.findIndex(item=>item.id===contestId);
  if (index < 0) return {ok:false,error:"Contest not found."};
  const contest = match.activeContests[index];
  const source = match.territories[contest.sourceId];
  const target = match.territories[contest.targetId];
  const attackerWon = result.winner === contest.attacker.teamId;
  const defenderWon = !attackerWon;
  const now = Date.now();

  const attackerSurvivors = Array.isArray(result.attackerSurvivors) ? clone(result.attackerSurvivors) : (attackerWon ? clone(contest.attacker.forces) : []);
  const defenderSurvivors = Array.isArray(result.defenderSurvivors) ? clone(result.defenderSurvivors) : (defenderWon && contest.defender.teamId !== "neutral" ? clone(contest.defender.forces) : []);

  if (attackerWon) {
    target.owner = contest.attacker.teamId;
    target.controllerSeatId = contest.attacker.seatId;
    target.factionId = contest.attacker.factionId;
    target.productionUnitId = FACTIONS[target.factionId]?.units?.[0]?.id || target.productionUnitId;
    target.lastConqueredAt = now;
    target.garrison = [];
    mergeForces(target.garrison,attackerSurvivors);
    const cityResults = result.cities || {};
    target.cities = target.cities.map(city=>({
      ...city,
      owner:cityResults[city.id] || contest.attacker.teamId
    }));
  } else {
    if (target.owner) {
      target.garrison = [];
      mergeForces(target.garrison,defenderSurvivors);
    }
    mergeForces(source.garrison,attackerSurvivors);
  }

  source.lockedByContestId = null;
  target.lockedByContestId = null;
  contest.status = "resolved";
  contest.updatedAt = now;
  contest.result = {winner:result.winner||contest.defender.teamId,attackerWon,at:now};
  match.activeContests.splice(index,1);
  match.history.push(contest);
  match.eventLog.push({at:now,type:"contest.resolved",text:`${territoryDefinition(contest.targetId)?.name||contest.targetId} ${attackerWon?`was claimed by ${match.teams[contest.attacker.teamId]?.name||contest.attacker.teamId}`:"held its current line"}.`});
  updateDominationVictory(match);
  return {ok:true,contest};
}

export function cancelTerritoryContest(match, contestId) {
  const index = match.activeContests.findIndex(item=>item.id===contestId);
  if (index < 0) return false;
  const contest = match.activeContests[index];
  const source = match.territories[contest.sourceId];
  const target = match.territories[contest.targetId];
  mergeForces(source.garrison,contest.attacker.forces);
  source.lockedByContestId = null;
  target.lockedByContestId = null;
  match.activeContests.splice(index,1);
  match.eventLog.push({at:Date.now(),type:"contest.cancelled",text:`Expedition from ${territoryDefinition(contest.sourceId)?.name||contest.sourceId} stood down.`});
  return true;
}
