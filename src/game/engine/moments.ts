import type { ActiveMoment } from "@/game/domain/competition";
import type { Player, PlayerAttributes } from "@/game/domain/player";
import type { RngState } from "@/game/domain/career";
import type { FixtureId } from "@/game/domain/ids";
import { gameError, type GameResult } from "@/game/domain/errors";
import { nextFloat, nextInt } from "@/game/engine/rng";

export const momentOptions = {
  goalkeeper: [
    { id: "rush", label: "Rush out", risk: "high", skill: "awareness" },
    { id: "hold-line", label: "Hold the line", risk: "low", skill: "mentality" },
    { id: "quick-release", label: "Start a quick counter", risk: "medium", skill: "technique" },
    { id: "slow-play", label: "Slow the tempo", risk: "low", skill: "mentality" },
  ],
  defender: [
    { id: "step-out", label: "Step out to challenge", risk: "high", skill: "physical" },
    { id: "block-lane", label: "Block the passing lane", risk: "medium", skill: "awareness" },
    { id: "hold-shape", label: "Hold the defensive shape", risk: "low", skill: "mentality" },
    { id: "attack-set-piece", label: "Attack the set piece", risk: "medium", skill: "physical" },
  ],
  midfielder: [
    { id: "through-ball", label: "Attempt the through ball", risk: "high", skill: "technique" },
    { id: "retain", label: "Retain possession", risk: "low", skill: "awareness" },
    { id: "long-shot", label: "Shoot from distance", risk: "high", skill: "technique" },
    { id: "tactical-foul", label: "Stop the counter", risk: "medium", skill: "mentality" },
  ],
  forward: [
    { id: "first-time", label: "Shoot first time", risk: "high", skill: "technique" },
    { id: "settle", label: "Take a touch", risk: "medium", skill: "mentality" },
    { id: "square-pass", label: "Square the ball", risk: "low", skill: "awareness" },
    { id: "draw-foul", label: "Shield and draw contact", risk: "medium", skill: "physical" },
  ],
} as const;

export interface MomentContext {
  readonly fixtureId: FixtureId;
  readonly minute: number;
  readonly score: readonly [number, number];
  readonly player: Player;
  readonly playerMinutes: number;
  readonly opponentLine: number;
  readonly rng: RngState;
}

export interface MomentResolution {
  readonly success: boolean;
  readonly score: readonly [number, number];
  readonly ratingDelta: number;
  readonly timelineEntry: string;
  readonly rng: RngState;
}

export interface ResolveContext extends Omit<MomentContext, "rng"> {
  readonly moment: ActiveMoment;
  readonly rng: RngState;
}

const riskThreshold: Record<"low" | "medium" | "high", number> = {
  low: 0.35,
  medium: 0.5,
  high: 0.65,
};

const riskReward: Record<"low" | "medium" | "high", number> = {
  low: 0.2,
  medium: 0.5,
  high: 0.9,
};

const riskPenalty: Record<"low" | "medium" | "high", number> = {
  low: -0.1,
  medium: -0.3,
  high: -0.6,
};

export const createMoment = (
  context: MomentContext,
): { moment: ActiveMoment | null; rng: RngState } => {
  if (context.playerMinutes <= 0) {
    return { moment: null, rng: context.rng };
  }
  const catalog = momentOptions[context.player.position];
  const minuteDraw = nextInt(context.rng, 5, 115);
  const state = minuteDraw.state;
  const options = catalog.map(({ id, label, risk }) => ({ id, label, risk }));
  return {
    moment: {
      fixtureId: context.fixtureId,
      minute: minuteDraw.value,
      score: context.score,
      prompt: `${context.player.name} faces a key decision.`,
      options,
    },
    rng: state,
  };
};

export const resolveMoment = (
  context: ResolveContext,
  optionId: string,
): GameResult<MomentResolution> => {
const catalog = momentOptions[context.player.position];
  const definition = (catalog as readonly { id: string; label: string; risk: "low" | "medium" | "high"; skill: string }[]).find(
    (option) => option.id === optionId,
  );
  const offered = context.moment.options.some((option) => option.id === optionId);
  if (!definition || !offered) {
    return gameError("INVALID_OPTION", `Option "${optionId}" is not available in this moment`);
  }

  const skill = context.player.attributes[definition.skill as keyof PlayerAttributes];
  const draw = nextFloat(context.rng);
  const threshold =
    riskThreshold[definition.risk] +
    (context.opponentLine - skill) / 150 -
    (context.player.fitness - 50) / 400 -
    (context.player.form - 50) / 400;
  const success = draw.value >= Math.max(0.05, threshold);

  const [homeGoals, awayGoals] = context.moment.score;
  const isHomeMoment = true; // moments always describe the player's club attack/defence phase
  const score: readonly [number, number] =
    success &&
    (context.player.position === "forward" || context.player.position === "midfielder") &&
    definition.risk === "high"
      ? isHomeMoment
        ? [homeGoals + 1, awayGoals]
        : [homeGoals, awayGoals + 1]
      : context.moment.score;

  return {
    ok: true,
    value: {
      success,
      score,
      ratingDelta: success ? riskReward[definition.risk] : riskPenalty[definition.risk],
      timelineEntry: `${context.moment.minute}' — ${context.player.name}: ${definition.label} (${
        success ? "success" : "failed"
      })`,
      rng: draw.state,
    },
  };
};
