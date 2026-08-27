import type { CareerState } from "@/game/domain/career";
import type { GameCommand } from "@/game/domain/commands";
import { eventCatalog } from "@/game/events/catalog";

/**
 * Deterministic test strategy. Never inspects future RNG values; it only
 * reads the current state and picks a stable, explainable command.
 */
export const chooseDeterministicDefault = (state: CareerState): GameCommand => {
  switch (state.phase) {
    case "preseason":
      return {
        type: "START_SEASON",
        mode: state.mode,
        training: "technique",
        intent: "steady-growth",
      };
    case "classic-checkpoint": {
      if (state.activeEventId) {
        const event = eventCatalog.find((entry) => entry.id === state.activeEventId);
        return { type: "CHOOSE_EVENT", optionId: event?.options[0]?.id ?? "a" };
      }
      return { type: "ADVANCE_CLASSIC" };
    }
    case "detailed-prematch": {
      if (state.activeEventId) {
        const event = eventCatalog.find((entry) => entry.id === state.activeEventId);
        return { type: "CHOOSE_EVENT", optionId: event?.options[0]?.id ?? "a" };
      }
      return { type: "START_NEXT_MATCH" };
    }
    case "detailed-moment": {
      const options = state.activeMoment?.options ?? [];
      const lowestRisk =
        [...options].sort(
          (a, b) => riskRank(a.risk) - riskRank(b.risk) || a.id.localeCompare(b.id),
        )[0] ?? options[0];
      return { type: "CHOOSE_MOMENT", optionId: lowestRisk?.id ?? "hold" };
    }
    case "detailed-postmatch": {
      if (state.activeEventId) {
        const event = eventCatalog.find((entry) => entry.id === state.activeEventId);
        return { type: "CHOOSE_EVENT", optionId: event?.options[0]?.id ?? "a" };
      }
      return { type: "ACKNOWLEDGE_MATCH" };
    }
    case "season-review":
    case "transfer-window": {
      // A window is decided once a terminal CHOOSE_TRANSFER (stay or an offer)
      // has been accepted for it; the window stays open only for "seek".
      let decided = false;
      for (let index = state.commandHistory.length - 1; index >= 0; index -= 1) {
        const type = state.commandHistory[index]!.command.type;
        if (type === "START_SEASON") break;
        if (type === "CHOOSE_TRANSFER") {
          const command = state.commandHistory[index]!.command;
          if (command.type === "CHOOSE_TRANSFER" && command.offerId !== "seek") {
            decided = true;
          }
          break;
        }
      }
      if (state.phase === "transfer-window") {
        if (decided) return { type: "START_NEXT_SEASON" };
        const currentClub = state.world.clubs.find((club) => club.id === state.player.clubId);
        const upgrade = state.transferOffers.find(
          (offer) =>
            offer.contract.role === "starter" &&
            (state.world.clubs.find((club) => club.id === offer.clubId)?.reputation ?? 0) >
              (currentClub?.reputation ?? 0),
        );
        if (upgrade) return { type: "CHOOSE_TRANSFER", offerId: upgrade.id };
        return { type: "CHOOSE_TRANSFER", offerId: "stay" };
      }
      return { type: "CHOOSE_TRANSFER", offerId: "stay" };
    }
    case "retired":
      return { type: "ADVANCE_CLASSIC" };
  }
};

const riskRank = (risk: "low" | "medium" | "high"): number =>
  risk === "low" ? 0 : risk === "medium" ? 1 : 2;
