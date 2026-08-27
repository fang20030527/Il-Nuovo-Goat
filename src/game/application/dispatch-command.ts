import type {
  CareerArchive,
  CareerPhase,
  CareerState,
  Honour,
  IndividualAward,
  RngState,
  SeasonState,
} from "@/game/domain/career";
import type { GameCommand } from "@/game/domain/commands";
import type {
  ActiveMoment,
  CompetitionKind,
  Fixture,
  LeagueTableRow,
  MatchResult,
  PlayerMatchPerformance,
} from "@/game/domain/competition";
import type { Player, SeasonStats } from "@/game/domain/player";
import { emptySeasonStats } from "@/game/domain/player";
import type { World } from "@/game/domain/world";
import type { ClubId, EventId, LeagueId } from "@/game/domain/ids";
import { gameError, type GameResult } from "@/game/domain/errors";
import { createDoubleRoundRobin } from "@/game/engine/schedule";
import { simulateMatch } from "@/game/engine/match";
import { createMoment, resolveMoment, momentOptions } from "@/game/engine/moments";
import { applyLeagueResult, createEmptyTable, sortTable } from "@/game/engine/table";
import {
  playContinentalCup,
  playDomesticCup,
} from "@/game/engine/competitions";
import {
  simulateNeutralMatch,
  selectNationalTeam,
  runNationalTournament,
  applyPromotionRelegation,
} from "@/game/engine/season";

const freshSeasonState = (season: number, status: SeasonState["status"]): SeasonState => ({
  season,
  status,
  completedClubFixtures: 0,
  fixtures: [],
  results: [],
  leagueTables: [],
  domesticCupWinners: [],
  continentalCupWinner: null,
  nationalTeamResult: {
    selected: false,
    appearances: 0,
    goals: 0,
    tournamentFinish: "not-held",
  },
  pendingFixtureId: null,
  detailed: null,
});
import { rollMatchInjury, advanceInjuryRecovery } from "@/game/engine/injuries";
import { applySeasonProgression } from "@/game/engine/progression";
import {
  generateTransferOffers,
  acceptTransfer,
  renewContract,
  estimateClubRole,
} from "@/game/engine/transfers";
import { selectEvent } from "@/game/events/select-event";
import { applyEventChoice } from "@/game/events/apply-event-choice";

const allowedCommands: Record<CareerPhase, readonly GameCommand["type"][]> = {
  preseason: ["START_SEASON"],
  "classic-checkpoint": ["ADVANCE_CLASSIC", "CHOOSE_EVENT"],
  "detailed-prematch": ["START_NEXT_MATCH"],
  "detailed-moment": ["CHOOSE_MOMENT"],
  "detailed-postmatch": ["ACKNOWLEDGE_MATCH", "CHOOSE_EVENT"],
  "season-review": ["CHOOSE_TRANSFER"],
  "transfer-window": ["CHOOSE_TRANSFER", "START_NEXT_SEASON"],
  retired: [],
};

const CLASSIC_CHECKPOINTS = [4, 8, 12, 16] as const;
const NATIONAL_TOURNAMENT_INTERVAL = 4;
/** Number of completed club fixtures between career-event eligibility checks. */
const EVENT_CHECK_INTERVAL = 4;

const clamp = (min: number, max: number, value: number) => Math.max(min, Math.min(max, value));

const addStats = (a: SeasonStats, b: SeasonStats): SeasonStats => ({
  appearances: a.appearances + b.appearances,
  starts: a.starts + b.starts,
  minutes: a.minutes + b.minutes,
  goals: a.goals + b.goals,
  assists: a.assists + b.assists,
  cleanSheets: a.cleanSheets + b.cleanSheets,
  saves: a.saves + b.saves,
  yellowCards: a.yellowCards + b.yellowCards,
  redCards: a.redCards + b.redCards,
  defensiveActions: a.defensiveActions + b.defensiveActions,
  chancesCreated: a.chancesCreated + b.chancesCreated,
  goalsPrevented: a.goalsPrevented + b.goalsPrevented,
  ratingTotal: a.ratingTotal + b.ratingTotal,
  ratedMatches: a.ratedMatches + b.ratedMatches,
});

type DetailedState = NonNullable<SeasonState["detailed"]>;

/**
 * Builds the detailed-mode view of the player's league: fixtures involving the
 * player are stepped through one at a time, everything else is simulated as
 * neutral filler so the final table stays complete.
 */
