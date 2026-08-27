import type { Injury, Player } from "@/game/domain/player";
import type { RngState } from "@/game/domain/career";
import { nextFloat, nextInt } from "@/game/engine/rng";

export interface InjuryRollInput {
  readonly player: Player;
  readonly rng: RngState;
  readonly recentMinutes: number;
}

export interface InjuryRollResult {
  readonly injury: Injury | null;
  readonly rng: RngState;
}

const severityDurations: Record<Injury["severity"], readonly [number, number]> = {
  knock: [1, 1],
  strain: [2, 4],
  fracture: [5, 10],
  major: [11, 24],
};

export const rollMatchInjury = (input: InjuryRollInput): InjuryRollResult => {
  const { player } = input;
  let state = input.rng;

  const riskDraw = nextFloat(state);
  state = riskDraw.state;

  if (player.injury) {
    return { injury: null, rng: state };
  }

  let risk = 0.018;
  if (player.fitness < 50) risk *= 1.8;
  if (player.age > 31) risk *= 1.5;
  if (player.attributes.physical < 55) risk *= 1.6;
  if (input.recentMinutes > 1000) risk *= 1.4;

  if (riskDraw.value >= risk) {
    return { injury: null, rng: state };
  }

  const severityDraw = nextFloat(state);
  state = severityDraw.state;
  const severity: Injury["severity"] =
    severityDraw.value < 0.45
      ? "knock"
      : severityDraw.value < 0.8
        ? "strain"
        : severityDraw.value < 0.95
          ? "fracture"
          : "major";

  const [min, max] = severityDurations[severity];
  const durationDraw = nextInt(state, min, max);
  state = durationDraw.state;

  let potentialDeltaOnRecovery = 0;
  let physicalDeltaOnRecovery = 0;
  if (severity === "major") {
    const potentialDraw = nextInt(state, -2, 0);
    state = potentialDraw.state;
    potentialDeltaOnRecovery = potentialDraw.value;
    const physicalDraw = nextInt(state, -3, 0);
    state = physicalDraw.state;
    physicalDeltaOnRecovery = physicalDraw.value;
  }

  return {
    injury: {
      id: `injury-${state.cursor}`,
      severity,
      remainingMatches: durationDraw.value,
      potentialDeltaOnRecovery,
      physicalDeltaOnRecovery,
    },
    rng: state,
  };
};

export const advanceInjuryRecovery = (player: Player): Player => {
  if (!player.injury) return player;
  const remainingMatches = player.injury.remainingMatches - 1;
  if (remainingMatches > 0) {
    return { ...player, injury: { ...player.injury, remainingMatches } };
  }
  return {
    ...player,
    injury: null,
    fitness: Math.max(player.fitness, 55),
    potential: Math.max(1, player.potential + player.injury.potentialDeltaOnRecovery),
    attributes: {
      ...player.attributes,
      physical: Math.max(
        1,
        Math.min(99, player.attributes.physical + player.injury.physicalDeltaOnRecovery),
      ),
    },
  };
};
