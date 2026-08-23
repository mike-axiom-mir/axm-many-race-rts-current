import { FactionPowerSystem } from "./factionPowerSystem.js";

const previousApplyEconomyLayer = FactionPowerSystem.prototype.applyEconomyLayer;
const previousActivate = FactionPowerSystem.prototype.activate;

FactionPowerSystem.prototype.applyEconomyLayer = function primaryEconomyPowerLayer(owner, active) {
  // The flat Skirmish economy state currently exists for the primary Player and
  // Enemy sides. Extra lobby seats use the lighter multi-seat AI path and do
  // not own an independent resource ledger yet, so they must not mutate the
  // shared faction economy object just because they share a faction id.
  if (owner !== "player" && owner !== "enemy") return;
  return previousApplyEconomyLayer.call(this, owner, active);
};

FactionPowerSystem.prototype.activate = function primaryEconomyPowerActivation(owner, powerId, source = "player") {
  const faction = this.factionFor(owner);
  const power = faction ? Object.values((window.AXMFactionPowers?.catalog || {})[faction.id] || {}).find(item => item.id === powerId) : null;
  if (power?.kind === "eco" && owner !== "player" && owner !== "enemy") {
    return { ok: false, reason: "That seat has no independent economy ledger yet; use Attack or Defense instead." };
  }
  if (power?.kind === "eco" && (owner === "player" || owner === "enemy")) {
    const otherOwner = owner === "player" ? "enemy" : "player";
    const otherFaction = this.factionFor(otherOwner);
    if (otherFaction?.id === faction?.id) {
      return { ok: false, reason: "Mirrored factions currently share one economy definition; use Attack or Defense in this matchup." };
    }
  }
  return previousActivate.call(this, owner, powerId, source);
};
