import { describe, expect, it } from "vitest";
import { calculateGoatScore } from "@/game/scoring/goat-score";
import { emptySeasonStats, type Player, type SeasonStats } from "@/game/domain/player";
import type { CareerArchive, CareerState, Honour, IndividualAward } from "@/game/domain/career";
import { clubId } from "@/game/domain/ids";
import { seedRng } from "@/game/engine/rng";
import { createDefaultWorld } from "@/game/world/default-world";

const stats = (overrides: Partial<SeasonStats> = {}): SeasonStats => ({
  ...emptySeasonStats(),
  ...overrides,
});

const makePlayer = (overrides: Partial<Player> = {}): Player => ({
  id: "player-1",
  name: "Score Player",
  nationality: "italy" as Player["nationality"],
  position: "forward",
  preferredFoot: "right",
  shirtNumber: 9,
  age: 36,
  attributes: { technique: 80, awareness: 78, physical: 74, mentality: 76 },
  overall: 78,
  potential: 88,
  fitness: 70,
  form: 60,
  morale: 60,
  coachTrust: 70,
  reputation: 70,
  marketValue: 20_000_000,
  clubId: clubId("italy-torino"),
  contract: {
    clubId: clubId("italy-torino"),
    startSeason: 19,
    endSeason: 21,
    weeklyWage: 40_000,
    appearanceBonus: 2_000,
    titleBonus: 10_000,
    role: "star",
    parentClubId: null,
  },
  injury: null,
  currentSeasonStats: emptySeasonStats(),
  careerStats: emptySeasonStats(),
  nationalTeam: { selected: true, caps: 60, goals: 22 },
  tags: [],
  ...overrides,
});

const makeArchive = (overrides: Partial<CareerArchive> = {}): CareerArchive => ({
  season: 1,
  age: 17,
  clubId: clubId("italy-torino"),
  stats: stats(),
  overall: 60,
  marketValue: 1_000_000,
  competitionStats: [],
  honours: [],
  awards: [],
  ...overrides,
});

const makeCareer = (overrides: Partial<CareerState> = {}): CareerState => ({
  saveSchemaVersion: 1,
  rulesVersion: "1.0.0",
  rng: seedRng("score"),
  phase: "retired",
  mode: "classic",
  difficulty: "balanced",
  trainingFocus: "technique",
  careerIntent: "steady-growth",
  world: createDefaultWorld(),
  player: makePlayer(),
  season: {
    season: 20,
    status: "complete",
    completedClubFixtures: 18,
    fixtures: [],
    results: [],
    leagueTables: [],
    domesticCupWinners: [],
    continentalCupWinner: null,
    nationalTeamResult: { selected: false, appearances: 0, goals: 0, tournamentFinish: "not-held" },
    pendingFixtureId: null,
    detailed: null,
  },
  archives: [],
  activeMoment: null,
  activeEventId: null,
  eventHistory: [],
  careerHistory: [],
  commandHistory: [],
  transferOffers: [],
  ...overrides,
});

const honour = (kind: Honour["kind"], share: number): Honour => ({
  id: `${kind}-1`,
  label: kind,
  kind,
  contributionMinutes: Math.round(3420 * share),
  availableMinutes: 3420,
});

const award = (scope: IndividualAward["scope"]): IndividualAward => ({
  id: `award-${scope}`,
  label: `Award ${scope}`,
  scope,
});

