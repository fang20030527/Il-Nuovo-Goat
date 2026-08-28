import { describe, expect, it } from "vitest";
import { clubId, fixtureId } from "@/game/domain/ids";
import type { MatchResult } from "@/game/domain/competition";
import type { CareerState } from "@/game/domain/career";
import { deriveLiveTable, projectNeutralFixtures } from "@/components/SeasonOverview";
import { createCareer } from "@/game/application/create-career";
import { validCreateInput } from "./create-career.test";
import { dispatchCommand } from "@/game/application/dispatch-command";
import { createDoubleRoundRobin } from "@/game/engine/schedule";

const result = (
  id: string,
  home: string,
  away: string,
  homeGoals: number,
  awayGoals: number,
): MatchResult => ({
  fixtureId: fixtureId(id),
  homeClubId: clubId(home),
  awayClubId: clubId(away),
  homeGoals,
  awayGoals,
  playerPerformance: null,
  timeline: [],
});

describe("deriveLiveTable", () => {
  it("returns an empty table when there are no results", () => {
    expect(deriveLiveTable([], new Set([clubId("a")]))).toEqual([]);
  });

  it("ignores results from other leagues", () => {
    const results = [result("f1", "x", "y", 2, 0)];
    const table = deriveLiveTable(results, new Set([clubId("a"), clubId("b")]));
    expect(table).toEqual([]);
  });

  it("awards 3/1/0 points and sorts by points, then goal difference, then goals for", () => {
    const league = new Set([clubId("a"), clubId("b"), clubId("c")]);
    const results = [
      result("f1", "a", "b", 3, 1), // a win
      result("f2", "c", "a", 0, 1), // a wins away
      result("f3", "b", "c", 2, 2), // draw
    ];
    const table = deriveLiveTable(results, league);
    // a 6pts (GD +3), c 1pt (GD -1), b 1pt (GD -4) — goal difference separates the tie
    expect(table.map((row) => row.clubId)).toEqual([clubId("a"), clubId("c"), clubId("b")]);
    const a = table[0];
    expect(a.points).toBe(6);
    expect(a.won).toBe(2);
    expect(a.drawn).toBe(0);
    expect(a.goalsFor - a.goalsAgainst).toBe(3);
  });

  it("breaks a points tie on goal difference before goals for", () => {
    const league = new Set([clubId("a"), clubId("b")]);
    const results = [
      result("f1", "a", "b", 2, 0),
      result("f2", "b", "a", 1, 0),
    ];
    const table = deriveLiveTable(results, league);
    // a: GF 2 GA 1 GD +1, b: GF 1 GA 2 GD -1, both 3 pts
    expect(table[0].clubId).toBe(clubId("a"));
  });
});

describe("projectNeutralFixtures", () => {
  const startDetailedSeason = (): CareerState => {
    const created = createCareer(validCreateInput({ seed: "projection-career", mode: "detailed" }));
    if (!created.ok) throw new Error("createCareer failed");
    const started = dispatchCommand(created.value, {
      type: "START_SEASON",
      mode: "detailed",
      training: "technique",
      intent: "steady-growth",
    });
    if (!started.ok) throw new Error("START_SEASON failed");
    return started.value;
  };

  const playOneMatch = (state: CareerState): CareerState => {
    const begun = dispatchCommand(state, { type: "START_NEXT_MATCH" });
    if (!begun.ok) throw new Error("START_NEXT_MATCH failed");
    let next = begun.value;
    if (next.phase === "detailed-moment" && next.activeMoment) {
      const chosen = dispatchCommand(next, {
        type: "CHOOSE_MOMENT",
        optionId: next.activeMoment.options[0]!.id,
      });
      if (!chosen.ok) throw new Error("CHOOSE_MOMENT failed");
      next = chosen.value;
    }
    const acknowledged = dispatchCommand(next, { type: "ACKNOWLEDGE_MATCH" });
    if (!acknowledged.ok) throw new Error("ACKNOWLEDGE_MATCH failed");
    return acknowledged.value;
  };

  it("returns no projections in classic mode or before the season starts", () => {
    const created = createCareer(validCreateInput({ seed: "projection-career", mode: "classic" }));
    if (!created.ok) throw new Error("createCareer failed");
    const league = created.value.world.leagues[0]!.id;
    expect(projectNeutralFixtures(created.value, league)).toEqual([]);
  });

  it("projects every remaining neutral fixture exactly once, excluding played and player fixtures", () => {
    let state = startDetailedSeason();
    state = playOneMatch(state);
    state = playOneMatch(state);

    const club = state.world.clubs.find((entry) => entry.id === state.player.clubId)!;
    const projections = projectNeutralFixtures(state, club.leagueId);

    const allFixtures = createDoubleRoundRobin(
      club.leagueId,
      state.world.clubs.filter((entry) => entry.leagueId === club.leagueId).map((entry) => entry.id),
      state.season.season,
    );
    const playerFixtureIds = new Set(
      allFixtures
        .filter((fixture) => fixture.homeClubId === club.id || fixture.awayClubId === club.id)
        .map((fixture) => fixture.id),
    );
    const playedIds = new Set(state.season.detailed!.playedResults.map((result) => result.fixtureId));

    // Exactly the unplayed, non-player fixtures are projected.
    expect(projections.length).toBe(allFixtures.length - playerFixtureIds.size - 0);
    const projectedIds = projections.map((result) => result.fixtureId);
    expect(new Set(projectedIds).size).toBe(projectedIds.length);
    for (const id of projectedIds) {
      expect(playerFixtureIds.has(id)).toBe(false);
      expect(playedIds.has(id)).toBe(false);
    }
  });

  it("is deterministic and read-only: repeated calls match and never advance the career RNG", () => {
    let state = startDetailedSeason();
    state = playOneMatch(state);
    const rngBefore = state.rng;
    const club = state.world.clubs.find((entry) => entry.id === state.player.clubId)!;

    const first = projectNeutralFixtures(state, club.leagueId);
    const second = projectNeutralFixtures(state, club.leagueId);
    expect(first).toEqual(second);
    expect(state.rng).toEqual(rngBefore);
  });

  it("covers all ten clubs once merged with the results already in state", () => {
    let state = startDetailedSeason();
    state = playOneMatch(state);
    const club = state.world.clubs.find((entry) => entry.id === state.player.clubId)!;
    const leagueClubIds = new Set(
      state.world.clubs.filter((entry) => entry.leagueId === club.leagueId).map((entry) => entry.id),
    );
    const table = deriveLiveTable(
      [...state.season.detailed!.playedResults, ...projectNeutralFixtures(state, club.leagueId)],
      leagueClubIds,
    );
    expect(table.length).toBe(10);
  });
});
