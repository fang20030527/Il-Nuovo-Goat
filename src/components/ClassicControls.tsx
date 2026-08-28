"use client";

import type { CareerState } from "@/game/domain/career";
import { eventCatalog } from "@/game/events/catalog";

interface ClassicControlsProps {
  readonly state: CareerState;
  readonly pending: boolean;
  readonly dispatch: (command: { type: "ADVANCE_CLASSIC" } | { type: "CHOOSE_EVENT"; optionId: string }) => Promise<void>;
}

export const ClassicControls = ({ state, pending, dispatch }: ClassicControlsProps) => {
  const activeEvent = state.activeEventId
    ? (eventCatalog.find((event) => event.id === state.activeEventId) ?? null)
    : null;

  return (
    <section className="mode-card" aria-label="Classic season controls">
      <span className="card-label">Rapid mode</span>
      <h2 className="card-title" style={{ fontSize: "1.2rem" }}>Classic season</h2>
      <p>
        Season {state.season.season} · {state.season.completedClubFixtures} fixtures played
      </p>
      {activeEvent !== null ? (
        <div>
          <h3>{activeEvent.title}</h3>
          <p>{activeEvent.body}</p>
          <div className="button-row">
            {activeEvent.options.map((option) => (
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
        </div>
      ) : (
        <button
          type="button"
          disabled={pending}
          data-game-action="ADVANCE_CLASSIC"
          className="primary"
          onClick={() => void dispatch({ type: "ADVANCE_CLASSIC" })}
        >
          Advance classic season
        </button>
      )}
    </section>
  );
};
