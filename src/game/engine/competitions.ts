import type { ClubId } from "@/game/domain/ids";
import type { Fixture } from "@/game/domain/competition";
import type { World } from "@/game/domain/world";
import type { RngState } from "@/game/domain/career";
import { createKnockoutRound } from "@/game/engine/schedule";
import { simulateNeutralMatch } from "@/game/engine/season";

export interface KnockoutOutcome {
  readonly winners: readonly ClubId[];
  readonly results: readonly { fixtureId: string; homeGoals: number; awayGoals: number }[];
  readonly rng: RngState;
}

const sortByReputation = (world: World, clubIds: readonly ClubId[]): ClubId[] =>
  [...clubIds].sort((left, right) => {
    const leftClub = world.clubs.find((club) => club.id === left);
    const rightClub = world.clubs.find((club) => club.id === right);
    const reputationDiff = (rightClub?.reputation ?? 0) - (leftClub?.reputation ?? 0);
    return reputationDiff !== 0 ? reputationDiff : left.localeCompare(right);
  });

export const playKnockoutRound = (
  world: World,
  competitionId: string,
  entrants: readonly ClubId[],
  round: number,
  season: number,
  rng: RngState,
): KnockoutOutcome => {
  const pairing = createKnockoutRound(competitionId, entrants, round, season, rng);
  let state = pairing.rng;
  const winners: ClubId[] = [];
  const results: { fixtureId: string; homeGoals: number; awayGoals: number }[] = [];

  for (const fixture of pairing.fixtures) {
    const outcome = simulateNeutralMatch(world, fixture, state);
    state = outcome.rng;
    let homeGoals = outcome.result.homeGoals;
    let awayGoals = outcome.result.awayGoals;
    if (homeGoals === awayGoals) {
      homeGoals += 1; // deterministic "extra time" tiebreak
    }
    winners.push(homeGoals > awayGoals ? fixture.homeClubId : fixture.awayClubId);
    results.push({ fixtureId: fixture.id, homeGoals, awayGoals });
  }

  return { winners, results, rng: state };
};

export interface DomesticCupOutcome {
  readonly winner: ClubId;
  readonly rng: RngState;
}

export const playDomesticCup = (
  world: World,
  countryId: string,
  season: number,
  rng: RngState,
): DomesticCupOutcome => {
  const competitionId = `${countryId}-cup`;
  const entrants = world.clubs
    .filter((club) => club.countryId === countryId)
    .map((club) => club.id);
  const seeded = sortByReputation(world, entrants);
  const preliminary = seeded.slice(12);
  const byes = seeded.slice(0, 12);

  let state = rng;
  const prelim = playKnockoutRound(world, competitionId, preliminary, 0, season, state);
  state = prelim.rng;

  let field = [...byes, ...prelim.winners];
  for (let round = 1; field.length > 1; round += 1) {
    const outcome = playKnockoutRound(world, competitionId, field, round, season, state);
    state = outcome.rng;
    field = [...outcome.winners];
  }
  return { winner: field[0]!, rng: state };
};

export interface ContinentalOutcome {
  readonly winner: ClubId;
  readonly rng: RngState;
}

export const playContinentalCup = (
  world: World,
  qualifiers: readonly ClubId[],
  season: number,
  rng: RngState,
): ContinentalOutcome => {
  const competitionId = "continental-cup";
  let state = rng;

  // Group stage: four groups of four, double round robin within groups.
  const groups: ClubId[][] = [[], [], [], []];
  qualifiers.forEach((club, index) => {
    groups[index % 4]!.push(club);
  });
  const groupWinners: ClubId[] = [];
  const groupRunnersUp: ClubId[] = [];

  for (const group of groups) {
    const points = new Map<ClubId, number>(group.map((club) => [club, 0]));
    for (let homeIndex = 0; homeIndex < group.length; homeIndex += 1) {
      for (let awayIndex = 0; awayIndex < group.length; awayIndex += 1) {
        if (homeIndex === awayIndex) continue;
        const fixture: Fixture = {
          id: `${competitionId}-${season}-g` as Fixture["id"],
          competitionId,
          kind: "continental",
          season,
          round: 0,
          homeClubId: group[homeIndex]!,
          awayClubId: group[awayIndex]!,
          status: "scheduled",
        };
        const outcome = simulateNeutralMatch(world, fixture, state);
        state = outcome.rng;
        const { homeGoals, awayGoals } = outcome.result;
        points.set(group[homeIndex]!, points.get(group[homeIndex]!)! + (homeGoals > awayGoals ? 3 : homeGoals === awayGoals ? 1 : 0));
        points.set(group[awayIndex]!, points.get(group[awayIndex]!)! + (awayGoals > homeGoals ? 3 : homeGoals === awayGoals ? 1 : 0));
      }
    }
    const ordered = [...group].sort(
      (left, right) => (points.get(right)! - points.get(left)!) || left.localeCompare(right),
    );
    groupWinners.push(ordered[0]!);
    groupRunnersUp.push(ordered[1]!);
  }

  // Quarter-finals: winners vs runners-up, two legs simplified into one seeded round.
  let field: ClubId[] = [];
  for (let index = 0; index < 4; index += 1) {
    field.push(groupWinners[index]!, groupRunnersUp[(index + 1) % 4]!);
  }
  for (let round = 1; field.length > 1; round += 1) {
    const outcome = playKnockoutRound(world, competitionId, field, round, season, state);
    state = outcome.rng;
    field = [...outcome.winners];
  }
  return { winner: field[0]!, rng: state };
};