const createDetailedState = (world: World, player: Player, season: number): DetailedState | null => {
  const playerClub = world.clubs.find((club) => club.id === player.clubId);
  if (!playerClub) return null;
  const leagueFixtures = createDoubleRoundRobin(
    playerClub.leagueId,
    world.clubs.filter((club) => club.leagueId === playerClub.leagueId).map((club) => club.id),
    season,
  );
  return {
    playerFixtures: leagueFixtures.filter(
      (fixture) => fixture.homeClubId === player.clubId || fixture.awayClubId === player.clubId,
    ),
    nextFixtureIndex: 0,
    seasonStats: emptySeasonStats(),
    timeline: [],
    pendingMoment: null,
    lastMatch: null,
    playedResults: [],
    neutralResults: [],
  };
};

const isNationalTournamentSeason = (season: number): boolean =>
  season % NATIONAL_TOURNAMENT_INTERVAL === 0;

const opponentLineFor = (world: World, player: Player, fixture: Fixture): number => {
  const opponentId = fixture.homeClubId === player.clubId ? fixture.awayClubId : fixture.homeClubId;
  return world.clubs.find((club) => club.id === opponentId)?.lines[player.position] ?? 60;
};

/** Simulates the neutral (non-player) fixtures of the player's league. */
const playNeutralLeagueFixtures = (
  world: World,
  player: Player,
  season: number,
  rng: RngState,
): { results: MatchResult[]; rng: RngState } => {
  const playerClub = world.clubs.find((club) => club.id === player.clubId);
  if (!playerClub) return { results: [], rng };
  const fixtures = createDoubleRoundRobin(
    playerClub.leagueId,
    world.clubs.filter((club) => club.leagueId === playerClub.leagueId).map((club) => club.id),
    season,
  ).filter(
    (fixture) => fixture.homeClubId !== player.clubId && fixture.awayClubId !== player.clubId,
  );
  let currentRng = rng;
  const results: MatchResult[] = [];
  for (const fixture of fixtures) {
    const outcome = simulateNeutralMatch(world, fixture, currentRng);
    currentRng = outcome.rng;
    results.push(outcome.result);
  }
  return { results, rng: currentRng };
};

/**
 * Builds the final table for the player's league from the already-played
 * player results and the neutral results. All matches of the league schedule
 * are represented exactly once.
 */
const buildPlayerLeagueTable = (
  world: World,
  player: Player,
  playedResults: readonly MatchResult[],
  neutralResults: readonly MatchResult[],
): readonly LeagueTableRow[] => {
  const playerClub = world.clubs.find((club) => club.id === player.clubId);
  if (!playerClub) return [];
  let table = createEmptyTable(
    world.clubs.filter((club) => club.leagueId === playerClub.leagueId).map((club) => club.id),
  );
  for (const result of [...playedResults, ...neutralResults]) {
    table = applyLeagueResult(table, result);
  }
  return table;
};

/** Tries to surface a career event; sets `activeEventId` when one is eligible. */
const maybeTriggerEvent = (state: CareerState): CareerState => {
  if (state.activeEventId) return state;
  const completed = state.season.completedClubFixtures;
  if (completed <= 0 || completed % EVENT_CHECK_INTERVAL !== 0) return state;
  const selection = selectEvent(state);
  if (!selection.ok) return state;
  return {
    ...state,
    rng: selection.value.rng,
    activeEventId: selection.value.event.id,
  };
};

interface SeasonComputationInput {
  readonly world: World;
  readonly player: Player;
  readonly season: number;
  readonly rng: RngState;
}

interface SeasonComputation {
  readonly world: World;
  readonly player: Player;
  readonly seasonState: SeasonState;
  readonly archive: CareerArchive;
  readonly rng: RngState;
  readonly honours: readonly Honour[];
  readonly awards: readonly IndividualAward[];
}

interface LeagueSeasonResult {
  readonly table: readonly LeagueTableRow[];
  readonly seasonStats: SeasonStats;
  readonly player: Player;
  readonly rng: RngState;
  readonly timeline: readonly string[];
}

/**
 * Plays all fixtures of the player's league (player matches and neutral ones
 * alike) and returns the final table together with the player's season stats.
 * Classic mode calls this once per season; detailed mode instead steps through
 * `playPlayerFixture` one match at a time so key moments can pause for a
 * decision and neutral filler is simulated at the end of the season.
 */
