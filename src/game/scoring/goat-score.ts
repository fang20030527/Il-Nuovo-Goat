/**
 * GOAT Score: an explainable 0-1000 rating of a retired career, built from
 * seven capped components that sum to the total. All inputs come from the
 * archived career record, so the same career always produces the same score.
 */
import type { CareerState, Honour, IndividualAward } from "@/game/domain/career";
import type { PositionFamily, SeasonStats } from "@/game/domain/player";
import { gameError, type GameResult } from "@/game/domain/errors";

export interface GoatScoreBreakdown {
  readonly total: number;
  readonly components: {
    readonly performance: number; // 0..350
    readonly teamHonours: number; // 0..150
    readonly individualAwards: number; // 0..150
    readonly nationalTeam: number; // 0..100
    readonly peakOverall: number; // 0..100
    readonly longevity: number; // 0..100
    readonly influence: number; // 0..50
  };
  readonly explanations: readonly string[];
}

const PERFORMANCE_CAP = 350;
const TEAM_HONOURS_CAP = 150;
const INDIVIDUAL_AWARDS_CAP = 150;
const NATIONAL_TEAM_CAP = 100;
const PEAK_OVERALL_CAP = 100;
const LONGEVITY_CAP = 100;
const INFLUENCE_CAP = 50;

/** Peak overall 55 maps to 0 and 95 maps to 100, linearly in between. */
const PEAK_FLOOR = 55;
const PEAK_CEILING = 95;

/** Reference window: 14 qualifying seasons earn the full longevity score. */
const LONGEVITY_REFERENCE_SEASONS = 14;
const LONGEVITY_MIN_MINUTES = 900;
const LONGEVITY_MIN_RATING = 6.5;

/** A full league season of minutes; used to normalize per-90 output. */
const FULL_SEASON_MINUTES = 3420;
/** Per-season performance is capped so one outlier year cannot fill the category. */
const SEASON_PERFORMANCE_CAP = 35;
/** Rating 6.0 is neutral; each rating point above it is worth this much per full season. */
const RATING_POINTS_PER_FULL_SEASON = 12;

const clamp = (min: number, max: number, value: number) => Math.max(min, Math.min(max, value));

const averageRating = (stats: SeasonStats): number =>
  stats.ratedMatches > 0 ? stats.ratingTotal / stats.ratedMatches : 0;

/**
 * Position-fair per-season output measured per full season of minutes.
 * Each position family is scored on its own contribution profile plus rating,
 * so a goalkeeper never needs goals to reach an elite score.
 */
const seasonOutput = (position: PositionFamily, stats: SeasonStats): number => {
  if (stats.minutes <= 0) return 0;
  const seasons = stats.minutes / FULL_SEASON_MINUTES;
  const perFullSeason = (value: number) => (seasons > 0 ? value / seasons : 0);
  const ratingBoost = Math.max(0, averageRating(stats) - 6) * RATING_POINTS_PER_FULL_SEASON;
  switch (position) {
    case "goalkeeper":
      return (
        perFullSeason(stats.cleanSheets) * 1.1 +
        perFullSeason(stats.saves) * 0.08 +
        perFullSeason(stats.goalsPrevented) * 1.6 +
        ratingBoost
      );
    case "defender":
      return (
        perFullSeason(stats.cleanSheets) * 0.8 +
        perFullSeason(stats.defensiveActions) * 0.1 +
        perFullSeason(stats.goals + stats.assists) * 1.2 +
        ratingBoost
      );
    case "midfielder":
      return (
        perFullSeason(stats.assists) * 1.4 +
        perFullSeason(stats.chancesCreated) * 0.2 +
        perFullSeason(stats.goals) * 1.1 +
        ratingBoost
      );
    case "forward":
      return (
        perFullSeason(stats.goals) * 1.4 +
        perFullSeason(stats.assists) * 1.0 +
        perFullSeason(stats.chancesCreated) * 0.08 +
        ratingBoost
      );
  }
};

