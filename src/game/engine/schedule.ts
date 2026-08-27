import { fixtureId } from "@/game/domain/ids";
import type { ClubId, FixtureId, LeagueId } from "@/game/domain/ids";
import type { Fixture } from "@/game/domain/competition";
import { nextInt } from "./rng";
import type { RngState } from "@/game/domain/career";

const makeLeagueFixture = (
  league: LeagueId, season: number, round: number, index: number,
  homeClubId: ClubId, awayClubId: ClubId,
): Fixture => ({
  id: fixtureId(`${league}-${season}-${round}-${index}`),
  competitionId: league,
  kind: "league",
  season,
  round,
  homeClubId,
  awayClubId,
  status: "scheduled",
});

export const createDoubleRoundRobin = (
  league: LeagueId,
  entrants: readonly ClubId[],
  season: number,
): Fixture[] => {
  if (entrants.length !== 10 || new Set(entrants).size !== 10) {
    throw new Error("A league schedule requires ten unique clubs");
  }
  const rotation = [...entrants];
  const firstHalf: Fixture[] = [];
  for (let round = 1; round <= 9; round += 1) {
    for (let index = 0; index < 5; index += 1) {
      const left = rotation[index]!;
      const right = rotation[9 - index]!;
      const home = round % 2 === 0 ? right : left;
      const away = round % 2 === 0 ? left : right;
      firstHalf.push(makeLeagueFixture(league, season, round, index, home, away));
    }
    rotation.splice(1, 0, rotation.pop()!);
  }
  const secondHalf = firstHalf.map((fixture) => ({
    ...fixture,
    id: fixtureId(`${fixture.id}-return`),
    round: fixture.round + 9,
    homeClubId: fixture.awayClubId,
    awayClubId: fixture.homeClubId,
  }));
  return [...firstHalf, ...secondHalf];
};

export interface KnockoutPairing {
  readonly fixtures: readonly Fixture[];
  readonly rng: RngState;
}

export const createKnockoutRound = (
  competitionId: string,
  entrants: readonly ClubId[],
  round: number,
  season: number,
  rng: RngState,
): KnockoutPairing => {
  if (entrants.length % 2 !== 0 || entrants.length === 0) {
    throw new Error("A knockout round requires a positive even number of entrants");
  }
  const shuffled = [...entrants];
  let state = rng;
  for (let index = shuffled.length - 1; index > 0; index -= 1) {
    const draw = nextInt(state, 0, index);
    state = draw.state;
    const swap = shuffled[index]!;
    shuffled[index] = shuffled[draw.value]!;
    shuffled[draw.value] = swap;
  }
  const fixtures: Fixture[] = [];
  for (let index = 0; index < shuffled.length; index += 2) {
    fixtures.push({
      id: fixtureId(`${competitionId}-${season}-r${round}-${index / 2}`) as FixtureId,
      competitionId,
      kind: competitionId.includes("continental") ? "continental" : "domestic-cup",
      season,
      round,
      homeClubId: shuffled[index]!,
      awayClubId: shuffled[index + 1]!,
      status: "scheduled",
    });
  }
  return { fixtures, rng: state };
};