const playLeagueSeason = (
  world: World,
  player: Player,
  season: number,
  rng: RngState,
): LeagueSeasonResult => {
  let currentPlayer = player;
  let currentRng = rng;
  let seasonStats = emptySeasonStats();
  const timeline: string[] = [];

  const playerClub = world.clubs.find((club) => club.id === currentPlayer.clubId)!;
  const leagueClubIds = world.clubs
    .filter((club) => club.leagueId === playerClub.leagueId)
    .map((club) => club.id);
  const leagueFixtures = createDoubleRoundRobin(playerClub.leagueId, leagueClubIds, season);

  let table = createEmptyTable(leagueClubIds);

  for (const fixture of leagueFixtures) {
    const involvesPlayer =
      fixture.homeClubId === currentPlayer.clubId || fixture.awayClubId === currentPlayer.clubId;
    if (involvesPlayer) {
      const played = playPlayerFixture({
        world,
        player: currentPlayer,
        fixture,
        seasonStats,
        rng: currentRng,
        momentChoice: "auto",
      });
      currentRng = played.rng;
      currentPlayer = played.player;
      seasonStats = played.seasonStats;
      timeline.push(...played.timeline);
      table = applyLeagueResult(table, played.tableResult);
    } else {
      const outcome = simulateNeutralMatch(world, fixture, currentRng);
      currentRng = outcome.rng;
      table = applyLeagueResult(table, outcome.result);
    }
  }

  return { table, seasonStats, player: currentPlayer, rng: currentRng, timeline };
};

interface PlayerFixtureInput {
  readonly world: World;
  readonly player: Player;
  readonly fixture: Fixture;
  readonly seasonStats: SeasonStats;
  readonly rng: RngState;
  /**
   * "auto" resolves an arising key moment with the lowest-risk option (classic
   * mode); "pause" leaves the moment pending for a CHOOSE_MOMENT command
   * (detailed mode); a concrete option id resolves it immediately.
   */
  readonly momentChoice: "auto" | "pause" | string;
}

interface PlayerFixtureResult {
  readonly result: MatchResult;
  /** Table entry for the league table; goals include any moment resolution. */
  readonly tableResult: MatchResult;
  readonly player: Player;
  readonly seasonStats: SeasonStats;
  readonly rng: RngState;
  readonly timeline: readonly string[];
  readonly pendingMoment: DetailedState["pendingMoment"];
}

/**
 * Plays a single league fixture involving the player's club: match simulation,
 * optional key moment (auto-resolved or left pending), injury roll, and one
 * recovery step.
 */
const playPlayerFixture = (input: PlayerFixtureInput): PlayerFixtureResult => {
  const { world, fixture } = input;
  let rng = input.rng;
  let player = input.player;
  let seasonStats = input.seasonStats;
  const timeline: string[] = [];

  const opponentLine = opponentLineFor(world, player, fixture);
  const outcome = simulateMatch({ fixture, world, player, rng });
  rng = outcome.rng;
  const result = outcome.result;
  let performance = result.playerPerformance;

  let homeGoals = result.homeGoals;
  let awayGoals = result.awayGoals;

  if (performance) {
    const created = createMoment({
      fixtureId: fixture.id,
      minute: 0,
      score: [homeGoals, awayGoals],
      player,
      playerMinutes: performance.minutes,
      opponentLine,
      rng,
    });
    rng = created.rng;
    if (created.moment && input.momentChoice === "pause") {
      return {
        result,
        tableResult: { ...result, playerPerformance: null },
        player,
        seasonStats,
        rng,
        timeline,
        pendingMoment: {
          fixtureId: fixture.id,
          minute: created.moment.minute,
          score: created.moment.score,
          playerMinutes: performance.minutes,
          opponentLine,
          performance,
          options: created.moment.options,
        },
      };
    }
    if (created.moment) {
      const options = momentOptions[player.position];
      const optionId =
        input.momentChoice === "auto"
          ? (options.find((option) => option.risk === "low") ?? options[0]!).id
          : input.momentChoice;
      const resolution = resolveMoment(
        {
          fixtureId: fixture.id,
          minute: created.moment.minute,
          score: created.moment.score,
          player,
          playerMinutes: performance.minutes,
          opponentLine,
          moment: created.moment,
          rng,
        },
        optionId,
      );
      if (resolution.ok) {
        rng = resolution.value.rng;
        timeline.push(resolution.value.timelineEntry);
        homeGoals = resolution.value.score[0];
        awayGoals = resolution.value.score[1];
        performance = {
          ...performance,
          ratingTotal: performance.ratingTotal + resolution.value.ratingDelta,
          rating: Math.round((performance.rating + resolution.value.ratingDelta) * 10) / 10,
        };
      }
    }
    seasonStats = addStats(seasonStats, performance);
    const injuryRoll = rollMatchInjury({ player, rng, recentMinutes: seasonStats.minutes });
    rng = injuryRoll.rng;
    player = { ...player, injury: injuryRoll.injury };
  }
  player = advanceInjuryRecovery(player);

  return {
    result,
    tableResult: {
      ...result,
      homeGoals,
      awayGoals,
      playerPerformance: null,
    },
    player,
    seasonStats,
    rng,
    timeline,
    pendingMoment: null,
  };
};

