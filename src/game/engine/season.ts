import type { ClubId, LeagueId } from "@/game/domain/ids";
import type { Fixture, LeagueTableRow, MatchResult } from "@/game/domain/competition";
import type { World } from "@/game/domain/world";
import type { RngState } from "@/game/domain/career";
import { createDoubleRoundRobin } from "@/game/engine/schedule";
import { applyLeagueResult, createEmptyTable, sortTable } from "@/game/engine/table";
import { playContinentalCup, playDomesticCup } from "@/game/engine/competitions";
import { nextFloat } from "@/game/engine/rng";
import type { Player } from "@/game/domain/player";
import type { CountryId } from "@/game/domain/ids";

export interface NationalTeamContext {
  readonly seasonMinutes: number;
  readonly clubReputation: number;
}

export interface NationalTeamSelection {
  readonly playerId: Player["id"];
  readonly selected: boolean;
  readonly probability: number;
  readonly rng: RngState;
}

export const NATIONAL_TEAM_OVR_THRESHOLD = 68;

export const selectNationalTeam = (
  player: Player,
  context: NationalTeamContext,
  rng: RngState,
): NationalTeamSelection => {
  if (player.overall < NATIONAL_TEAM_OVR_THRESHOLD) {
    return { playerId: player.id, selected: false, probability: 0, rng };
  }
  const ovrFactor = clamp(0, 1, (player.overall - NATIONAL_TEAM_OVR_THRESHOLD) / 20);
  const formFactor = clamp(0, 1, player.form / 100);
  const minutesFactor = clamp(0, 1, context.seasonMinutes / 2500);
  const reputationFactor = clamp(0, 1, context.clubReputation / 100);
  const probability = clamp(
    0,
    0.95,
    0.15 + ovrFactor * 0.45 + formFactor * 0.15 + minutesFactor * 0.15 + reputationFactor * 0.1,
  );
  const draw = nextFloat(rng);
  return {
    playerId: player.id,
    selected: draw.value < probability,
    probability,
    rng: draw.state,
  };
};

export const runNationalTournament = (
  world: World,
  season: number,
  rng: RngState,
): { winner: CountryId; rng: RngState } => {
  const entrants = world.countries.map((country) => country.id);
  const points = new Map<CountryId, number>(entrants.map((id) => [id, 0]));
  const goalsFor = new Map<CountryId, number>(entrants.map((id) => [id, 0]));
  const goalsAgainst = new Map<CountryId, number>(entrants.map((id) => [id, 0]));
  let state = rng;

  const strengthOf = (countryId: CountryId): number => {
    const clubs = world.clubs.filter((club) => club.countryId === countryId);
    if (clubs.length === 0) return 60;
    return clubs.reduce((sum, club) => sum + club.lines.forward, 0) / clubs.length;
  };

  for (let home = 0; home < entrants.length; home += 1) {
    for (let away = home + 1; away < entrants.length; away += 1) {
      const homeId = entrants[home]!;
      const awayId = entrants[away]!;
      const homeStrength = strengthOf(homeId) + 2;
      const awayStrength = strengthOf(awayId);
      const homeXg = clamp(0.25, 3.4, 1.25 + (homeStrength - awayStrength) / 35);
      const awayXg = clamp(0.25, 3.4, 1.25 + (awayStrength - homeStrength) / 35);
      const homeSample = sampleGoals(state, homeXg);
      state = homeSample.state;
      const awaySample = sampleGoals(state, awayXg);
      state = awaySample.state;
      const homeGoals = homeSample.goals;
      const awayGoals = awaySample.goals;
      goalsFor.set(homeId, goalsFor.get(homeId)! + homeGoals);
      goalsFor.set(awayId, goalsFor.get(awayId)! + awayGoals);
      goalsAgainst.set(homeId, goalsAgainst.get(homeId)! + awayGoals);
      goalsAgainst.set(awayId, goalsAgainst.get(awayId)! + homeGoals);
      if (homeGoals > awayGoals) points.set(homeId, points.get(homeId)! + 3);
      else if (awayGoals > homeGoals) points.set(awayId, points.get(awayId)! + 3);
      else {
        points.set(homeId, points.get(homeId)! + 1);
        points.set(awayId, points.get(awayId)! + 1);
      }
    }
  }

  const ranked = [...entrants].sort((a, b) => {
    const pointDiff = points.get(b)! - points.get(a)!;
    if (pointDiff !== 0) return pointDiff;
    const goalDiff =
      goalsFor.get(b)! - goalsAgainst.get(b)! - (goalsFor.get(a)! - goalsAgainst.get(a)!);
    if (goalDiff !== 0) return goalDiff;
    return String(a).localeCompare(String(b));
  });
  const finalA = ranked[0]!;
  const finalB = ranked[1]!;
  const aXg = clamp(0.25, 3.4, 1.25 + (strengthOf(finalA) - strengthOf(finalB)) / 35);
  const bXg = clamp(0.25, 3.4, 1.25 + (strengthOf(finalB) - strengthOf(finalA)) / 35);
  const aSample = sampleGoals(state, aXg);
  state = aSample.state;
  const bSample = sampleGoals(state, bXg);
  state = bSample.state;
  let winner = finalA;
  if (bSample.goals > aSample.goals) winner = finalB;
  else if (aSample.goals === bSample.goals) {
    const tiebreak = nextFloat(state);
    state = tiebreak.state;
    winner = tiebreak.value < 0.5 ? finalA : finalB;
  }
  return { winner, rng: state };
};

