import { describe, expect, it } from "vitest";
import { clubId, fixtureId, leagueId } from "@/game/domain/ids";
import type { MatchResult } from "@/game/domain/competition";
import { createDoubleRoundRobin } from "@/game/engine/schedule";
import { applyLeagueResult, createEmptyTable, sortTable } from "@/game/engine/table";

describe("double round-robin schedule", () => {
  it("creates 18 rounds and 90 fixtures for ten clubs", () => {
    const clubs = Array.from({ length: 10 }, (_, index) => clubId(`club-${index + 1}`));
    const fixtures = createDoubleRoundRobin(leagueId("league-1"), clubs, 2026);
    expect(new Set(fixtures.map((fixture) => fixture.round)).size).toBe(18);
    expect(fixtures).toHaveLength(90);
    expect(fixtures.every((fixture) => fixture.homeClubId !== fixture.awayClubId)).toBe(true);
  });

  it("schedules every ordered pairing exactly once", () => {
    const clubs = Array.from({ length: 10 }, (_, index) => clubId(`club-${index + 1}`));
    const fixtures = createDoubleRoundRobin(leagueId("league-1"), clubs, 2026);
    const pairs = fixtures.map((fixture) => `${fixture.homeClubId}:${fixture.awayClubId}`);
    expect(new Set(pairs).size).toBe(90);
  });

  it("gives every club nine home and nine away matches", () => {
    const clubs = Array.from({ length: 10 }, (_, index) => clubId(`club-${index + 1}`));
    const fixtures = createDoubleRoundRobin(leagueId("league-1"), clubs, 2026);
    for (const club of clubs) {
      expect(fixtures.filter((f) => f.homeClubId === club)).toHaveLength(9);
      expect(fixtures.filter((f) => f.awayClubId === club)).toHaveLength(9);
    }
  });
});

const result = (home: string, away: string, homeGoals: number, awayGoals: number): MatchResult => ({
  fixtureId: fixtureId(`${home}-${away}`),
  homeClubId: clubId(home), awayClubId: clubId(away), homeGoals, awayGoals,
  playerPerformance: null, timeline: [],
});
const row = (table: readonly { clubId: string }[], id: string) =>
  table.find((entry) => entry.clubId === clubId(id));

describe("league table accounting", () => {
  it("awards three points for a win and one for a draw", () => {
    const table = createEmptyTable([clubId("home"), clubId("away")]);
    const afterWin = applyLeagueResult(table, result("home", "away", 2, 0));
    expect(row(afterWin, "home")).toMatchObject({ played: 1, won: 1, points: 3, goalsFor: 2 });
    expect(row(afterWin, "away")).toMatchObject({ played: 1, lost: 1, points: 0, goalsAgainst: 2 });
    const afterDraw = applyLeagueResult(createEmptyTable([clubId("home"), clubId("away")]), result("home", "away", 1, 1));
    expect(row(afterDraw, "home")).toMatchObject({ drawn: 1, points: 1 });
    expect(row(afterDraw, "away")).toMatchObject({ drawn: 1, points: 1 });
  });

  it("sorts by points, goal difference, goals scored, wins, then club id", () => {
    const clubs = [clubId("a"), clubId("b"), clubId("c")];
    let table = createEmptyTable(clubs);
    table = applyLeagueResult(table, result("a", "b", 3, 0));
    table = applyLeagueResult(table, result("c", "a", 0, 1));
    table = applyLeagueResult(table, result("b", "c", 1, 0));
    const sorted = sortTable(table);
    // a: 6pts. b and c both have 3pts, GD -2, GF 1, 1 win — the tie falls through to club id.
    expect(sorted.map((entry) => entry.clubId)).toEqual([clubId("a"), clubId("b"), clubId("c")]);
  });
});