/**
 * Resolves a pending key moment in detailed mode and finishes the interrupted
 * fixture, reproducing exactly the post-moment steps of `playPlayerFixture`.
 */
const resolvePendingMoment = (
  world: World,
  player: Player,
  fixture: Fixture,
  baseResult: MatchResult,
  pending: NonNullable<DetailedState["pendingMoment"]>,
  seasonStats: SeasonStats,
  rng: RngState,
  optionId: string,
): GameResult<PlayerFixtureResult> => {
  const moment = stateMomentFromPending(pending);
  const resolution = resolveMoment(
    {
      fixtureId: pending.fixtureId,
      minute: pending.minute,
      score: pending.score,
      player,
      playerMinutes: pending.playerMinutes,
      opponentLine: pending.opponentLine,
      moment,
      rng,
    },
    optionId,
  );
  if (!resolution.ok) return resolution;

  const timeline = [resolution.value.timelineEntry];
  const performance: PlayerMatchPerformance = {
    ...pending.performance,
    ratingTotal: pending.performance.ratingTotal + resolution.value.ratingDelta,
    rating: Math.round((pending.performance.rating + resolution.value.ratingDelta) * 10) / 10,
  };
  const nextSeasonStats = addStats(seasonStats, performance);

  let nextRng = resolution.value.rng;
  let nextPlayer = player;
  const injuryRoll = rollMatchInjury({ player: nextPlayer, rng: nextRng, recentMinutes: nextSeasonStats.minutes });
  nextRng = injuryRoll.rng;
  nextPlayer = { ...nextPlayer, injury: injuryRoll.injury };
  nextPlayer = advanceInjuryRecovery(nextPlayer);

  return {
    ok: true,
    value: {
      result: baseResult,
      tableResult: {
        ...baseResult,
        homeGoals: resolution.value.score[0],
        awayGoals: resolution.value.score[1],
        playerPerformance: null,
      },
      player: nextPlayer,
      seasonStats: nextSeasonStats,
      rng: nextRng,
      timeline,
      pendingMoment: null,
    },
  };
};

/** Rebuilds the ActiveMoment view from a stored pending-moment context. */
const stateMomentFromPending = (
  pending: NonNullable<DetailedState["pendingMoment"]>,
): ActiveMoment => ({
  fixtureId: pending.fixtureId,
  minute: pending.minute,
  score: pending.score,
  prompt: "A key decision is required.",
  options: pending.options,
});

const averageRating = (stats: SeasonStats): number =>
  stats.ratedMatches > 0 ? stats.ratingTotal / stats.ratedMatches : 6;

const clubHonour = (
  clubId: ClubId,
  kind: CompetitionKind,
  label: string,
  stats: SeasonStats,
  availableMinutes: number,
): Honour => ({
  id: `${kind}-${clubId}`,
  label,
  kind,
  contributionMinutes: stats.minutes,
  availableMinutes,
});

interface FinalizeSeasonInput extends SeasonComputationInput {
  /**
   * When the player's league was already played match by match (detailed
   * mode), this supplies the outcome and the league loop is skipped.
   */
  readonly playerLeague: LeagueSeasonResult | null;
}

/**
 * Finishes a season after the player's league campaign is complete: computes
 * the remaining leagues, promotion/relegation, cups, national team duty,
 * awards, and player progression, then builds the archive and season summary.
 * Shared by classic (league played wholesale) and detailed (played per match).
 */