export interface LeagueSeasonResult {
  readonly leagueId: LeagueId;
  readonly rows: readonly LeagueTableRow[];
  readonly promoted: readonly ClubId[];
  readonly relegated: readonly ClubId[];
}

export interface SeasonState {
  readonly world: World;
  readonly season: number;
  readonly status: "in-progress" | "complete";
  readonly leagueTables: readonly LeagueSeasonResult[];
  readonly domesticCupWinners: readonly ClubId[];
  readonly continentalCupWinner: ClubId | null;
  readonly rng: RngState;
}

const clamp = (min: number, max: number, value: number) => Math.max(min, Math.min(max, value));

const sampleGoals = (rng: RngState, expectedGoals: number) => {
  let state = rng;
  let goals = 0;
  const chance = clamp(0.02, 0.55, expectedGoals / 6);
  for (let attempt = 0; attempt < 6; attempt += 1) {
    const draw = nextFloat(state);
    state = draw.state;
    if (draw.value < chance) goals += 1;
  }
  return { goals, state };
};

export const simulateNeutralMatch = (
  world: World,
  fixture: Fixture,
  rng: RngState,
): { result: MatchResult; rng: RngState } => {
  const home = world.clubs.find((club) => club.id === fixture.homeClubId);
  const away = world.clubs.find((club) => club.id === fixture.awayClubId);
  const homeStrength = home ? home.lines.forward * 0.5 + home.lines.midfielder * 0.3 + home.homeAdvantage : 60;
  const awayStrength = away ? away.lines.forward * 0.5 + away.lines.midfielder * 0.3 : 60;
  const homeXg = clamp(0.25, 3.4, 1.25 + (homeStrength - awayStrength) / 35);
  const awayXg = clamp(0.25, 3.4, 1.25 + (awayStrength - homeStrength) / 35);

  const homeSample = sampleGoals(rng, homeXg);
  const awaySample = sampleGoals(homeSample.state, awayXg);
  return {
    result: {
      fixtureId: fixture.id,
      homeClubId: fixture.homeClubId,
      awayClubId: fixture.awayClubId,
      homeGoals: homeSample.goals,
      awayGoals: awaySample.goals,
      playerPerformance: null,
      timeline: [],
    },
    rng: awaySample.state,
  };
};

export const createSeasonState = (world: World, season: number, rng: RngState): SeasonState => ({
  world,
  season,
  status: "in-progress",
  leagueTables: [],
  domesticCupWinners: [],
  continentalCupWinner: null,
  rng,
});

export const runSeasonToCompletion = (state: SeasonState): SeasonState => {
  const { world, season } = state;
  let rng = state.rng;

  const leagueTables: LeagueSeasonResult[] = [];
  for (const league of world.leagues) {
    const clubIds = world.clubs
      .filter((club) => club.leagueId === league.id)
      .map((club) => club.id);
    const fixtures = createDoubleRoundRobin(league.id, clubIds, season);
    let table = createEmptyTable(clubIds);
    for (const fixture of fixtures) {
      const outcome = simulateNeutralMatch(world, fixture, rng);
      rng = outcome.rng;
      table = applyLeagueResult(table, {
        fixtureId: fixture.id,
        homeClubId: fixture.homeClubId,
        awayClubId: fixture.awayClubId,
        homeGoals: outcome.result.homeGoals,
        awayGoals: outcome.result.awayGoals,
        playerPerformance: null,
        timeline: [],
      });
    }
    const rows = sortTable(table);
    leagueTables.push({
      leagueId: league.id,
      rows,
      promoted: league.level === 2 ? [rows[0]!.clubId, rows[1]!.clubId] : [],
      relegated: league.level === 1 ? [rows[8]!.clubId, rows[9]!.clubId] : [],
    });
  }

  const domesticCupWinners: ClubId[] = [];
  for (const country of world.countries) {
    const cup = playDomesticCup(world, country.id, season, rng);
    rng = cup.rng;
    domesticCupWinners.push(cup.winner);
  }

  const qualifiers = leagueTables
    .filter((table) => table.leagueId.endsWith("-1"))
    .flatMap((table) => table.rows.slice(0, 4).map((row) => row.clubId));
  const continental = playContinentalCup(world, qualifiers, season, rng);
  rng = continental.rng;

  return {
    ...state,
    status: "complete",
    leagueTables,
    domesticCupWinners,
    continentalCupWinner: continental.winner,
    rng,
  };
};

export const applyPromotionRelegation = (
  world: World,
  leagueTables: readonly LeagueSeasonResult[],
): World => {
  const moves = new Map<ClubId, LeagueId>();
  for (const table of leagueTables) {
    const level = table.leagueId.endsWith("-1") ? 1 : 2;
    const country = table.leagueId.slice(0, -2);
    if (level === 1) {
      for (const club of table.relegated) moves.set(club, `${country}-2` as LeagueId);
    } else {
      for (const club of table.promoted) moves.set(club, `${country}-1` as LeagueId);
    }
  }
  const clubs = world.clubs.map((club) => {
    const nextLeague = moves.get(club.id);
    return nextLeague ? { ...club, leagueId: nextLeague } : club;
  });
  for (const league of world.leagues) {
    const count = clubs.filter((club) => club.leagueId === league.id).length;
    if (count !== 10) {
      throw new Error(`League ${league.id} would have ${count} clubs after promotion/relegation`);
    }
  }
  return { ...world, clubs };
};
