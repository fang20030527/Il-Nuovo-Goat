import type { CareerState } from "@/game/domain/career";
import type { LeagueTableRow, MatchResult } from "@/game/domain/competition";
import type { ClubId, LeagueId } from "@/game/domain/ids";
import { createDoubleRoundRobin } from "@/game/engine/schedule";
import { simulateNeutralMatch } from "@/game/engine/season";
import { mixRng } from "@/game/engine/rng";

const POINTS_WIN = 3;
const POINTS_DRAW = 1;

interface LiveRow {
  readonly clubId: ClubId;
  played: number;
  won: number;
  drawn: number;
  lost: number;
  goalsFor: number;
  goalsAgainst: number;
  points: number;
}

const emptyRow = (clubId: ClubId): LiveRow => ({
  clubId, played: 0, won: 0, drawn: 0, lost: 0,
  goalsFor: 0, goalsAgainst: 0, points: 0,
});

const applyResult = (rows: Map<ClubId, LiveRow>, result: MatchResult): void => {
  const home = rows.get(result.homeClubId) ?? emptyRow(result.homeClubId);
  const away = rows.get(result.awayClubId) ?? emptyRow(result.awayClubId);
  home.played += 1; away.played += 1;
  home.goalsFor += result.homeGoals; home.goalsAgainst += result.awayGoals;
  away.goalsFor += result.awayGoals; away.goalsAgainst += result.homeGoals;
  if (result.homeGoals > result.awayGoals) {
    home.won += 1; home.points += POINTS_WIN; away.lost += 1;
  } else if (result.homeGoals < result.awayGoals) {
    away.won += 1; away.points += POINTS_WIN; home.lost += 1;
  } else {
    home.drawn += 1; away.drawn += 1;
    home.points += POINTS_DRAW; away.points += POINTS_DRAW;
  }
  rows.set(result.homeClubId, home);
  rows.set(result.awayClubId, away);
};

const sortRows = (rows: readonly LiveRow[]): readonly LiveRow[] =>
  [...rows].sort((a, b) =>
    b.points - a.points ||
    (b.goalsFor - b.goalsAgainst) - (a.goalsFor - a.goalsAgainst) ||
    b.goalsFor - a.goalsFor,
  );

/**
 * Pure helper exported for unit tests: derive a live league table from the
 * results already known in state for one league. Empty input → empty table.
 */
export const deriveLiveTable = (
  results: readonly MatchResult[],
  leagueClubIds: ReadonlySet<ClubId>,
): readonly LiveRow[] => {
  const byClub = new Map<ClubId, LiveRow>();
  for (const result of results) {
    if (leagueClubIds.has(result.homeClubId) && leagueClubIds.has(result.awayClubId)) {
      applyResult(byClub, result);
    }
  }
  return sortRows([...byClub.values()]);
};

/**
 * Detailed mode keeps only the player's results in state until the season
 * ends; the neutral fixtures are simulated in one batch at finalization. For
 * a useful mid-season table we project the *remaining* neutral fixtures with
 * a derived RNG stream (mixed from the career seed plus fixture ids) — this
 * never touches the authoritative cursor, so the committed result is
 * unaffected, but the table shows every club's partial record instead of
 * leaving unplayed opponents at zero.
 */
export const projectNeutralFixtures = (
  state: CareerState,
  leagueId: LeagueId,
): readonly MatchResult[] => {
  const detailed = state.season.detailed;
  if (!detailed) return [];
  const playedFixtureIds = new Set(detailed.playedResults.map((result) => result.fixtureId));
  const leagueClubIds = state.world.clubs
    .filter((club) => club.leagueId === leagueId)
    .map((club) => club.id);
  const fixtures = createDoubleRoundRobin(leagueId, leagueClubIds, state.season.season);
  const projections: MatchResult[] = [];
  for (const fixture of fixtures) {
    const involvesPlayer =
      fixture.homeClubId === state.player.clubId || fixture.awayClubId === state.player.clubId;
    if (involvesPlayer || playedFixtureIds.has(fixture.id)) continue;
    const projectionRng = mixRng(state.rng, "projection", state.season.season, fixture.id);
    projections.push(simulateNeutralMatch(state.world, fixture, projectionRng).result);
  }
  return projections;
};

const clubName = (state: CareerState, id: ClubId): string =>
  state.world.clubs.find((club) => club.id === id)?.name ?? id;

/**
 * League table for the player's league. Uses the engine-committed table when
 * the season is complete; otherwise derives a live table from the results
 * already in state (detailed: played + neutral results, classic mid-season:
 * none, so we show a note).
 */
