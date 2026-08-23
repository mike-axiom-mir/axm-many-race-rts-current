import { FACTIONS } from "./factions.js";
import {
  DOMINATION_MAX_TEAM_SEATS,
  DOMINATION_TERRITORIES,
  REALTIME_CATCHUP_LIMIT_SECONDS,
  RESERVE_PRODUCTION_STEP,
  territoryDefinition,
  territoriesAreAdjacent
} from "./dominationWorld.js";

export const DOMINATION_STORAGE_KEY = "axm.manyRaceRts.worldDomination.v1";
const RESOURCE_KEYS = ["food", "wood", "stone", "gold"];

function clone(value) {
  return JSON.parse(JSON.stringify(value));
}

function zeroResources() {
  return { food: 0, wood: 0, stone: 0, gold: 0 };
}

function createFinanceLedger() {
  return {
    grossIncome: zeroResources(),
    productionSpent: zeroResources(),
    treasuryTransferred: zeroResources(),
    projectedNetPerMinute: zeroResources(),
    formationsProduced: 0,
    blockedProductionCycles: 0
  };
}

export function createDominationSeat(teamId, index) {
  const factionIds = Object.keys(FACTIONS);
  return {
    id: `${teamId}-seat-${index + 1}`,
    teamId,
    slot: index + 1,
    controller: index === 0 ? "human" : "faction-ai",
    factionId: factionIds[(index + (teamId === "crimson" ? 2 : 0)) % factionIds.length],
    displayName: `${teamId === "azure" ? "Azure" : "Crimson"} ${index + 1}`,
    ready: true,
    connectedAI: { bridge: "unbound", sameInformationGate: true }
  };
}

function starterGarrison(territoryId, factionId) {
  const faction = FACTIONS[factionId];
  if (!faction) return [];
  return [{ id:`${territoryId}:starter`, factionId, unitId:faction.units[0].id, count:4, veterancy:0 }];
}

export function createDominationMatch(teamSize = 1) {
  const seatsPerTeam = Math.max(1, Math.min(DOMINATION_MAX_TEAM_SEATS, Number(teamSize) || 1));
  const now = Date.now();
  const azureFaction = Object.keys(FACTIONS)[0];
  const crimsonFaction = Object.keys(FACTIONS)[2 % Object.keys(FACTIONS).length];
  const firstId = DOMINATION_TERRITORIES[0].id;
  const lastId = DOMINATION_TERRITORIES[DOMINATION_TERRITORIES.length - 1].id;

  return {
    schemaVersion:1,
    id:`world-domination-${now}`,
    name:"World Domination",
    createdAt:now,
    updatedAt:now,
    lastTickAt:now,
    seatsPerTeam,
    teams:{
      azure:{
        id:"azure", name:"Azure Clan",
        seats:Array.from({length:seatsPerTeam},(_,index)=>createDominationSeat("azure",index)),
        globalResources:zeroResources(), expeditionReserve:[], producedSinceReserve:0, score:0
      },
      crimson:{
        id:"crimson", name:"Crimson Clan",
        seats:Array.from({length:seatsPerTeam},(_,index)=>createDominationSeat("crimson",index)),
        globalResources:zeroResources(), expeditionReserve:[], producedSinceReserve:0, score:0
      }
    },
    territories:Object.fromEntries(DOMINATION_TERRITORIES.map(definition=>{
      const isAzure = definition.id === firstId;
      const isCrimson = definition.id === lastId;
      const owner = isAzure ? "azure" : isCrimson ? "crimson" : null;
      const factionId = isAzure ? azureFaction : isCrimson ? crimsonFaction : null;
      return [definition.id,{
        id:definition.id,
        owner,
        controllerSeatId:isAzure?"azure-seat-1":isCrimson?"crimson-seat-1":null,
        factionId,
        productionUnitId:factionId?FACTIONS[factionId]?.units?.[0]?.id:null,
        cities:definition.cities.map(city=>({...city,owner:owner||"neutral"})),
        localResources:owner?{food:240,wood:220,stone:170,gold:150}:zeroResources(),
        finance:createFinanceLedger(),
        garrison:owner?starterGarrison(definition.id,factionId):[],
        productionProgress:0,
        lockedByContestId:null,
        lastConqueredAt:owner?now:null
      }];
    })),
    activeContests:[],
    history:[],
    eventLog:[{at:now,type:"match.created",text:`${seatsPerTeam}v${seatsPerTeam} World Domination match created.`}],
    victory:{type:"territory-majority",threshold:Math.ceil(DOMINATION_TERRITORIES.length*.68),winner:null}
  };
}