const finalizeSeason = (input: FinalizeSeasonInput): SeasonComputation => {
  const { world, season } = input;
  let rng = input.rng;
  let player = input.player;
  const seasonStats = input.playerLeague?.seasonStats ?? emptySeasonStats();

  const playerClub = world.clubs.find((club) => club.id === player.clubId)!;

  let table: readonly LeagueTableRow[];
  if (input.playerLeague) {
    table = input.playerLeague.table;
    rng = input.playerLeague.rng;
    player = input.playerLeague.player;
  } else {
    const played = playLeagueSeason(world, player, season, rng);
    table = played.table;
    rng = played.rng;
    player = played.player;
  }

  const rows = sortTable(table);
  const playerLeagueTable = {
    leagueId: playerClub.leagueId,
    rows,
    promoted: playerClub.leagueId.endsWith("-2") ? [rows[0]!.clubId, rows[1]!.clubId] : [],
    relegated: playerClub.leagueId.endsWith("-1") ? [rows[8]!.clubId, rows[9]!.clubId] : [],
  };

  let worldAfter = world;
  const otherTables: {
    readonly leagueId: LeagueId;
    readonly rows: readonly LeagueTableRow[];
    readonly promoted: readonly ClubId[];
    readonly relegated: readonly ClubId[];
  }[] = [];
  for (const league of world.leagues) {
    if (league.id === playerClub.leagueId) continue;
    const clubIds = world.clubs.filter((club) => club.leagueId === league.id).map((club) => club.id);
    const fixtures = createDoubleRoundRobin(league.id, clubIds, season);
    let otherTable = createEmptyTable(clubIds);
    for (const fixture of fixtures) {
      const outcome = simulateNeutralMatch(world, fixture, rng);
      rng = outcome.rng;
      otherTable = applyLeagueResult(otherTable, outcome.result);
    }
    const otherRows = sortTable(otherTable);
    otherTables.push({
      leagueId: league.id,
      rows: otherRows,
      promoted: league.level === 2 ? [otherRows[0]!.clubId, otherRows[1]!.clubId] : [],
      relegated: league.level === 1 ? [otherRows[8]!.clubId, otherRows[9]!.clubId] : [],
    });
  }
  const allTables = [playerLeagueTable, ...otherTables];
  worldAfter = applyPromotionRelegation(world, allTables);

  const domesticCupWinners: ClubId[] = [];
  for (const country of world.countries) {
    const cup = playDomesticCup(worldAfter, country.id, season, rng);
    rng = cup.rng;
    domesticCupWinners.push(cup.winner);
  }

  const qualifiers = allTables
    .filter((entry) => entry.leagueId.endsWith("-1"))
    .flatMap((entry) => entry.rows.slice(0, 4).map((row) => row.clubId));
  const continental = playContinentalCup(worldAfter, qualifiers, season, rng);
  rng = continental.rng;

  const honours: Honour[] = [];
  const playerRow = playerLeagueTable.rows.find((row) => row.clubId === player.clubId);
  const wonLeague = playerRow && playerLeagueTable.rows[0]?.clubId === player.clubId;
  const league = world.leagues.find((entry) => entry.id === playerClub.leagueId);
  if (wonLeague && league) {
    honours.push(clubHonour(player.clubId, "league", `${league.name} champion`, seasonStats, 3420));
  }
  const countryCupWinner = domesticCupWinners[world.countries.findIndex((c) => c.id === playerClub.countryId)];
  if (countryCupWinner === player.clubId) {
    honours.push(clubHonour(player.clubId, "domestic-cup", "Domestic cup winner", seasonStats, 540));
  }
  if (continental.winner === player.clubId) {
    honours.push(clubHonour(player.clubId, "continental", "Continental cup winner", seasonStats, 1080));
  }

  let national: SeasonState["nationalTeamResult"] = {
    selected: false,
    appearances: 0,
    goals: 0,
    tournamentFinish: "not-held" as const,
  };
  if (isNationalTournamentSeason(season)) {
    const selection = selectNationalTeam(
      player,
      { seasonMinutes: seasonStats.minutes, clubReputation: playerClub.reputation },
      rng,
    );
    rng = selection.rng;
    const tournament = runNationalTournament(worldAfter, season, rng);
    rng = tournament.rng;
    const wonNational = tournament.winner === player.nationality;
    national = {
      selected: selection.selected,
      appearances: selection.selected ? 5 : 0,
      goals: selection.selected ? Math.round(seasonStats.goals / 6) : 0,
      tournamentFinish: wonNational ? "champion" : selection.selected ? "group" : "not-held",
    };
    if (selection.selected) {
      player = {
        ...player,
        nationalTeam: {
          selected: true,
          caps: player.nationalTeam.caps + national.appearances,
          goals: player.nationalTeam.goals + national.goals,
        },
      };
    }
  }

  const awards: IndividualAward[] = [];
  if (averageRating(seasonStats) >= 7.6 && seasonStats.minutes >= 1800 && league?.level === 1) {
    awards.push({ id: `poty-${season}`, label: "Player of the Season", scope: "league" });
  }
  if (seasonStats.goals >= 15 && player.position === "forward" && league?.level === 1) {
    awards.push({ id: `topscorer-${season}`, label: "Top Scorer", scope: "league" });
  }

  const progressed = applySeasonProgression({
    player,
    seasonStats,
    facilities: playerClub.facilities,
    trainingFocus: "technique",
    rng,
  });
  rng = progressed.rng;
  player = {
    ...progressed.player,
    marketValue: Math.max(
      50_000,
      Math.round(
        progressed.player.overall ** 2.6 *
          (player.age <= 24 ? 1.2 : player.age <= 29 ? 1 : 0.6) *
          (1 + progressed.player.reputation / 100) *
          40,
      ),
    ),
    reputation: clamp(
      0,
      100,
      progressed.player.reputation + (averageRating(seasonStats) - 6.3) * 6 + honours.length * 8,
    ),
    form: clamp(0, 100, 45 + (averageRating(seasonStats) - 6.2) * 12),
    morale: clamp(0, 100, 55 + honours.length * 8 - (player.injury ? 10 : 0)),
    coachTrust: clamp(0, 100, 40 + seasonStats.minutes / 120),
    fitness: 80,
  };

  const archive: CareerArchive = {
    season,
    age: player.age,
    clubId: player.clubId,
    stats: seasonStats,
    overall: player.overall,
    marketValue: player.marketValue,
    competitionStats: [
      {
        competitionId: playerClub.leagueId,
        kind: "league",
        availableMinutes: 3420,
        stats: seasonStats,
      },
    ],
    honours,
    awards,
  };

  const seasonState: SeasonState = {
    season,
    status: "complete",
    completedClubFixtures: 18,
    fixtures: [],
    results: [],
    leagueTables: allTables.map((entry) => ({ leagueId: entry.leagueId, rows: entry.rows })),
    domesticCupWinners,
    continentalCupWinner: continental.winner,
    nationalTeamResult: national,
    pendingFixtureId: null,
    detailed: null,
  };

  return { world: worldAfter, player, seasonState, archive, rng, honours, awards };
};

