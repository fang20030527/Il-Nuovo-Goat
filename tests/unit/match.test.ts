import { describe, expect, it } from "vitest";
import { clubId, fixtureId, leagueId } from "@/game/domain/ids";
import type { Fixture } from "@/game/domain/competition";
import type { Club, World } from "@/game/domain/world";
import { emptySeasonStats, type Player } from "@/game/domain/player";
import { seedRng } from "@/game/engine/rng";
import { simulateMatch, type MatchContext } from "@/game/engine/match";

const makeClub = (id: string, strength: number): Club => ({
  id: clubId(id),
  name: id,
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

const makeWorld = (clubs: readonly Club[]): World => ({
  schemaVersion: 1,
  countries: [],
  leagues: [],
  clubs,
});

const makePlayer = (club: string, overall = 72): Player => ({
  id: "player-1",
  name: "Test Player",
  nationality: "country-1" as Player["nationality"],
  position: "midfielder",
  preferredFoot: "right",
  shirtNumber: 8,
  age: 20,
  attributes: { technique: overall, awareness: overall, physical: overall, mentality: overall },
  overall,
  potential: 85,
  fitness: 90,
  form: 65,
  morale: 70,
  coachTrust: 70,
  reputation: 40,
  marketValue: 1_000_000,
  clubId: clubId(club),
  contract: {
    clubId: clubId(club),
    startSeason: 1,
    endSeason: 3,
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

const makeFixture = (home: string, away: string): Fixture => ({
  id: fixtureId("fixture-1"),
  competitionId: "league-1",
  kind: "league",
  season: 1,
  round: 1,
  homeClubId: clubId(home),
  awayClubId: clubId(away),
  status: "scheduled",
});

export const matchContext = (overrides: { seed?: string; playerClub?: string } = {}): MatchContext => {
  const playerClub = overrides.playerClub ?? "home-club";
  const world = makeWorld([makeClub("home-club", 70), makeClub("away-club", 66)]);
  return {
    fixture: makeFixture("home-club", "away-club"),
    world,
    player: makePlayer(playerClub),
    rng: seedRng(overrides.seed ?? "match-seed"),
  };
};

describe("simulateMatch", () => {
  it("produces the same result and cursor from identical inputs", () => {
    const context = matchContext({ seed: "match-11" });
    expect(simulateMatch(context)).toEqual(simulateMatch(context));
  });

  it("returns non-negative integer scores and a bounded player rating", () => {
    const { result } = simulateMatch(matchContext({ seed: "valid-scores" }));
    expect(Number.isInteger(result.homeGoals)).toBe(true);
    expect(Number.isInteger(result.awayGoals)).toBe(true);
    expect(result.homeGoals).toBeGreaterThanOrEqual(0);
    expect(result.awayGoals).toBeGreaterThanOrEqual(0);
    expect(result.playerPerformance?.rating ?? 6).toBeGreaterThanOrEqual(1);
    expect(result.playerPerformance?.rating ?? 6).toBeLessThanOrEqual(10);
  });

  it("produces no player performance when the player belongs to neither club", () => {
    const { result } = simulateMatch(matchContext({ playerClub: "other-club" }));
    expect(result.playerPerformance).toBeNull();
  });
});