export function normalizeDominationMatch(input = {}) {
  const base = createDominationMatch(input.seatsPerTeam || 1);
  const match = { ...base, ...clone(input) };
  match.teams = {
    azure:{...base.teams.azure,...(input.teams?.azure||{}),globalResources:{...base.teams.azure.globalResources,...(input.teams?.azure?.globalResources||{})}},
    crimson:{...base.teams.crimson,...(input.teams?.crimson||{}),globalResources:{...base.teams.crimson.globalResources,...(input.teams?.crimson?.globalResources||{})}}
  };
  match.territories = Object.fromEntries(DOMINATION_TERRITORIES.map(def=>{
    const current = input.territories?.[def.id] || {};
    const baseFinance = base.territories[def.id].finance;
    return [def.id,{
      ...base.territories[def.id],...current,
      localResources:{...base.territories[def.id].localResources,...(current.localResources||{})},
      finance:{
        ...baseFinance,
        ...(current.finance||{}),
        grossIncome:{...baseFinance.grossIncome,...(current.finance?.grossIncome||{})},
        productionSpent:{...baseFinance.productionSpent,...(current.finance?.productionSpent||{})},
        treasuryTransferred:{...baseFinance.treasuryTransferred,...(current.finance?.treasuryTransferred||{})},
        projectedNetPerMinute:{...baseFinance.projectedNetPerMinute,...(current.finance?.projectedNetPerMinute||{})}
      },
      cities:def.cities.map(city=>({...city,...(current.cities?.find(item=>item.id===city.id)||{})})),
      garrison:Array.isArray(current.garrison)?current.garrison.map(item=>({...item})):base.territories[def.id].garrison
    }];
  }));
  match.activeContests = Array.isArray(input.activeContests) ? input.activeContests.map(item=>clone(item)) : [];
  match.history = Array.isArray(input.history) ? input.history.map(item=>clone(item)) : [];
  match.eventLog = Array.isArray(input.eventLog) ? input.eventLog.map(item=>clone(item)).slice(-120) : [];
  return match;
}

export function loadDominationMatch() {
  try {
    const raw = localStorage.getItem(DOMINATION_STORAGE_KEY);
    return raw ? normalizeDominationMatch(JSON.parse(raw)) : createDominationMatch(1);
  } catch {
    return createDominationMatch(1);
  }
}

export function saveDominationMatch(match) {
  match.updatedAt = Date.now();
  localStorage.setItem(DOMINATION_STORAGE_KEY, JSON.stringify(match));
  return match;
}

function addResource(target, key, amount) {
  target[key] = Math.max(0, Number(target[key] || 0) + Number(amount || 0));
}

function addLedgerResources(ledger, key, amount) {
  ledger[key] = Number(ledger[key] || 0) + Number(amount || 0);
}

function cityControlMultiplier(territoryState) {
  if (!territoryState.owner) return 0;
  const cities = territoryState.cities || [];
  if (!cities.length) return 1;
  const controlled = cities.filter(city=>city.owner===territoryState.owner);
  return .35 + controlled.reduce((sum,city)=>sum + Number(city.productionMultiplier||1),0) / cities.length * .65;
}

function garrisonCount(territoryState) {
  return (territoryState.garrison||[]).reduce((sum,item)=>sum+Number(item.count||0),0);
}

function pushFormation(territoryState, factionId, unitId, count = 1) {
  let entry = territoryState.garrison.find(item=>item.factionId===factionId&&item.unitId===unitId&&Number(item.veterancy||0)===0);
  if (!entry) {
    entry = { id:`${territoryState.id}:${factionId}:${unitId}:${Date.now()}`, factionId, unitId, count:0, veterancy:0 };
    territoryState.garrison.push(entry);
  }
  entry.count += count;
}

function productionIdentity(match, territoryState) {
  const team = match.teams[territoryState.owner];
  const seat = team?.seats.find(item=>item.id===territoryState.controllerSeatId) || team?.seats[0];
  const factionId = territoryState.factionId || seat?.factionId;
  const faction = FACTIONS[factionId];
  if (!faction) return null;
  const unit = faction.units.find(item=>item.id===territoryState.productionUnitId) || faction.units[0];
  return unit ? {team,seat,factionId,faction,unit} : null;
}

