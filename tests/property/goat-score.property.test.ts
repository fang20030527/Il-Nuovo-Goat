import { describe, expect, it } from "vitest";
import fc from "fast-check";
import { calculateGoatScore } from "@/game/scoring/goat-score";
import { emptySeasonStats, type Player, type SeasonStats } from "@/game/domain/player";
import type { CareerArchive, CareerState } from "@/game/domain/career";
import { clubId } from "@/game/domain/ids";
import { seedRng } from "@/game/engine/rng";
import { createDefaultWorld } from "@/game/world/default-world";

const statsArb: fc.Arbitrary<SeasonStats> = fc.record({
  appearances: fc.integer({ min: 0, max: 40 }),
  starts: fc.integer({ min: 0, max: 40 }),
  minutes: fc.integer({ min: 0, max: 3600 }),
  goals: fc.integer({ min: 0, max: 40 }),
  assists: fc.integer({ min: 0, max: 25 }),
  cleanSheets: fc.integer({ min: 0, max: 25 }),
  saves: fc.integer({ min: 0, max: 160 }),
  yellowCards: fc.integer({ min: 0, max: 10 }),
  redCards: fc.integer({ min: 0, max: 2 }),
  defensiveActions: fc.integer({ min: 0, max: 120 }),
  chancesCreated: fc.integer({ min: 0, max: 90 }),
  goalsPrevented: fc.integer({ min: 0, max: 15 }),
  ratingTotal: fc.double({ min: 0, max: 400, noNaN: true }),
  ratedMatches: fc.integer({ min: 0, max: 40 }),
});

const archiveArb: fc.Arbitrary<CareerArchive> = fc.record({
  season: fc.integer({ min: 1, max: 21 }),
  age: fc.integer({ min: 16, max: 36 }),
  clubId: fc.constant(clubId("north-a-1")),
  stats: statsArb,
  overall: fc.integer({ min: 45, max: 99 }),
  marketValue: fc.integer({ min: 0, max: 200_000_000 }),
  competitionStats: fc.constant([]),
  honours: fc.array(
    fc.record({
      id: fc.string({ minLength: 1, maxLength: 12 }),
      label: fc.constant("League Title"),
      kind: fc.constantFrom("league", "domestic-cup", "continental", "national-team" as const),
      contributionMinutes: fc.integer({ min: 0, max: 3420 }),
      availableMinutes: fc.constant(3420),
    }),
    { maxLength: 4 },
  ),
  awards: fc.array(
    fc.record({
      id: fc.string({ minLength: 1, maxLength: 12 }),
      label: fc.constant("Award"),
      scope: fc.constantFrom("club", "league", "continental", "national-team", "world" as const),
    }),
    { maxLength: 3 },
  ),
});

const playerArb = (position: Player["position"], caps: number, tags: string[]): Player => ({
  id: "player-1",
  name: "Property Player",
  nationality: "italy" as Player["nationality"],
  position,
  preferredFoot: "right",
  shirtNumber: 9,
  age: 36,
  attributes: { technique: 70, awareness: 70, physical: 70, mentality: 70 },
  overall: 80,
  potential: 90,
  fitness: 70,
  form: 60,
  morale: 60,
  coachTrust: 60,
  reputation: 60,
  marketValue: 10_000_000,
  clubId: clubId("north-a-1"),
  contract: {
    clubId: clubId("north-a-1"),
    startSeason: 19,
    endSeason: 21,
    weeklyWage: 20_000,
    appearanceBonus: 1_000,
    titleBonus: 5_000,
    role: "star",
    parentClubId: null,
  },
  injury: null,
  currentSeasonStats: emptySeasonStats(),
  careerStats: emptySeasonStats(),
  nationalTeam: { selected: caps > 0, caps, goals: Math.floor(caps / 4) },
  tags,
});

const careerArb: fc.Arbitrary<CareerState> = fc
  .record({
    archives: fc.array(archiveArb, { maxLength: 21 }),
    position: fc.constantFrom("goalkeeper", "defender", "midfielder", "forward" as const),
    caps: fc.integer({ min: 0, max: 120 }),
    tags: fc.uniqueArray(
      fc.constantFrom("leader", "loyal", "legend", "mentor", "popular", "professional"),
      { maxLength: 5 },
    ),
  })
  .map(({ archives, position, caps, tags }): CareerState => ({
    saveSchemaVersion: 1,
    rulesVersion: "1.0.0",
    rng: seedRng("score-property"),
    phase: "retired",
    mode: "classic",
    difficulty: "balanced",
    trainingFocus: "technique",
    careerIntent: "steady-growth",
    world: createDefaultWorld(),
    player: playerArb(position, caps, tags),
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
    archives,
    activeMoment: null,
    activeEventId: null,
    eventHistory: [],
    careerHistory: [],
    commandHistory: [],
    transferOffers: [],
  }));

describe("calculateGoatScore properties", () => {
  it("component bounds, integer total, sum equality, replay equality, no NaN, no input mutation", () => {
    fc.assert(
      fc.property(careerArb, (career) => {
        const snapshot = structuredClone(career);
        const first = calculateGoatScore(career);
        const second = calculateGoatScore(career);
        expect(first).toEqual(second);
        expect(career).toEqual(snapshot);
        if (!first.ok) throw new Error("scoring a retired career must succeed");
        const { components, total, explanations } = first.value;
        const caps: [number, number][] = [
          [components.performance, 350],
          [components.teamHonours, 150],
          [components.individualAwards, 150],
          [components.nationalTeam, 100],
          [components.peakOverall, 100],
          [components.longevity, 100],
          [components.influence, 50],
        ];
        for (const [value, cap] of caps) {
          expect(value).toBeGreaterThanOrEqual(0);
          expect(value).toBeLessThanOrEqual(cap);
          expect(Number.isNaN(value)).toBe(false);
          expect(Number.isInteger(value)).toBe(true);
        }
        expect(Object.values(components).reduce((sum, value) => sum + value, 0)).toBe(total);
        expect(total).toBeGreaterThanOrEqual(0);
        expect(total).toBeLessThanOrEqual(1000);
        expect(explanations.length).toBeGreaterThanOrEqual(3);
        expect(explanations.length).toBeLessThanOrEqual(7);
      }),
      { numRuns: 200 },
    );
  });
});
