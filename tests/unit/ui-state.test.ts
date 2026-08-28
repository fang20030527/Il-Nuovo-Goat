import { describe, expect, it, vi } from "vitest";
import type { CareerState } from "@/game/domain/career";
import { emptySeasonStats } from "@/game/domain/player";
import { seedRng } from "@/game/engine/rng";
import { createDefaultWorld } from "@/game/world/default-world";
import { applyAndCommit } from "@/hooks/use-career-slot";

const makeCareer = (): CareerState => {
  const world = createDefaultWorld();
  const club = world.clubs[0];
  return {
    saveSchemaVersion: 1,
    rulesVersion: "1.0.0",
    rng: seedRng("ui-test"),
    phase: "preseason",
    mode: "classic",
    difficulty: "balanced",
    trainingFocus: "technique",
    careerIntent: "steady-growth",
    world,
    player: {
      id: "player-ui",
      name: "Ui Player",
      nationality: world.countries[0].id,
      position: "midfielder",
      preferredFoot: "right",
      shirtNumber: 8,
      age: 16,
      attributes: { technique: 50, awareness: 50, physical: 50, mentality: 50 },
      overall: 50,
      potential: 80,
      fitness: 80,
      form: 55,
      morale: 65,
      coachTrust: 45,
      reputation: 10,
      marketValue: 250_000,
      clubId: club.id,
      contract: {
        clubId: club.id,
        startSeason: 1,
        endSeason: 2,
        weeklyWage: 500,
        appearanceBonus: 50,
        titleBonus: 2_000,
        role: "prospect",
        parentClubId: null,
      },
      injury: null,
      currentSeasonStats: emptySeasonStats(),
      careerStats: emptySeasonStats(),
      nationalTeam: { selected: false, caps: 0, goals: 0 },
      tags: [],
    },
    season: {
      season: 1,
      status: "not-started",
      completedClubFixtures: 0,
      fixtures: [],
      results: [],
      leagueTables: [],
      domesticCupWinners: [],
      continentalCupWinner: null,
      nationalTeamResult: {
        selected: false,
        appearances: 0,
        goals: 0,
        tournamentFinish: "not-held",
      },
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
  };
};

describe("applyAndCommit", () => {
  it("does not publish a transition when persistence rejects", async () => {
    const current = makeCareer();
    const persist = vi.fn().mockRejectedValue(new Error("quota"));
    await expect(
      applyAndCommit(current, {
        type: "START_SEASON",
        mode: "classic",
        training: "technique",
        intent: "steady-growth",
      }, persist),
    ).rejects.toThrow("quota");
    expect(current.phase).toBe("preseason");
    expect(persist).toHaveBeenCalledTimes(1);
  });

  it("returns the committed state after persistence succeeds", async () => {
    const current = makeCareer();
    const persist = vi.fn().mockResolvedValue(undefined);
    const next = await applyAndCommit(current, {
      type: "START_SEASON",
      mode: "classic",
      training: "technique",
      intent: "steady-growth",
    }, persist);
    expect(next.phase).not.toBe("preseason");
    expect(persist).toHaveBeenCalledWith(next);
  });

  it("surfaces domain errors without persisting", async () => {
    const current = makeCareer();
    const persist = vi.fn().mockResolvedValue(undefined);
    // ADVANCE_CLASSIC is not allowed from preseason
    await expect(
      applyAndCommit(current, { type: "ADVANCE_CLASSIC" }, persist),
    ).rejects.toThrow();
    expect(persist).not.toHaveBeenCalled();
  });
});
