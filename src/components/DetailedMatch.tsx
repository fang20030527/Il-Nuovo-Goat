"use client";

import type { CareerState } from "@/game/domain/career";

type DetailedCommand =
  | { type: "START_NEXT_MATCH" }
  | { type: "CHOOSE_MOMENT"; optionId: string }
  | { type: "ACKNOWLEDGE_MATCH" };

interface DetailedMatchProps {
  readonly state: CareerState;
  readonly pending: boolean;
  readonly dispatch: (command: DetailedCommand) => Promise<void>;
}

const clubName = (state: CareerState, id: string): string =>
  state.world.clubs.find((club) => club.id === id)?.name ?? id;

export const DetailedMatch = ({ state, pending, dispatch }: DetailedMatchProps) => {
  const detailed = state.season.detailed;

  if (state.phase === "detailed-prematch") {
    const fixture = detailed?.playerFixtures[detailed.nextFixtureIndex];
    return (
      <section className="panel" aria-label="Next match">
        <h2>Next match</h2>
        {fixture ? (
          <p>
            {clubName(state, fixture.homeClubId)} vs {clubName(state, fixture.awayClubId)}
            {" · "}Round {fixture.round} · Fitness {state.player.fitness}
          </p>
        ) : (
          <p>Season fixtures complete.</p>
        )}
        <button
          type="button"
          disabled={pending || !fixture}
          data-game-action="START_NEXT_MATCH"
          onClick={() => void dispatch({ type: "START_NEXT_MATCH" })}
        >
          Start next match
        </button>
      </section>
    );
  }

  if (state.phase === "detailed-moment" && state.activeMoment) {
    const moment = state.activeMoment;
    return (
      <section className="panel" aria-label="Match moment" data-testid="active-moment">
        <h2>Key moment — minute {moment.minute}</h2>
        <p>Score: {moment.score[0]} – {moment.score[1]}</p>
        <p>{moment.prompt}</p>
        <div className="button-row">
          {moment.options.map((option) => (
            <button
              key={option.id}
              type="button"
              disabled={pending}
              data-game-action="CHOOSE_MOMENT"
              data-risk={option.risk}
              onClick={() => void dispatch({ type: "CHOOSE_MOMENT", optionId: option.id })}
            >
              {option.label} ({option.risk} risk)
            </button>
          ))}
        </div>
        {detailed && detailed.timeline.length > 0 && (
          <details>
            <summary>Timeline</summary>
            <ul>
              {detailed.timeline.map((line, index) => (
                <li key={index}>{line}</li>
              ))}
            </ul>
          </details>
        )}
      </section>
    );
  }

  if (state.phase === "detailed-postmatch" && detailed?.lastMatch) {
    const match = detailed.lastMatch;
    return (
      <section className="panel" aria-label="Match report">
        <h2>Match report</h2>
        <p>
          {clubName(state, match.homeClubId)} {match.homeGoals} – {match.awayGoals}{" "}
          {clubName(state, match.awayClubId)}
        </p>
        {match.playerPerformance && (
          <dl className="stats-grid">
            <div><dt>Minutes</dt><dd>{match.playerPerformance.minutes}</dd></div>
            <div><dt>Rating</dt><dd>{match.playerPerformance.rating.toFixed(1)}</dd></div>
            <div><dt>Goals</dt><dd>{match.playerPerformance.goals}</dd></div>
            <div><dt>Assists</dt><dd>{match.playerPerformance.assists}</dd></div>
          </dl>
        )}
        {match.timeline.length > 0 && (
          <details>
            <summary>Timeline</summary>
            <ul>
              {match.timeline.map((line, index) => (
                <li key={index}>{line}</li>
              ))}
            </ul>
          </details>
        )}
        <button
          type="button"
          disabled={pending}
          data-game-action="ACKNOWLEDGE_MATCH"
          onClick={() => void dispatch({ type: "ACKNOWLEDGE_MATCH" })}
        >
          Acknowledge
        </button>
      </section>
    );
  }

  return null;
};
