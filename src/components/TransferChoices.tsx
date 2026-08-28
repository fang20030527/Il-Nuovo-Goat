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
    <section className="panel" aria-label="Transfer window">
      <h2>Transfer window</h2>
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
                    <td>{Math.round(offer.financialFit * 100)}%</td>
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
