import type { CareerState } from "@/game/domain/career";
import type { EventId } from "@/game/domain/ids";
import { gameError, type GameResult } from "@/game/domain/errors";
import { eventCatalog } from "./catalog";
import type { EventEffect } from "./types";

const clamp = (min: number, max: number, value: number) => Math.max(min, Math.min(max, value));

const applyEffect = (state: CareerState, effect: EventEffect): CareerState => {
  const player = state.player;
  switch (effect.type) {
    case "ATTRIBUTE": {
      const current = player.attributes[effect.attribute];
      const next = clamp(1, 99, current + effect.delta);
      return {
        ...state,
        player: {
          ...player,
          attributes: { ...player.attributes, [effect.attribute]: next },
        },
      };
    }
    case "CONDITION": {
      const current = player[effect.field];
      const next = clamp(0, 100, current + effect.delta);
      return { ...state, player: { ...player, [effect.field]: next } };
    }
    case "REPUTATION": {
      const next = clamp(0, 100, player.reputation + effect.delta);
      return { ...state, player: { ...player, reputation: next } };
    }
    case "MARKET_VALUE_PERCENT": {
      const multiplier = 1 + effect.percent / 100;
      const next = Math.max(0, Math.round(player.marketValue * multiplier));
      return { ...state, player: { ...player, marketValue: next } };
    }
    case "INJURY_RISK": {
      return state;
    }
    case "TAG": {
      if (player.tags.includes(effect.tag)) return state;
      return { ...state, player: { ...player, tags: [...player.tags, effect.tag] } };
    }
    case "TRANSFER_INTENT": {
      return state;
    }
  }
};

export const applyEventChoice = (
  state: CareerState,
  eventId: EventId,
  optionId: string,
): GameResult<CareerState> => {
  const event = eventCatalog.find((entry) => entry.id === eventId);
  if (!event) {
    return gameError("INVALID_STATE", `Event not found: ${eventId}`);
  }
  const option = event.options.find((entry) => entry.id === optionId);
  if (!option) {
    return gameError("INVALID_OPTION", `Option ${optionId} not found for event ${eventId}`);
  }

  let next = state;
  for (const effect of option.effects) {
    next = applyEffect(next, effect);
  }

  return {
    ok: true,
    value: {
      ...next,
      eventHistory: [
        ...next.eventHistory,
        {
          eventId,
          optionId,
          season: next.season.season,
          age: next.player.age,
        },
      ],
    },
  };
};
