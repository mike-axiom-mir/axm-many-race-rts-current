import { AGE_DATA, getFactionList } from "../factions.js";
import { CORE_UPGRADES, SIGNATURE_UPGRADES } from "../upgradeSystem.js";
import { RUNTIME_CONTRACTS } from "./runtimeContract.js";
import { RUNTIME_VERIFICATION_TARGETS } from "../verification/runtimeManifest.js";

function factionSummary(faction) {
  return {
    id: faction.id,
    name: faction.name,
    role: faction.starterRole || null,
    founder: faction.founder || null,
    starter: Boolean(faction.starter),
    wildcard: Boolean(faction.wildcard),
    buildingCount: faction.buildings?.length || 0,
    unitCount: faction.units?.length || 0,
    traits: [...(faction.traits || [])],
    special: faction.special || null
  };
}

export function createGameManifest() {
  const factions = getFactionList().map(factionSummary);
  const pages = RUNTIME_VERIFICATION_TARGETS.map(target => ({ ...target }));
  const runtimes = Object.values(RUNTIME_CONTRACTS).map(contract => ({
    ...contract,
    capabilities: [...contract.capabilities]
  }));

  return {
    schema: "axm-many-race-rts/manifest-v1",
    generatedFromRuntimeData: true,
    counts: {
      factions: factions.length,
      units: factions.reduce((sum, faction) => sum + faction.unitCount, 0),
      buildings: factions.reduce((sum, faction) => sum + faction.buildingCount, 0),
      ages: AGE_DATA.length,
      coreUpgradeLines: CORE_UPGRADES.length,
      signatureUpgrades: Object.keys(SIGNATURE_UPGRADES).length,
      runtimeContracts: runtimes.length,
      browserTargets: pages.length
    },
    ages: AGE_DATA.map(age => ({ index: age.index, name: age.name, cost: age.cost ? { ...age.cost } : null })),
    factions,
    upgrades: {
      core: CORE_UPGRADES.map(upgrade => ({ id: upgrade.id, name: upgrade.name, maxLevel: upgrade.maxLevel })),
      signatureFactionIds: Object.keys(SIGNATURE_UPGRADES)
    },
    runtimes,
    pages
  };
}

export function gameManifestJson(space = 2) {
  return JSON.stringify(createGameManifest(), null, space);
}