const performanceScore = (career: CareerState): number => {
  const perSeason = career.archives.map((archive) =>
    clamp(0, SEASON_PERFORMANCE_CAP, seasonOutput(career.player.position, archive.stats)),
  );
  return Math.round(clamp(0, PERFORMANCE_CAP, perSeason.reduce((sum, value) => sum + value, 0)));
};

const HONOUR_BASE: Record<Honour["kind"], number> = {
  league: 28,
  "domestic-cup": 16,
  continental: 40,
  "national-team": 0, // national-team honours score under the nationalTeam component
};

const teamHonoursScore = (career: CareerState): number => {
  let total = 0;
  for (const archive of career.archives) {
    for (const honour of archive.honours) {
      const share =
        honour.availableMinutes > 0
          ? clamp(0, 1, honour.contributionMinutes / honour.availableMinutes)
          : 0;
      const ratingFactor = clamp(0.5, 1.25, (averageRating(archive.stats) - 5.5) / 2);
      total += HONOUR_BASE[honour.kind] * share * ratingFactor;
    }
  }
  return Math.round(clamp(0, TEAM_HONOURS_CAP, total));
};

const AWARD_VALUE: Record<IndividualAward["scope"], number> = {
  club: 4,
  league: 18,
  continental: 30,
  "national-team": 12,
  world: 50,
};

const individualAwardsScore = (career: CareerState): number => {
  const total = career.archives
    .flatMap((archive) => archive.awards)
    .reduce((sum, award) => sum + AWARD_VALUE[award.scope], 0);
  return Math.round(clamp(0, INDIVIDUAL_AWARDS_CAP, total));
};

const nationalTeamScore = (career: CareerState): number => {
  const { caps, goals } = career.player.nationalTeam;
  const honours = career.archives
    .flatMap((archive) => archive.honours)
    .filter((honour) => honour.kind === "national-team");
  const honourShare = honours.reduce((sum, honour) => {
    const share =
      honour.availableMinutes > 0
        ? clamp(0, 1, honour.contributionMinutes / honour.availableMinutes)
        : 0;
    return sum + share;
  }, 0);
  const raw = caps * 0.45 + goals * 0.5 + honourShare * 40;
  return Math.round(clamp(0, NATIONAL_TEAM_CAP, raw));
};

const peakOverallScore = (career: CareerState): number => {
  const peak = career.archives.reduce(
    (max, archive) => Math.max(max, archive.overall),
    career.player.overall,
  );
  const scaled =
    ((clamp(PEAK_FLOOR, PEAK_CEILING, peak) - PEAK_FLOOR) / (PEAK_CEILING - PEAK_FLOOR)) *
    PEAK_OVERALL_CAP;
  return Math.round(scaled);
};

const longevitySeasons = (career: CareerState): number =>
  career.archives.filter(
    (archive) =>
      archive.stats.minutes >= LONGEVITY_MIN_MINUTES &&
      averageRating(archive.stats) >= LONGEVITY_MIN_RATING,
  ).length;

const longevityScore = (career: CareerState): number =>
  Math.round(
    clamp(
      0,
      LONGEVITY_CAP,
      (longevitySeasons(career) / LONGEVITY_REFERENCE_SEASONS) * LONGEVITY_CAP,
    ),
  );

/** Tags that mark a career of influence: leadership, loyalty, and legacy. */
const INFLUENCE_TAGS: Record<string, number> = {
  leader: 14,
  loyal: 12,
  legend: 16,
  mentor: 8,
  "club-legend": 16,
  "club-first": 8,
  professional: 6,
  "team-player": 6,
  popular: 6,
  "set-piece-taker": 4,
};

const influenceScore = (career: CareerState): number => {
  const total = career.player.tags.reduce((sum, tag) => sum + (INFLUENCE_TAGS[tag] ?? 0), 0);
  return Math.round(clamp(0, INFLUENCE_CAP, total));
};