export const SeasonOverview = ({ state }: { readonly state: CareerState }) => {
  const club = state.world.clubs.find((entry) => entry.id === state.player.clubId);
  const league = club ? state.world.leagues.find((entry) => entry.id === club.leagueId) : null;
  if (!club || !league) return null;

  const committed = state.season.leagueTables.find((entry) => entry.leagueId === league.id);
  let rows: readonly LiveRow[] = [];
  let source: "final" | "live" | "none" = "none";
  let includesProjection = false;

  if (committed && committed.rows.length > 0) {
    rows = committed.rows.map((row: LeagueTableRow) => ({ ...row }));
    source = "final";
  } else if (state.season.detailed) {
    const leagueClubIds = new Set(
      state.world.clubs.filter((entry) => entry.leagueId === league.id).map((entry) => entry.id),
    );
    const projections = projectNeutralFixtures(state, league.id);
    const allResults = [
      ...state.season.detailed.playedResults,
      ...state.season.detailed.neutralResults,
      ...projections,
    ];
    const derived = deriveLiveTable(allResults, leagueClubIds);
    if (derived.length > 0) {
      rows = derived;
      source = "live";
      includesProjection = projections.length > 0;
    }
  }

  // Next scheduled fixture for the player's club.
  const nextFixture = state.season.fixtures.find(
    (fixture) =>
      fixture.status !== "complete" &&
      (fixture.homeClubId === club.id || fixture.awayClubId === club.id),
  );

  // Last five completed player-league results involving the club.
  const recent = state.season.results
    .filter(
      (result) =>
        result.homeClubId === club.id || result.awayClubId === club.id,
    )
    .slice(-5)
    .reverse();

  const domesticCupWinnerId = state.season.domesticCupWinners.length > 0
    ? state.season.domesticCupWinners[state.season.domesticCupWinners.length - 1]
    : null;

  return (
    <section className="panel" aria-label="Season overview">
      <h2>
        {league.name} <span className="muted">Season {state.season.season}</span>
        {source === "live" && <span className="badge badge-live"> live</span>}
        {includesProjection && <span className="badge badge-projected"> projected</span>}
        {source === "final" && <span className="badge badge-final"> final</span>}
      </h2>

      {includesProjection && (
        <p className="muted projection-note">
          Table includes projected outcomes for matches your club is not involved in; final standings
          are settled when the season completes.
        </p>
      )}

      {nextFixture && (
        <p className="fixture-line">
          Next: <strong>{clubName(state, nextFixture.homeClubId)}</strong> vs{" "}
          <strong>{clubName(state, nextFixture.awayClubId)}</strong>
          <span className="muted"> · Round {nextFixture.round}</span>
        </p>
      )}

      {recent.length > 0 && (
        <div className="form-guide" aria-label="Recent results">
          {recent.map((result) => {
            const isHome = result.homeClubId === club.id;
            const own = isHome ? result.homeGoals : result.awayGoals;
            const opp = isHome ? result.awayGoals : result.homeGoals;
            const outcome = own > opp ? "W" : own < opp ? "L" : "D";
            return (
              <span key={result.fixtureId} className={`form-chip form-${outcome.toLowerCase()}`} title={`${clubName(state, result.homeClubId)} ${result.homeGoals}–${result.awayGoals} ${clubName(state, result.awayClubId)}`}>
                {outcome}
              </span>
            );
          })}
        </div>
      )}

      {rows.length > 0 ? (
        <div className="table-scroll">
          <table>
            <thead>
              <tr>
                <th>#</th><th>Club</th><th>P</th><th>W</th><th>D</th><th>L</th>
                <th>GF</th><th>GA</th><th>GD</th><th>Pts</th>
              </tr>
            </thead>
            <tbody>
              {rows.map((row, index) => (
                <tr key={row.clubId} className={row.clubId === club.id ? "row-highlight" : undefined}>
                  <td>{index + 1}</td>
                  <td>{clubName(state, row.clubId)}</td>
                  <td>{row.played}</td>
                  <td>{row.won}</td>
                  <td>{row.drawn}</td>
                  <td>{row.lost}</td>
                  <td>{row.goalsFor}</td>
                  <td>{row.goalsAgainst}</td>
                  <td>{row.goalsFor - row.goalsAgainst}</td>
                  <td><strong>{row.points}</strong></td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      ) : (
        <p className="muted">
          {state.mode === "classic"
            ? "League table will appear when the season completes."
            : "League table appears once the first match is played."}
        </p>
      )}

      <dl className="stats-grid season-extras">
        <div>
          <dt>Domestic cup</dt>
          <dd>{domesticCupWinnerId ? clubName(state, domesticCupWinnerId) : "—"}</dd>
        </div>
        <div>
          <dt>Continental cup</dt>
          <dd>{state.season.continentalCupWinner ? clubName(state, state.season.continentalCupWinner) : "—"}</dd>
        </div>
        <div>
          <dt>National team</dt>
          <dd>
            {state.season.nationalTeamResult.selected
              ? `Selected · ${state.season.nationalTeamResult.appearances} apps · ${state.season.nationalTeamResult.goals} goals`
              : "Not selected"}
            {state.season.nationalTeamResult.tournamentFinish !== "not-held" &&
              ` · ${state.season.nationalTeamResult.tournamentFinish}`}
          </dd>
        </div>
      </dl>
    </section>
  );
};
