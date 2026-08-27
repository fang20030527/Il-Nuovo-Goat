import type { CareerState } from "@/game/domain/career";
import type { CareerEvent } from "./types";
import { eventCatalog } from "./catalog";
import { gameError, type GameResult } from "@/game/domain/errors";
import { pickWeighted } from "@/game/engine/rng";

export const eligibleEvents = (state: CareerState): readonly CareerEvent[] => {
  const { player, eventHistory, season } = state;
  const nowSeason = season.season;

  return eventCatalog.filter((event) => {
    if (event.minAge !== undefined && player.age < event.minAge) return false;
    if (event.maxAge !== undefined && player.age > event.maxAge) return false;
    if (event.positions && !event.positions.includes(player.position)) return false;
    if (event.requiredTags && !event.requiredTags.every((tag) => player.tags.includes(tag))) return false;
    if (event.excludedTags && event.excludedTags.some((tag) => player.tags.includes(tag))) return false;

    const triggers = eventHistory.filter((entry) => entry.eventId === event.id);
    if (triggers.length >= event.maxTriggers) return false;

    if (event.cooldownSeasons > 0 && triggers.length > 0) {
      const lastTrigger = Math.max(...triggers.map((entry) => entry.season));
      if (nowSeason - lastTrigger < event.cooldownSeasons) return false;
    }

    return true;
  });
};

export interface EventSelection {
  readonly event: CareerEvent;
  readonly rng: CareerState["rng"];
}

export const selectEvent = (state: CareerState): GameResult<EventSelection> => {
  const eligible = eligibleEvents(state);
  if (eligible.length === 0) {
    return gameError("NO_ELIGIBLE_EVENT", "No career event is currently eligible");
  }
  const pick = pickWeighted(
    state.rng,
    eligible.map((event) => ({ value: event, weight: event.weight })),
  );
  if (!pick.ok) return gameError("INVALID_STATE", "Failed to select event");
  return { ok: true, value: { event: pick.value.value, rng: pick.value.state } };
};
