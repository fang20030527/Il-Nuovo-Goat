import { describe, expect, it } from "vitest";
import fc from "fast-check";
import { clubId, fixtureId, leagueId } from "@/game/domain/ids";
import type { Fixture } from "@/game/domain/competition";
import type { Club, World } from "@/game/domain/world";
import { emptySeasonStats, type Player } from "@/game/domain/player";
import { seedRng } from "@/game/engine/rng";
import { simulateMatch } from "@/game/engine/match";

const clubArb = (name: string, strength: number): Club => ({
  id: clubId(name),
  name,
  countryId: "country-1" as Club["countryId"],
  leagueId: leagueId("league-1"),
  reputation: strength,
  finances: 50,
  academy: 50,
  facilities: 50,
  lines: { goalkeeper: strength, defender: strength, midfielder: strength, forward: strength },
  style: "balanced",
  homeAdvantage: 5,
});

const playerArb = (overall: number, fitness: number, club: string): Player => ({
  id: "player-1",
  name: "Property Player",
  nationality: "country-1" as Player["nationality"],
  position: "forward",
  preferredFoot: "left",
  shirtNumber: 9,
  age: 25,
  attributes: { technique: overall, awareness: overall, physical: overall, mentality: overall },
  overall,
  potential: Math.min(99, overall + 10),
  fitness,
  form: 60,
  morale: 60,
  coachTrust: 60,
  reputation: 50,
  marketValue: 1_000_000,
  clubId: clubId(club),
  contract: {
    clubId: clubId(club),
    startSeason: 1,
    endSeason: 4,
    weeklyWage: 1000,
    appearanceBonus: 100,
    titleBonus: 500,
    role: "starter",
    parentClubId: null,
  },
  injury: null,
  currentSeasonStats: emptySeasonStats(),
  careerStats: emptySeasonStats(),
  nationalTeam: { selected: false, caps: 0, goals: 0 },
  tags: [],
});

describe("match engine properties", () => {
  it("keeps scores, ratings, and minutes within bounds and replays exactly", () => {
    fc.assert(
      fc.property(
        fc.integer({ min: 40, max: 95 }),
        fc.integer({ min: 40, max: 95 }),
        fc.integer({ min: 40, max: 99 }),
        fc.integer({ min: 0, max: 100 }),
        fc.integer({ min: 0, max: 1_000_000 }),
        (homeStrength, awayStrength, overall, fitness, seedNumber) => {
          const world: World = {
            schemaVersion: 1,
            countries: [],
            leagues: [],
            clubs: [clubArb("home-club", homeStrength), clubArb("away-club", awayStrength)],
          };
          const fixture: Fixture = {
            id: fixtureId("fixture-p"),
            competitionId: "league-1",
            kind: "league",
            season: 1,
            round: 1,
            homeClubId: clubId("home-club"),
            awayClubId: clubId("away-club"),
            status: "scheduled",
          };
          const context = {
            fixture,
            world,
            player: playerArb(overall, fitness, "home-club"),
            rng: seedRng(`seed-${seedNumber}`),
          };
          const first = simulateMatch(context);
          const second = simulateMatch(context);
          expect(second).toEqual(first);

          const { result } = first;
          for (const goals of [result.homeGoals, result.awayGoals]) {
            expect(Number.isInteger(goals)).toBe(true);
            expect(goals).toBeGreaterThanOrEqual(0);
            expect(goals).toBeLessThanOrEqual(6);
          }
          const performance = result.playerPerformance;
          if (performance) {
            expect(performance.rating).toBeGreaterThanOrEqual(1);
            expect(performance.rating).toBeLessThanOrEqual(10);
            expect(performance.minutes).toBeGreaterThanOrEqual(0);
            expect(performance.minutes).toBeLessThanOrEqual(120);
            if (performance.minutes === 0) {
              expect(performance.goals).toBe(0);
            }
          }
        },
      ),
      { numRuns: 1000 },
    );
  });
});
