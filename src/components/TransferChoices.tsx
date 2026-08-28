"use client";

import type { CareerState } from "@/game/domain/career";

interface TransferChoicesProps {
  readonly state: CareerState;
  readonly pending: boolean;
  readonly dispatch: (
    command: { type: "CHOOSE_TRANSFER"; offerId: string | "stay" | "seek" } | { type: "START_NEXT_SEASON" },
  ) => Promise<void>;
}

export const TransferChoices = ({ state, pending, dispatch }: TransferChoicesProps) => {
  const offers = state.transferOffers;
  return (
    <section className="mode-card purple" aria-label="Transfer window">
      <span className="card-label purple">Decision time</span>
      <h2 className="card-title" style={{ fontSize: "1.2rem" }}>Transfer window</h2>
      {state.phase === "season-review" && (
        <p>Season {state.season.season} complete. Review the offers below.</p>
      )}
      {offers.length > 0 ? (
        <div className="table-scroll">
          <table>
            <thead>
              <tr>
                <th>Club</th>
                <th>Role</th>
                <th>Weekly wage</th>
                <th>Term</th>
                <th>Fit</th>
                <th></th>
              </tr>
            </thead>
            <tbody>
              {offers.map((offer) => {
                const club = state.world.clubs.find((entry) => entry.id === offer.clubId);
                return (
                  <tr key={offer.id}>
                    <td>{club?.name ?? offer.clubId}</td>
                    <td>{offer.contract.role}</td>
                    <td>{offer.contract.weeklyWage.toLocaleString()}</td>
                    <td>
                      {offer.contract.startSeason}–{offer.contract.endSeason}
                    </td>
                    <td>{offer.financialFit.toFixed(1)}×</td>
                    <td>
                      <button
                        type="button"
                        disabled={pending}
                        data-game-action="CHOOSE_TRANSFER"
                        onClick={() => void dispatch({ type: "CHOOSE_TRANSFER", offerId: offer.id })}
                      >
                        Accept
                      </button>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      ) : (
        <p className="muted">No offers on the table.</p>
      )}
      <div className="button-row">
        <button
          type="button"
          disabled={pending}
          data-game-action="CHOOSE_TRANSFER"
          onClick={() => void dispatch({ type: "CHOOSE_TRANSFER", offerId: "stay" })}
        >
          Stay
        </button>
        <button
          type="button"
          disabled={pending}
          data-game-action="CHOOSE_TRANSFER"
          onClick={() => void dispatch({ type: "CHOOSE_TRANSFER", offerId: "seek" })}
        >
          Seek transfer
        </button>
        {state.phase === "transfer-window" && (
          <button
            type="button"
            className="primary"
            disabled={pending}
            data-game-action="START_NEXT_SEASON"
            onClick={() => void dispatch({ type: "START_NEXT_SEASON" })}
          >
            Next season
          </button>
        )}
      </div>
    </section>
  );
};
