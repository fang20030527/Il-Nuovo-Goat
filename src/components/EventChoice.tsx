"use client";

import type { CareerState } from "@/game/domain/career";
import { eventCatalog } from "@/game/events/catalog";

interface EventChoiceProps {
  readonly state: CareerState;
  readonly pending: boolean;
  readonly dispatch: (command: { type: "CHOOSE_EVENT"; optionId: string }) => Promise<void>;
}

export const EventChoice = ({ state, pending, dispatch }: EventChoiceProps) => {
  const event = state.activeEventId
    ? (eventCatalog.find((entry) => entry.id === state.activeEventId) ?? null)
    : null;
  if (!event) return null;
  return (
    <section className="panel" aria-label="Career event">
      <h2>{event.title}</h2>
      <p>{event.body}</p>
      <div className="button-row">
        {event.options.map((option) => (
          <button
            key={option.id}
            type="button"
            disabled={pending}
            data-game-action="CHOOSE_EVENT"
            onClick={() => void dispatch({ type: "CHOOSE_EVENT", optionId: option.id })}
          >
            {option.label}
          </button>
        ))}
      </div>
    </section>
  );
};
