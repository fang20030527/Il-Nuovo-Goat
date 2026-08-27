import { describe, expect, it } from "vitest";
import { createDefaultWorld } from "@/game/world/default-world";
import { seedRng } from "@/game/engine/rng";
import { createSeasonState, runSeasonToCompletion } from "@/game/engine/season";

describe("season orchestration", () => {
  it("finishes all eight leagues, four domestic cups, and one continental cup", () => {
    const initial = createSeasonState(createDefaultWorld(), 1, seedRng("season-one"));
    const completed = runSeasonToCompletion(initial);
    expect(completed.status).toBe("complete");
    expect(completed.leagueTables).toHaveLength(8);
    expect(completed.domesticCupWinners).toHaveLength(4);
    expect(completed.continentalCupWinner).toBeTruthy();
    expect(
      completed.leagueTables.every((table) => table.rows.every((row) => row.played === 18)),
    ).toBe(true);
  });

  it("is deterministic for the same world, season, and seed", () => {
    const world = createDefaultWorld();
    const first = runSeasonToCompletion(createSeasonState(world, 1, seedRng("replay")));
    const second = runSeasonToCompletion(createSeasonState(world, 1, seedRng("replay")));
    expect(second).toEqual(first);
  });

  it("promotes and relegates exactly two clubs per country", () => {
    const world = createDefaultWorld();
    const completed = runSeasonToCompletion(createSeasonState(world, 1, seedRng("promotion")));
    for (const country of world.countries) {
      const firstDivision = completed.leagueTables.find(
        (table) => table.leagueId === `${country.id}-1`,
      );
      const secondDivision = completed.leagueTables.find(
        (table) => table.leagueId === `${country.id}-2`,
      );
      expect(firstDivision?.promoted).toHaveLength(0);
      expect(firstDivision?.relegated).toHaveLength(2);
      expect(secondDivision?.promoted).toHaveLength(2);
      expect(secondDivision?.relegated).toHaveLength(0);
    }
  });
});
