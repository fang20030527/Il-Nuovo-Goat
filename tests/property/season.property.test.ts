import fc from "fast-check";
import { expect, it } from "vitest";
import { createDefaultWorld } from "@/game/world/default-world";
import { seedRng } from "@/game/engine/rng";
import {
  applyPromotionRelegation,
  createSeasonState,
  runSeasonToCompletion,
} from "@/game/engine/season";

it("holds season invariants across 100 seeds", () => {
  const world = createDefaultWorld();
  fc.assert(
    fc.property(fc.integer({ min: 0, max: 9999 }), (seedNumber) => {
      const completed = runSeasonToCompletion(
        createSeasonState(world, 1, seedRng(`season-property-${seedNumber}`)),
      );
      expect(completed.status).toBe("complete");
      expect(completed.leagueTables).toHaveLength(8);
      for (const table of completed.leagueTables) {
        expect(table.rows).toHaveLength(10);
        for (const row of table.rows) {
          expect(row.played).toBe(18);
        }
      }
      expect(completed.domesticCupWinners).toHaveLength(4);
      expect(completed.continentalCupWinner).toBeTruthy();

      const promotedAll = completed.leagueTables.flatMap((table) => table.promoted);
      const relegatedAll = completed.leagueTables.flatMap((table) => table.relegated);
      for (const country of world.countries) {
        const first = completed.leagueTables.find((t) => t.leagueId === `${country.id}-1`);
        const second = completed.leagueTables.find((t) => t.leagueId === `${country.id}-2`);
        expect(first?.relegated).toHaveLength(2);
        expect(second?.promoted).toHaveLength(2);
      }
      expect(promotedAll).toHaveLength(8);
      expect(relegatedAll).toHaveLength(8);

      const nextWorld = applyPromotionRelegation(world, completed.leagueTables);
      const leagueMembership = new Map<string, string[]>();
      for (const club of nextWorld.clubs) {
        const members = leagueMembership.get(club.leagueId) ?? [];
        members.push(club.id);
        leagueMembership.set(club.leagueId, members);
      }
      for (const league of nextWorld.leagues) {
        expect(leagueMembership.get(league.id)).toHaveLength(10);
      }
      for (const club of nextWorld.clubs) {
        const appearances = nextWorld.leagues.filter(
          (league) => (leagueMembership.get(league.id) ?? []).includes(club.id),
        );
        expect(appearances).toHaveLength(1);
      }
    }),
    { numRuns: 100 },
  );
});
