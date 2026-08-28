"use client";

import Link from "next/link";
import { useParams } from "next/navigation";
import type { GameCommand } from "@/game/domain/commands";
import type { CareerSlot } from "@/persistence/career-db";
import { useCareerSlot } from "@/hooks/use-career-slot";
import { CareerSummary } from "@/components/CareerSummary";
import { CareerTimeline } from "@/components/CareerTimeline";
import { ClassicControls } from "@/components/ClassicControls";
import { DetailedMatch } from "@/components/DetailedMatch";
import { EventChoice } from "@/components/EventChoice";
import { SeasonOverview } from "@/components/SeasonOverview";
import { TransferChoices } from "@/components/TransferChoices";

const parseSlot = (raw: string | string[] | undefined): CareerSlot => {
  const value = Number(Array.isArray(raw) ? raw[0] : raw);
  return value === 2 || value === 3 ? (value as CareerSlot) : 1;
};

export default function CareerPage() {
  const params = useParams<{ slot: string }>();
  const slot = parseSlot(params.slot);
  const career = useCareerSlot(slot);

  if (career.status === "loading") return <main><p>Loading save…</p></main>;
  if (career.status === "empty") {
    return (
      <main>
        <p>This slot is empty.</p>
        <Link className="button" href={`/career/new?slot=${slot}`}>Start a new career</Link>
      </main>
    );
  }
  if (career.status === "error" || career.state === null) {
    return <main><p role="alert" className="error-text">{career.error ?? "Save failed to load."}</p></main>;
  }

  const state = career.state;
  const dispatch = (command: GameCommand) => career.dispatch(command);

  return (
    <main>
      <nav className="nav-row">
        <Link href="/">Saves</Link>
        <Link href="/world">World</Link>
        <Link href={`/career/${slot}/archive`}>Archive</Link>
        {state.phase === "retired" && <Link href={`/career/${slot}/retirement`}>Retirement</Link>}
      </nav>
      <p className="eyebrow">Career — season {state.season.season}</p>
      <h1 style={{ marginTop: 0 }}>
        {state.player.name}{" "}
        <span className="badge badge-live"><span data-testid="current-phase">{state.phase}</span></span>
      </h1>
      {career.error !== null && <p role="alert" className="error-text">{career.error}</p>}
      <CareerSummary state={state} />

      {state.phase !== "preseason" && state.phase !== "retired" && (
        <SeasonOverview state={state} />
      )}

      {state.phase === "preseason" && (
        <section className="panel" aria-label="Start season">
          <p className="eyebrow purple">Preseason</p>
          <h2 style={{ marginTop: 0 }}>Season {state.season.season} awaits</h2>
          <StartSeasonForm pending={career.pending} dispatch={dispatch} defaults={state} />
        </section>
      )}

      {state.phase === "classic-checkpoint" && (
        <ClassicControls state={state} pending={career.pending} dispatch={dispatch} />
      )}

      {(state.phase === "detailed-prematch" ||
        state.phase === "detailed-moment" ||
        state.phase === "detailed-postmatch") && (
        <>
          <DetailedMatch state={state} pending={career.pending} dispatch={dispatch} />
          <EventChoice state={state} pending={career.pending} dispatch={dispatch} />
        </>
      )}

      {(state.phase === "season-review" || state.phase === "transfer-window") && (
        <>
          <EventChoice state={state} pending={career.pending} dispatch={dispatch} />
          <TransferChoices state={state} pending={career.pending} dispatch={dispatch} />
        </>
      )}

      {state.phase === "retired" && (
        <section className="panel">
          <h2>Career over</h2>
          <p>{state.player.name} has retired at age {state.player.age}.</p>
          <Link className="button" href={`/career/${slot}/retirement`} data-game-action="view-retirement">
            View career score
          </Link>
        </section>
      )}

      <CareerTimeline state={state} />

      {career.hasBackup && (
        <button
          type="button"
          onClick={() => {
            if (window.confirm("Restore this slot's backup? The current state becomes the backup.")) {
              void career.restoreBackup();
            }
          }}
        >
          Restore backup
        </button>
      )}
    </main>
  );
}

import type { CareerState } from "@/game/domain/career";

const StartSeasonForm = ({
  pending,
  dispatch,
  defaults,
}: {
  readonly pending: boolean;
  readonly dispatch: (command: GameCommand) => Promise<void>;
  readonly defaults: CareerState;
}) => (
  <form
    className="form-stack"
    onSubmit={(event) => {
      event.preventDefault();
      const form = new FormData(event.currentTarget);
      void dispatch({
        type: "START_SEASON",
        mode: String(form.get("mode")) as CareerState["mode"],
        training: String(form.get("training")) as CareerState["trainingFocus"],
        intent: String(form.get("intent")) as CareerState["careerIntent"],
      });
    }}
  >
    <label>
      Mode
      <select name="mode" defaultValue={defaults.mode}>
        <option value="classic">classic</option>
        <option value="detailed">detailed</option>
      </select>
    </label>
    <label>
      Training focus
      <select name="training" defaultValue={defaults.trainingFocus}>
        <option value="technique">technique</option>
        <option value="awareness">awareness</option>
        <option value="physical">physical</option>
        <option value="mentality">mentality</option>
      </select>
    </label>
    <label>
      Career intent
      <select name="intent" defaultValue={defaults.careerIntent}>
        <option value="earn-start">earn-start</option>
        <option value="steady-growth">steady-growth</option>
        <option value="chase-honours">chase-honours</option>
        <option value="seek-transfer">seek-transfer</option>
      </select>
    </label>
    <button type="submit" className="primary" disabled={pending} data-game-action="START_SEASON">
      Start season
    </button>
  </form>
);
