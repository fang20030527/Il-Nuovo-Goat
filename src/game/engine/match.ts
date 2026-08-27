import type { Fixture, MatchResult, PlayerMatchPerformance } from "@/game/domain/competition";
import type { Player } from "@/game/domain/player";
import { emptySeasonStats } from "@/game/domain/player";
import type { World } from "@/game/domain/world";
import type { RngState } from "@/game/domain/career";
import { nextFloat } from "@/game/engine/rng";

export interface MatchContext {
  readonly fixture: Fixture;
  readonly world: World;
  readonly player: Player;
  readonly rng: RngState;
}

export interface MatchOutcome {
  readonly result: MatchResult;
  readonly rng: RngState;
}

const clamp = (min: number, max: number, value: number) => Math.max(min, Math.min(max, value));

const sampleGoals = (rng: RngState, expectedGoals: number): { goals: number; state: RngState } => {
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

const attackValue = (
  attack: number,
  midfield: number,
  opposingDefence: number,
  homeAdvantage: number,
): number =>
  attack * 0.4 + midfield * 0.25 + (100 - opposingDefence) * 0.25 + homeAdvantage * 0.05 + 60 * 0.05;

const expectedGoals = (own: number, opponent: number): number =>
  clamp(0.25, 3.4, 1.25 + (own - opponent) / 35);

interface Selection {
  readonly appears: boolean;
  readonly starts: boolean;
  readonly minutes: number;
  readonly state: RngState;
}

const selectPlayer = (context: MatchContext, state: RngState): Selection => {
  const { fixture, player } = context;
  const idle = { appears: false, starts: false, minutes: 0, state };
  if (player.clubId !== fixture.homeClubId && player.clubId !== fixture.awayClubId) {
    return idle;
  }
  if (player.injury) {
    return idle;
  }
  const club = context.world.clubs.find((entry) => entry.id === player.clubId);
  if (!club) return idle;

  const line = club.lines[player.position];
  const roleScore: Record<Player["contract"]["role"], number> = {
    star: 0.4,
    starter: 0.25,
    rotation: 0.05,
    prospect: -0.15,
  };
  const probability = clamp(
    0.05,
    0.98,
    0.55 +
      roleScore[player.contract.role] +
      (player.coachTrust - 50) / 200 +
      (player.fitness - 50) / 300 +
      (player.overall - line) / 60,
  );
  const appearDraw = nextFloat(state);
  if (appearDraw.value >= probability) {
    return { ...idle, state: appearDraw.state };
  }
  const starts = player.contract.role !== "prospect" && probability >= 0.5;
  const minutesDraw = nextFloat(appearDraw.state);
  const minutes = starts
    ? Math.round(75 + minutesDraw.value * 45)
    : Math.round(10 + minutesDraw.value * 35);
  return { appears: true, starts, minutes: clamp(0, 120, minutes), state: minutesDraw.state };
};

export const simulateMatch = (context: MatchContext): MatchOutcome => {
  const { fixture, world, player } = context;
  const home = world.clubs.find((club) => club.id === fixture.homeClubId);
  const away = world.clubs.find((club) => club.id === fixture.awayClubId);

  let state = context.rng;

  const homeAttack = home
    ? attackValue(home.lines.forward, home.lines.midfielder, away?.lines.defender ?? 60, home.homeAdvantage)
    : 50;
  const awayAttack = away
    ? attackValue(away.lines.forward, away.lines.midfielder, home?.lines.defender ?? 60, 0)
    : 50;

  const homeXg = expectedGoals(homeAttack, away ? away.lines.defender : 60);
  const awayXg = expectedGoals(awayAttack, home ? home.lines.defender : 60);

  const homeSample = sampleGoals(state, homeXg);
  state = homeSample.state;
  const awaySample = sampleGoals(state, awayXg);
  state = awaySample.state;

  let playerPerformance: PlayerMatchPerformance | null = null;

  if (home && away) {
    const selection = selectPlayer(context, state);
    state = selection.state;
    if (selection.appears) {
      const playerClub = player.clubId === fixture.homeClubId ? home : away;
      const opponent = player.clubId === fixture.homeClubId ? away : home;
      const won =
        player.clubId === fixture.homeClubId
          ? homeSample.goals > awaySample.goals
          : awaySample.goals > homeSample.goals;
      const drew = homeSample.goals === awaySample.goals;
      const ratingDraw = nextFloat(state);
      state = ratingDraw.state;
      const base =
        6 +
        (player.overall - playerClub.lines[player.position]) / 15 +
        (player.form - 50) / 50 +
        (won ? 0.8 : drew ? 0.2 : -0.5) +
        (ratingDraw.value - 0.5) * 1.6;
      const rating = Math.round(clamp(1, 10, base) * 10) / 10;

      const goalsDraw = nextFloat(state);
      state = goalsDraw.state;
      const assistsDraw = nextFloat(state);
      state = assistsDraw.state;
      const cardDraw = nextFloat(state);
      state = cardDraw.state;

      const goalChance: Record<Player["position"], number> = {
        goalkeeper: 0.01,
        defender: 0.05,
        midfielder: 0.12,
        forward: 0.28,
      };
      const assistChance: Record<Player["position"], number> = {
        goalkeeper: 0.01,
        defender: 0.06,
        midfielder: 0.18,
        forward: 0.14,
      };
      const goals =
        goalsDraw.value < goalChance[player.position] * (selection.minutes / 90) ? 1 : 0;
      const assists =
        assistsDraw.value < assistChance[player.position] * (selection.minutes / 90) ? 1 : 0;
      const conceded =
        player.clubId === fixture.homeClubId ? awaySample.goals : homeSample.goals;
      const cleanSheet =
        (player.position === "goalkeeper" || player.position === "defender") && conceded === 0 ? 1 : 0;
      const saves =
        player.position === "goalkeeper"
          ? Math.round(clamp(0, 9, opponent.lines.forward / 15 + (ratingDraw.value - 0.5) * 3))
          : 0;
      const goalsPrevented =
        player.position === "goalkeeper"
          ? Math.round(clamp(0, 4, (rating - 6) * 0.8) * 10) / 10
          : 0;

      playerPerformance = {
        ...emptySeasonStats(),
        appearances: 1,
        starts: selection.starts ? 1 : 0,
        minutes: selection.minutes,
        goals,
        assists,
        cleanSheets: cleanSheet,
        saves,
        yellowCards: cardDraw.value < 0.12 ? 1 : 0,
        redCards: cardDraw.value > 0.985 ? 1 : 0,
        defensiveActions:
          player.position === "defender" || player.position === "midfielder"
            ? Math.round(2 + ratingDraw.value * 6)
            : Math.round(ratingDraw.value * 2),
        chancesCreated:
          player.position === "midfielder" || player.position === "forward"
            ? Math.round(ratingDraw.value * 4)
            : 0,
        goalsPrevented,
        ratingTotal: rating,
        ratedMatches: 1,
        rating,
      };
    }
  }

  return {
    result: {
      fixtureId: fixture.id,
      homeClubId: fixture.homeClubId,
      awayClubId: fixture.awayClubId,
      homeGoals: homeSample.goals,
      awayGoals: awaySample.goals,
      playerPerformance,
      timeline: [],
    },
    rng: state,
  };
};