export function dominationUnitCost(faction, unit) {
  const multiplier = Number(faction?.military?.cost || 1);
  return Object.fromEntries(RESOURCE_KEYS.map(key=>[key,Math.ceil(Number(unit?.cost?.[key]||0)*multiplier)]));
}

function canAfford(resources, cost) {
  return RESOURCE_KEYS.every(key=>Number(resources[key]||0)>=Number(cost[key]||0));
}

function spend(resources, cost, ledger) {
  for(const key of RESOURCE_KEYS){
    const amount=Number(cost[key]||0);
    resources[key]=Math.max(0,Number(resources[key]||0)-amount);
    addLedgerResources(ledger.productionSpent,key,amount);
  }
}

function reserveFloorFor(identity) {
  const cost = dominationUnitCost(identity?.faction,identity?.unit);
  return Object.fromEntries(RESOURCE_KEYS.map(key=>[key,Math.max(55,Math.ceil(Number(cost[key]||0)*2.25))]));
}

function sweepEconomicSurplus(team, territoryState, identity) {
  const floor = reserveFloorFor(identity);
  for(const key of RESOURCE_KEYS){
    const available=Math.max(0,Number(territoryState.localResources[key]||0)-floor[key]);
    if(available<=0)continue;
    territoryState.localResources[key]-=available;
    addResource(team.globalResources,key,available);
    addLedgerResources(territoryState.finance.treasuryTransferred,key,available);
  }
}

function updateProjectedFinance(territoryDef, territoryState, identity, multiplier) {
  const cost = identity ? dominationUnitCost(identity.faction,identity.unit) : zeroResources();
  const perMinuteCycles = identity ? 60 / Math.max(10,Number(territoryDef.unitProductionSeconds)||45) : 0;
  for(const key of RESOURCE_KEYS){
    const grossPerMinute=Number(territoryDef.resourceRate[key]||0)*multiplier*60;
    const productionPerMinute=Number(cost[key]||0)*perMinuteCycles;
    territoryState.finance.projectedNetPerMinute[key]=grossPerMinute-productionPerMinute;
  }
}

function produceOneFormation(match, territoryDef, territoryState) {
  if (!territoryState.owner || territoryState.lockedByContestId) return {produced:false,reason:"locked"};
  if (garrisonCount(territoryState) >= territoryDef.garrisonLimit) return {produced:false,reason:"garrison-full"};
  const identity = productionIdentity(match,territoryState);
  if (!identity) return {produced:false,reason:"no-production-unit"};
  const cost = dominationUnitCost(identity.faction,identity.unit);
  if(!canAfford(territoryState.localResources,cost)){
    territoryState.finance.blockedProductionCycles=Number(territoryState.finance.blockedProductionCycles||0)+1;
    return {produced:false,reason:"economy",cost};
  }

  spend(territoryState.localResources,cost,territoryState.finance);
  pushFormation(territoryState,identity.factionId,identity.unit.id,1);
  territoryState.finance.formationsProduced=Number(territoryState.finance.formationsProduced||0)+1;
  identity.team.producedSinceReserve = Number(identity.team.producedSinceReserve||0) + 1;
  if (identity.team.producedSinceReserve >= RESERVE_PRODUCTION_STEP) {
    identity.team.producedSinceReserve -= RESERVE_PRODUCTION_STEP;
    identity.team.expeditionReserve.push({
      id:`reserve:${identity.team.id}:${Date.now()}:${identity.team.expeditionReserve.length}`,
      factionId:identity.factionId,
      unitId:identity.unit.id,
      count:1,
      createdAt:Date.now(),
      assignedTerritoryId:null,
      sourceTerritoryId:territoryState.id
    });
  }
  return {produced:true,cost};
}

