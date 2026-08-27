import type { Player, PlayerAttributes, SeasonStats } from "@/game/domain/player";
import type { RngState, TrainingFocus } from "@/game/domain/career";
import { nextFloat } from "@/game/engine/rng";
import { calculateOverall } from "@/game/engine/ratings";

export interface ProgressionInput {
  readonly player: Player;
  readonly seasonStats: SeasonStats;
  readonly facilities: number;
  readonly trainingFocus: TrainingFocus;
  readonly rng: RngState;
}

export interface ProgressionResult {
  readonly player: Player;
  readonly rng: RngState;
}

const clampAttribute = (value: number): number => Math.max(1, Math.min(99, Math.round(value)));

export const ageGrowthMultiplier = (age: number): number => {
  if (age <= 21) return 1;
  if (age <= 28) return 0.45;
  if (age <= 32) return 0.05;
  return -0.55;
};

export const minutesMultiplier = (minutes: number): number => {
  if (minutes >= 2400) return 1;
  if (minutes >= 1400) return 0.75;
  if (minutes >= 600) return 0.4;
  return 0.1;
};

export const trainingEffect = (
  focus: TrainingFocus,
  _player: Player,
): Readonly<Record<keyof PlayerAttributes, number>> => ({
  technique: focus === "technique" ? 0.6 : 0,
  awareness: focus === "awareness" ? 0.6 : 0,
  physical: focus === "physical" ? 0.6 : 0,
  mentality: focus === "mentality" ? 0.6 : 0,
});

export const applySeasonProgression = (input: ProgressionInput): ProgressionResult => {
  const { player, seasonStats, facilities, trainingFocus } = input;
  let state = input.rng;

  const varianceDraw = nextFloat(state);
  state = varianceDraw.state;

  const averageRating =
    seasonStats.ratedMatches > 0 ? seasonStats.ratingTotal / seasonStats.ratedMatches : 6;
  const ratingFactor = (averageRating - 6.2) / 4;
  const potentialGap = Math.max(0, player.potential - player.overall);
  const baseDelta =
    ageGrowthMultiplier(player.age) *
    minutesMultiplier(seasonStats.minutes) *
    (0.6 + potentialGap / 40) *
    (0.7 + facilities / 200) *
    (1 + ratingFactor) *
    (0.8 + varianceDraw.value * 0.4) *
    6;

  const focus = trainingEffect(trainingFocus, player);

  const declinePhysical = player.age >= 33 ? (player.age - 32) * 1.5 : 0;
  const mentalityFloor = player.age >= 33 ? player.attributes.mentality - 1 : 1;

  const attributes: PlayerAttributes = {
    technique: clampAttribute(player.attributes.technique + baseDelta + focus.technique),
    awareness: clampAttribute(player.attributes.awareness + baseDelta + focus.awareness),
    physical: clampAttribute(
      player.attributes.physical + baseDelta + focus.physical - declinePhysical,
    ),
    mentality: clampAttribute(
      Math.max(mentalityFloor, player.attributes.mentality + baseDelta + focus.mentality),
    ),
  };

  let overall = calculateOverall(player.position, attributes);
  overall = Math.min(overall, player.potential + 2);
  overall = Math.max(1, Math.min(99, overall));

  return {
    player: { ...player, attributes, overall },
    rng: state,
  };
};
