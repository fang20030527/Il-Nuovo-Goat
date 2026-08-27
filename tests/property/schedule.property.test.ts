import fc from "fast-check";
import { expect, it } from "vitest";
import { clubId, fixtureId, leagueId } from "@/game/domain/ids";
import type { MatchResult } from "@/game/domain/competition";
import { createDoubleRoundRobin } from "@/game/engine/schedule";
import { applyLeagueResult, createEmptyTable } from "@/game/engine/table";

it("holds league schedule invariants for every permutation of ten clubs", () => {
  const ids = Array.from({ length: 10 }, (_, index) => `club-${index + 1}`);
  fc.assert(fc.property(fc.shuffledSubarray(ids, { minLength: 10, maxLength: 10 }), (names) => {
    const clubs = names.map(clubId);
    const fixtures = createDoubleRoundRobin(leagueId("league-1"), clubs, 2030);
    expect(fixtures).toHaveLength(90);
    const pairs = fixtures.map((fixture) => `${fixture.homeClubId}:${fixture.awayClubId}`);
    expect(new Set(pairs).size).toBe(90);
    for (const club of clubs) {
      const played = fixtures.filter((f) => f.homeClubId === club || f.awayClubId === club);
      expect(played).toHaveLength(18);
      expect(played.every((f) => f.homeClubId !== f.awayClubId)).toBe(true);
      expect(fixtures.filter((f) => f.homeClubId === club)).toHaveLength(9);
    }
  }));
});

it("awards exactly two total points for a draw and three otherwise", () => {
  fc.assert(fc.property(
    fc.integer({ min: 0, max: 6 }), fc.integer({ min: 0, max: 6 }),
    (homeGoals, awayGoals) => {
      const clubs = [clubId("home"), clubId("away")];
      const match: MatchResult = {
        fixtureId: fixtureId("m"), homeClubId: clubId("home"), awayClubId: clubId("away"),
        homeGoals, awayGoals, playerPerformance: null, timeline: [],
      };
      const table = applyLeagueResult(createEmptyTable(clubs), match);
      const total = table.reduce((sum, entry) => sum + entry.points, 0);
      expect(total).toBe(homeGoals === awayGoals ? 2 : 3);
    },
  ));
});