export function tickDomination(match, elapsedSeconds) {
  const seconds = Math.max(0, Math.min(REALTIME_CATCHUP_LIMIT_SECONDS, Number(elapsedSeconds)||0));
  if (!seconds) return match;

  for (const territoryDef of DOMINATION_TERRITORIES) {
    const state = match.territories[territoryDef.id];
    if (!state?.owner) continue;
    const team = match.teams[state.owner];
    if (!team) continue;
    const multiplier = cityControlMultiplier(state);
    const identity = productionIdentity(match,state);

    // Map income is local first. Production must pay from this local treasury.
    for (const [key,rate] of Object.entries(territoryDef.resourceRate)) {
      const gain = Number(rate||0) * multiplier * seconds;
      addResource(state.localResources,key,gain);
      addLedgerResources(state.finance.grossIncome,key,gain);
    }

    updateProjectedFinance(territoryDef,state,identity,multiplier);

    if (!state.lockedByContestId && identity) {
      state.productionProgress = Number(state.productionProgress||0) + seconds * multiplier;
      const interval = Math.max(10, Number(territoryDef.unitProductionSeconds)||45);
      let guard = 0;
      while (state.productionProgress >= interval && guard++ < 1400) {
        const result = produceOneFormation(match,territoryDef,state);
        if (!result.produced) {
          // Keep one completed cycle queued, but do not stockpile hundreds of free instant builds.
          state.productionProgress = Math.min(state.productionProgress,interval*1.05);
          break;
        }
        state.productionProgress -= interval;
      }
    }

    // Only genuine surplus after local operating needs moves into the clan treasury.
    sweepEconomicSurplus(team,state,identity);
  }

  match.lastTickAt = Number(match.lastTickAt||Date.now()) + seconds*1000;
  match.updatedAt = Date.now();
  updateDominationVictory(match);
  return match;
}

export function catchUpDomination(match, now = Date.now()) {
  const elapsed = Math.max(0,(now-Number(match.lastTickAt||now))/1000);
  tickDomination(match,elapsed);
  match.lastTickAt = now;
  return match;
}

export function assignReserveToTerritory(match, teamId, reserveId, territoryId) {
  const team = match.teams[teamId];
  const territory = match.territories[territoryId];
  if (!team || !territory || territory.owner !== teamId || territory.lockedByContestId) return false;
  const index = team.expeditionReserve.findIndex(item=>item.id===reserveId);
  if (index < 0) return false;
  const reserve = team.expeditionReserve.splice(index,1)[0];
  pushFormation(territory,reserve.factionId,reserve.unitId,reserve.count||1);
  match.eventLog.push({at:Date.now(),type:"reserve.assigned",text:`${team.name} assigned a reserve formation to ${territoryDefinition(territoryId)?.name||territoryId}.`});
  return true;
}

export function availableNeighborTargets(match, sourceTerritoryId, teamId) {
  const source = match.territories[sourceTerritoryId];
  if (!source || source.owner !== teamId || source.lockedByContestId) return [];
  return (territoryDefinition(sourceTerritoryId)?.neighbors||[]).map(id=>match.territories[id]).filter(Boolean).filter(state=>state.owner!==teamId&&!state.lockedByContestId);
}

export function canStartTerritoryContest(match, sourceId, targetId, teamId) {
  const source = match.territories[sourceId];
  const target = match.territories[targetId];
  if (!source || !target || source.owner !== teamId || target.owner === teamId) return false;
  if (!territoriesAreAdjacent(sourceId,targetId)) return false;
  if (source.lockedByContestId || target.lockedByContestId) return false;
  return garrisonCount(source) > 0;
}

export function updateDominationVictory(match) {
  const counts = {azure:0,crimson:0};
  for (const territory of Object.values(match.territories)) if (territory.owner && counts[territory.owner]!==undefined) counts[territory.owner]++;
  const threshold = Number(match.victory?.threshold||Math.ceil(DOMINATION_TERRITORIES.length*.68));
  if (counts.azure >= threshold) match.victory.winner = "azure";
  if (counts.crimson >= threshold) match.victory.winner = "crimson";
  match.teams.azure.score = counts.azure;
  match.teams.crimson.score = counts.crimson;
  return counts;
}

export function dominationGarrisonCount(territoryState) {
  return garrisonCount(territoryState);
}

export function territoryEconomySnapshot(match, territoryId) {
  const territory = match.territories[territoryId];
  const definition = territoryDefinition(territoryId);
  if(!territory||!definition)return null;
  const identity=productionIdentity(match,territory);
  return {
    localResources:{...territory.localResources},
    productionUnit:identity?{factionId:identity.factionId,unitId:identity.unit.id,name:identity.unit.name,cost:dominationUnitCost(identity.faction,identity.unit)}:null,
    finance:clone(territory.finance),
    productionProgress:Number(territory.productionProgress||0),
    productionInterval:Number(definition.unitProductionSeconds||45),
    garrison:garrisonCount(territory),
    garrisonLimit:definition.garrisonLimit
  };
}