const careerTotals = (career: CareerState): SeasonStats =>
  career.archives.reduce(
    (total, archive) => ({
      appearances: total.appearances + archive.stats.appearances,
      starts: total.starts + archive.stats.starts,
      minutes: total.minutes + archive.stats.minutes,
      goals: total.goals + archive.stats.goals,
      assists: total.assists + archive.stats.assists,
      cleanSheets: total.cleanSheets + archive.stats.cleanSheets,
      saves: total.saves + archive.stats.saves,
      yellowCards: total.yellowCards + archive.stats.yellowCards,
      redCards: total.redCards + archive.stats.redCards,
      defensiveActions: total.defensiveActions + archive.stats.defensiveActions,
      chancesCreated: total.chancesCreated + archive.stats.chancesCreated,
      goalsPrevented: total.goalsPrevented + archive.stats.goalsPrevented,
      ratingTotal: total.ratingTotal + archive.stats.ratingTotal,
      ratedMatches: total.ratedMatches + archive.stats.ratedMatches,
    }),
    {
      appearances: 0, starts: 0, minutes: 0, goals: 0, assists: 0,
      cleanSheets: 0, saves: 0, yellowCards: 0, redCards: 0,
      defensiveActions: 0, chancesCreated: 0, goalsPrevented: 0,
      ratingTotal: 0, ratedMatches: 0,
    },
  );

/**
 * Builds 3-7 explanations from the largest measured contributors. Every
 * statement references concrete career numbers; nothing is generic praise.
 */
const buildExplanations = (
  career: CareerState,
  components: GoatScoreBreakdown["components"],
): readonly string[] => {
  const totals = careerTotals(career);
  const honourCount = career.archives.reduce(
    (sum, archive) => sum + archive.honours.filter((h) => h.kind !== "national-team").length,
    0,
  );
  const awardCount = career.archives.reduce((sum, archive) => sum + archive.awards.length, 0);
  const peak = Math.max(career.player.overall, ...career.archives.map((a) => a.overall));
  const longevity = longevitySeasons(career);
  const candidates: { points: number; text: string }[] = [
    {
      points: components.performance,
      text: `${totals.minutes} minutes with ${totals.goals + totals.assists} goal involvements contributed ${components.performance} performance points`,
    },
    {
      points: components.teamHonours,
      text: `${honourCount} club honours weighted by playing time contributed ${components.teamHonours} team honour points`,
    },
    {
      points: components.individualAwards,
      text: `${awardCount} individual awards contributed ${components.individualAwards} award points`,
    },
    {
      points: components.nationalTeam,
      text: `${career.player.nationalTeam.caps} national team caps contributed ${components.nationalTeam} national team points`,
    },
    {
      points: components.peakOverall,
      text: `A peak overall of ${peak} contributed ${components.peakOverall} peak points`,
    },
    {
      points: components.longevity,
      text: `${longevity} high-level seasons contributed ${components.longevity} longevity points`,
    },
    {
      points: components.influence,
      text: `Influence tags (${career.player.tags.filter((tag) => INFLUENCE_TAGS[tag]).join(", ") || "none"}) contributed ${components.influence} influence points`,
    },
  ];
  candidates.sort((a, b) => b.points - a.points);
  return candidates.slice(0, 5).map((candidate) => candidate.text);
};

export const calculateGoatScore = (career: CareerState): GameResult<GoatScoreBreakdown> => {
  if (career.phase !== "retired") {
    return gameError("INVALID_STATE", "GOAT Score is only available for retired careers");
  }
  const components = {
    performance: performanceScore(career),
    teamHonours: teamHonoursScore(career),
    individualAwards: individualAwardsScore(career),
    nationalTeam: nationalTeamScore(career),
    peakOverall: peakOverallScore(career),
    longevity: longevityScore(career),
    influence: influenceScore(career),
  };
  const total = Object.values(components).reduce((sum, value) => sum + value, 0);
  return {
    ok: true,
    value: {
      total,
      components,
      explanations: buildExplanations(career, components),
    },
  };
};