/** Classic-mode full-season resolution: league played wholesale, then finalized. */
const computeSeason = (input: SeasonComputationInput): SeasonComputation =>
  finalizeSeason({ ...input, playerLeague: null });

const appendCommand = (state: CareerState, command: GameCommand): CareerState => ({
  ...state,
  commandHistory: [...state.commandHistory, { index: state.commandHistory.length, command }],
});

const withHistory = (state: CareerState, type: string, summary: string): CareerState => ({
  ...state,
  careerHistory: [
    ...state.careerHistory,
    { type, season: state.season.season, age: state.player.age, summary },
  ],
});

const finishSeason = (state: CareerState): CareerState => {
  const computation = computeSeason({
    world: state.world,
    player: state.player,
    season: state.season.season,
    rng: state.rng,
  });
  return applySeasonComputation(state, computation);
};

/**
 * Applies a completed season computation to the career: archives it, generates
 * transfer offers, and moves to the transfer window (or retirement).
 */
const applySeasonComputation = (
  state: CareerState,
  computation: SeasonComputation,
): CareerState => {

  const retired = state.player.age >= 36;
  const nextAge = retired ? state.player.age : state.player.age + 1;

  const player: Player = { ...computation.player, age: nextAge };
  const world = computation.world;

  const offersResult = retired
    ? { value: [], rng: computation.rng }
    : generateTransferOffers({
        player,
        world,
        season: state.season.season,
        rng: computation.rng,
      intent: state.careerIntent === "seek-transfer" ? "push" : "open",
      });
  const rng = offersResult.rng;

  let next: CareerState = {
    ...state,
    world,
    player,
    rng,
    season: computation.seasonState,
    archives: [...state.archives, computation.archive],
    transferOffers: offersResult.value,
    phase: retired ? "retired" : "transfer-window",
    activeMoment: null,
    activeEventId: null,
  };
  next = withHistory(
    next,
    "SEASON_COMPLETE",
    `Season ${state.season.season} finished: ${computation.archive.stats.appearances} apps, ${computation.archive.stats.goals} goals, ${computation.honours.length} honours.`,
  );
  if (retired) {
    next = withHistory(next, "RETIRED", `${player.name} retired at age ${state.player.age}.`);
  }
  return next;
};

const advanceClassicToCheckpoint = (state: CareerState): CareerState => {
  return maybeTriggerEvent(finishSeason(state));
};