describe("calculateGoatScore", () => {
  it("rejects careers that are not retired", () => {
    const result = calculateGoatScore(makeCareer({ phase: "preseason" }));
    expect(result.ok).toBe(false);
    if (!result.ok) {
      expect(result.error.code).toBe("INVALID_STATE");
    }
  });

  it("returns seven components that sum to the total", () => {
    const career = makeCareer({
      archives: [
        makeArchive({
          stats: stats({ appearances: 34, minutes: 3000, goals: 24, ratingTotal: 258, ratedMatches: 34 }),
          overall: 84,
          honours: [honour("league", 0.9)],
          awards: [award("league")],
        }),
      ],
    });
    const result = calculateGoatScore(career);
    expect(result.ok).toBe(true);
    if (result.ok) {
      const { components, total } = result.value;
      const sum = Object.values(components).reduce((acc, value) => acc + value, 0);
      expect(sum).toBe(total);
      expect(Number.isInteger(total)).toBe(true);
      expect(total).toBeGreaterThanOrEqual(0);
      expect(total).toBeLessThanOrEqual(1000);
      expect(components.performance).toBeLessThanOrEqual(350);
      expect(components.teamHonours).toBeLessThanOrEqual(150);
      expect(components.individualAwards).toBeLessThanOrEqual(150);
      expect(components.nationalTeam).toBeLessThanOrEqual(100);
      expect(components.peakOverall).toBeLessThanOrEqual(100);
      expect(components.longevity).toBeLessThanOrEqual(100);
      expect(components.influence).toBeLessThanOrEqual(50);
      for (const value of Object.values(components)) {
        expect(Number.isNaN(value)).toBe(false);
        expect(value).toBeGreaterThanOrEqual(0);
      }
    }
  });

  it("is deterministic and does not mutate the input career", () => {
    const career = makeCareer({
      archives: [
        makeArchive({
          stats: stats({ appearances: 30, minutes: 2600, assists: 11, ratingTotal: 219, ratedMatches: 30 }),
          overall: 81,
          honours: [honour("continental", 0.8)],
          awards: [award("continental"), award("world")],
        }),
      ],
    });
    const snapshot = structuredClone(career);
    const first = calculateGoatScore(career);
    const second = calculateGoatScore(career);
    expect(first).toEqual(second);
    expect(career).toEqual(snapshot);
  });

  it("maps peak overall 55-95 linearly onto 0-100", () => {
    // Use a declined end-of-career overall so the archive peak drives the score.
    const declined = makePlayer({ overall: 50 });
    const low = calculateGoatScore(
      makeCareer({ player: declined, archives: [makeArchive({ overall: 55 })] }),
    );
    const mid = calculateGoatScore(
      makeCareer({ player: declined, archives: [makeArchive({ overall: 75 })] }),
    );
    const high = calculateGoatScore(
      makeCareer({ player: declined, archives: [makeArchive({ overall: 95 })] }),
    );
    expect(low.ok && mid.ok && high.ok).toBe(true);
    if (low.ok && mid.ok && high.ok) {
      expect(low.value.components.peakOverall).toBe(0);
      expect(mid.value.components.peakOverall).toBe(50);
      expect(high.value.components.peakOverall).toBe(100);
    }
  });

  it("counts only seasons with at least 900 minutes and rating 6.5 toward longevity", () => {
    const qualifying = makeArchive({
      stats: stats({ appearances: 12, minutes: 950, ratingTotal: 12 * 7, ratedMatches: 12 }),
    });
    const tooFewMinutes = makeArchive({
      season: 2,
      stats: stats({ appearances: 30, minutes: 800, ratingTotal: 240, ratedMatches: 30 }),
    });
    const tooLowRating = makeArchive({
      season: 3,
      stats: stats({ appearances: 30, minutes: 2700, ratingTotal: 30 * 6, ratedMatches: 30 }),
    });
    const result = calculateGoatScore(
      makeCareer({ archives: [qualifying, tooFewMinutes, tooLowRating] }),
    );
    expect(result.ok).toBe(true);
    if (result.ok) {
      // One qualifying season out of a 14-season reference window.
      expect(result.value.components.longevity).toBe(Math.round(100 / 14));
    }
  });

  it("does not require goals for an elite goalkeeper score", () => {
    const goalkeeper = makeCareer({
      player: makePlayer({ position: "goalkeeper" }),
      archives: Array.from({ length: 10 }, (_, index) =>
        makeArchive({
          season: index + 1,
          stats: stats({
            appearances: 34,
            minutes: 3060,
            cleanSheets: 18,
            saves: 110,
            goalsPrevented: 9,
            ratingTotal: 34 * 7.6,
            ratedMatches: 34,
          }),
          overall: 90,
          honours: [honour("league", 0.95)],
        }),
      ),
    });
    const idleForward = makeCareer({
      player: makePlayer({ position: "forward" }),
      archives: Array.from({ length: 10 }, (_, index) =>
        makeArchive({
          season: index + 1,
          stats: stats({ appearances: 6, minutes: 300, goals: 1, ratingTotal: 36, ratedMatches: 6 }),
          overall: 62,
        }),
      ),
    });
    const gk = calculateGoatScore(goalkeeper);
    const fwd = calculateGoatScore(idleForward);
    expect(gk.ok && fwd.ok && gk.value.total > fwd.value.total).toBe(true);
  });

  it("scales team honours by the player's share of available minutes", () => {
    const fullShare = calculateGoatScore(
      makeCareer({ archives: [makeArchive({ honours: [honour("league", 1)] })] }),
    );
    const halfShare = calculateGoatScore(
      makeCareer({ archives: [makeArchive({ honours: [honour("league", 0.5)] })] }),
    );
    expect(fullShare.ok && halfShare.ok).toBe(true);
    if (fullShare.ok && halfShare.ok) {
      expect(fullShare.value.components.teamHonours).toBeGreaterThan(
        halfShare.value.components.teamHonours,
      );
    }
  });

  it("produces three to seven explanations traced to career facts", () => {
    const career = makeCareer({
      archives: [
        makeArchive({
          stats: stats({ appearances: 34, minutes: 3000, goals: 24, ratingTotal: 258, ratedMatches: 34 }),
          overall: 84,
          honours: [honour("league", 0.9)],
          awards: [award("league")],
        }),
      ],
    });
    const result = calculateGoatScore(career);
    expect(result.ok).toBe(true);
    if (result.ok) {
      expect(result.value.explanations.length).toBeGreaterThanOrEqual(3);
      expect(result.value.explanations.length).toBeLessThanOrEqual(7);
      for (const explanation of result.value.explanations) {
        expect(explanation.length).toBeGreaterThan(0);
      }
    }
  });

  it("awards influence points for leadership, loyalty, and legend tags", () => {
    const tagged = calculateGoatScore(
      makeCareer({ player: makePlayer({ tags: ["leader", "loyal", "legend"] }) }),
    );
    const untagged = calculateGoatScore(makeCareer());
    expect(tagged.ok && untagged.ok).toBe(true);
    if (tagged.ok && untagged.ok) {
      expect(tagged.value.components.influence).toBeGreaterThan(untagged.value.components.influence);
    }
  });

  it("uses national team caps, tournament contribution, and honours", () => {
    const career = makeCareer({
      player: makePlayer({ nationalTeam: { selected: true, caps: 90, goals: 30 } }),
      archives: [makeArchive({ honours: [honour("national-team", 0.9)] })],
    });
    const withoutNational = calculateGoatScore(
      makeCareer({ player: makePlayer({ nationalTeam: { selected: false, caps: 0, goals: 0 } }) }),
    );
    const withNational = calculateGoatScore(career);
    expect(withNational.ok && withoutNational.ok).toBe(true);
    if (withNational.ok && withoutNational.ok) {
      expect(withNational.value.components.nationalTeam).toBeGreaterThan(0);
      expect(withoutNational.value.components.nationalTeam).toBe(0);
    }
  });
});
