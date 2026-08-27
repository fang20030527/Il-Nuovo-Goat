import { describe, expect, it } from "vitest";
import { createDefaultWorld } from "@/game/world/default-world";

describe("default fictional world", () => {
  it("contains four countries, eight leagues, and eighty unique clubs", () => {
    const world = createDefaultWorld();
    expect(world.countries).toHaveLength(4);
    expect(world.leagues).toHaveLength(8);
    expect(world.clubs).toHaveLength(80);
    expect(new Set(world.clubs.map((club) => club.id)).size).toBe(80);
  });

  it("contains two ten-club divisions per country", () => {
    const world = createDefaultWorld();
    for (const country of world.countries) {
      const leagues = world.leagues.filter((league) => league.countryId === country.id);
      expect(leagues.map((league) => league.level).sort()).toEqual([1, 2]);
      for (const league of leagues) {
        expect(world.clubs.filter((club) => club.leagueId === league.id)).toHaveLength(10);
      }
    }
  });
});