export const dispatchCommand = (
  state: CareerState,
  command: GameCommand,
): GameResult<CareerState> => {
  const allowed = allowedCommands[state.phase];
  if (!allowed.includes(command.type)) {
    return gameError(
      "INVALID_COMMAND",
      `Command ${command.type} is not allowed in phase ${state.phase}`,
    );
  }

  switch (command.type) {
    case "START_SEASON": {
      const seasonState = freshSeasonState(state.season.season, "active");
      const next: CareerState = {
        ...state,
        mode: command.mode,
        trainingFocus: command.training,
        careerIntent: command.intent,
        season:
          command.mode === "detailed"
            ? {
                ...seasonState,
                detailed: createDetailedState(state.world, state.player, state.season.season),
              }
            : seasonState,
        phase: command.mode === "classic" ? "classic-checkpoint" : "detailed-prematch",
      };
      return { ok: true, value: appendCommand(next, command) };
    }
    case "ADVANCE_CLASSIC": {
      const finished = advanceClassicToCheckpoint(state);
      return { ok: true, value: appendCommand(finished, command) };
    }
    case "CHOOSE_EVENT": {
      if (!state.activeEventId) {
        return gameError("INVALID_STATE", "No active event to choose");
      }
      const applied = applyEventChoice(state, state.activeEventId as EventId, command.optionId);
      if (!applied.ok) return applied;
      const next: CareerState = { ...applied.value, activeEventId: null };
      return { ok: true, value: appendCommand(next, command) };
    }
    case "START_NEXT_MATCH": {
      const detailed = state.season.detailed;
      if (!detailed) {
        return gameError("INVALID_STATE", "Detailed season state is missing");
      }
      const fixture = detailed.playerFixtures[detailed.nextFixtureIndex];
      if (!fixture) {
        return gameError("INVALID_STATE", "No remaining fixtures in this detailed season");
      }
      const played = playPlayerFixture({
        world: state.world,
        player: state.player,
        fixture,
        seasonStats: detailed.seasonStats,
        rng: state.rng,
        momentChoice: "pause",
      });
      if (played.pendingMoment) {
        const next: CareerState = {
          ...state,
          rng: played.rng,
          phase: "detailed-moment",
          activeMoment: stateMomentFromPending(played.pendingMoment),
          season: {
            ...state.season,
            detailed: {
              ...detailed,
              lastMatch: played.result,
              pendingMoment: played.pendingMoment,
            },
          },
        };
        return { ok: true, value: appendCommand(next, command) };
      }
      // Completing a match without a moment pause consumes the deterministic
      // post-match window event check.
      const withWindow = maybeTriggerEvent({
        ...state,
        rng: played.rng,
        player: played.player,
      });
      const next: CareerState = {
        ...withWindow,
        player: played.player,
        activeMoment: null,
        season: {
          ...state.season,
          completedClubFixtures: state.season.completedClubFixtures + 1,
          detailed: {
            ...detailed,
            seasonStats: played.seasonStats,
            timeline: [...detailed.timeline, ...played.timeline],
            pendingMoment: null,
            lastMatch: played.result,
            playedResults: [...detailed.playedResults, played.tableResult],
          },
        },
        phase: "detailed-postmatch",
      };
      return { ok: true, value: appendCommand(next, command) };
    }
    case "CHOOSE_MOMENT": {
      if (!state.activeMoment) {
        return gameError("INVALID_STATE", "No active moment to choose");
      }
      const detailed = state.season.detailed;
      const pending = detailed?.pendingMoment;
      if (!detailed || !pending) {
        return gameError("INVALID_STATE", "No pending moment context");
      }
      const fixture = detailed.playerFixtures[detailed.nextFixtureIndex];
      const baseResult = detailed.lastMatch;
      if (!fixture || !baseResult || baseResult.fixtureId !== pending.fixtureId) {
        return gameError("INVALID_STATE", "Pending moment does not match the current fixture");
      }
      const resolved = resolvePendingMoment(
        state.world,
        state.player,
        fixture,
        baseResult,
        pending,
        detailed.seasonStats,
        state.rng,
        command.optionId,
      );
      if (!resolved.ok) return resolved;
      const played = resolved.value;
      const withWindow = maybeTriggerEvent({
        ...state,
        rng: played.rng,
        player: played.player,
      });
      const next: CareerState = {
        ...withWindow,
        player: played.player,
        activeMoment: null,
        season: {
          ...state.season,
          completedClubFixtures: state.season.completedClubFixtures + 1,
          detailed: {
            ...detailed,
            seasonStats: played.seasonStats,
            timeline: [...detailed.timeline, ...played.timeline],
            pendingMoment: null,
            playedResults: [...detailed.playedResults, played.tableResult],
          },
        },
        phase: "detailed-postmatch",
      };
      return { ok: true, value: appendCommand(next, command) };
    }
    case "ACKNOWLEDGE_MATCH": {
      const detailed = state.season.detailed;
      if (!detailed) {
        return gameError("INVALID_STATE", "Detailed season state is missing");
      }
      const nextIndex = detailed.nextFixtureIndex + 1;
      if (nextIndex < detailed.playerFixtures.length) {
        const next: CareerState = {
          ...state,
          player: { ...state.player, currentSeasonStats: detailed.seasonStats },
          season: {
            ...state.season,
            detailed: { ...detailed, nextFixtureIndex: nextIndex },
          },
          phase: "detailed-prematch",
        };
        return { ok: true, value: appendCommand(next, command) };
      }
      // All player fixtures are done: simulate the remaining neutral league
      // matches, then run the shared season finalization.
      const neutral = playNeutralLeagueFixtures(state.world, state.player, state.season.season, state.rng);
      const playerLeagueTable = buildPlayerLeagueTable(
        state.world,
        state.player,
        detailed.playedResults,
        neutral.results,
      );
      const computation = finalizeSeason({
        world: state.world,
        player: state.player,
        season: state.season.season,
        rng: neutral.rng,
        playerLeague: {
          table: playerLeagueTable,
          seasonStats: detailed.seasonStats,
          player: state.player,
          rng: neutral.rng,
          timeline: detailed.timeline,
        },
      });
      const finished = applySeasonComputation(state, computation);
      return { ok: true, value: appendCommand(finished, command) };
    }
    case "CHOOSE_TRANSFER": {
      if (state.phase !== "season-review" && state.phase !== "transfer-window") {
        return gameError("INVALID_PHASE", "Transfers are only available after the season");
      }
      if (command.offerId === "stay") {
        const club = state.world.clubs.find((entry) => entry.id === state.player.clubId);
        if (!club) return gameError("INVALID_STATE", "Current club not found");
        const renewed =
          state.player.contract.endSeason <= state.season.season
            ? renewContract(state.player, club, state.season.season + 1, state.rng)
            : { contract: state.player.contract, rng: state.rng };
        const next: CareerState = {
          ...state,
          rng: renewed.rng,
          player: {
            ...state.player,
            contract: renewed.contract,
          },
          transferOffers: [],
        };
        return { ok: true, value: appendCommand(next, command) };
      }
      if (command.offerId === "seek") {
        const regenerated = generateTransferOffers({
          player: state.player,
          world: state.world,
          season: state.season.season,
          rng: state.rng,
          intent: "push",
        });
        const next: CareerState = {
          ...state,
          rng: regenerated.rng,
          transferOffers: regenerated.value,
        };
        return { ok: true, value: appendCommand(next, command) };
      }
      const offer = state.transferOffers.find((entry) => entry.id === command.offerId);
      if (!offer) {
        return gameError("INVALID_OPTION", `Unknown transfer offer: ${command.offerId}`);
      }
      const moved = acceptTransfer(state.player, offer);
      const nextClub = state.world.clubs.find((club) => club.id === offer.clubId);
      const next: CareerState = {
        ...state,
        player: { ...moved, coachTrust: 45, form: 55 },
        transferOffers: [],
      };
      const withNote = withHistory(
        next,
        "TRANSFER",
        `${state.player.name} transferred to ${nextClub?.name ?? offer.clubId}.`,
      );
      return { ok: true, value: appendCommand(withNote, command) };
    }
    case "START_NEXT_SEASON": {
      const nextSeasonNumber = state.season.season + 1;
      const base = freshSeasonState(nextSeasonNumber, "active");
      const next: CareerState = {
        ...state,
        season:
          state.mode === "detailed"
            ? { ...base, detailed: createDetailedState(state.world, state.player, nextSeasonNumber) }
            : base,
        // Mode, training, and intent carry over from START_SEASON; the next
        // season starts immediately without revisiting preseason.
        phase: state.mode === "classic" ? "classic-checkpoint" : "detailed-prematch",
        transferOffers: [],
        player: {
          ...state.player,
          currentSeasonStats: emptySeasonStats(),
        },
      };
      return { ok: true, value: appendCommand(next, command) };
    }
  }
};

export const __private__ = {
  computeSeason,
  createDetailedState,
  playPlayerFixture,
  playLeagueSeason,
  playNeutralLeagueFixtures,
  estimateClubRole,
  CLASSIC_CHECKPOINTS,
  selectEvent,
};
