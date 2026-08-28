import fc from "fast-check";
import { expect, it } from "vitest";
import { emptySeasonStats, type Player } from "@/game/domain/player";
import { clubId } from "@/game/domain/ids";
import { seedRng } from "@/game/engine/rng";
import { createDefaultWorld } from "@/game/world/default-world";
import { acceptTransfer, generateTransferOffers } from "@/game/engine/transfers";

const playerArbitrary = (seedNote: string): fc.Arbitrary<Player> =>
  fc.record({
    overall: fc.integer({ min: 45, max: 92 }),
    age: fc.integer({ min: 16, max: 36 }),
    form: fc.integer({ min: 0, max: 100 }),
    marketValue: fc.integer({ min: 100_000, max: 80_000_000 }),
  }).map(({ overall, age, form, marketValue }): Player => ({
    id: `player-${seedNote}`,
    name: "Property Player",
    nationality: "italy" as Player["nationality"],
    position: "midfielder",
    preferredFoot: "right",
    shirtNumber: 8,
    age,
    attributes: { technique: overall, awareness: overall, physical: overall, mentality: overall },
    overall,
    potential: Math.min(99, overall + 10),
    fitness: 90,
    form,
    morale: 60,
    coachTrust: 60,
    reputation: 40,
    marketValue,
    clubId: clubId("north-a-1"),
    contract: {
      clubId: clubId("north-a-1"),
      startSeason: 1,
      endSeason: 4,
      weeklyWage: 5000,
      appearanceBonus: 500,
      titleBonus: 2000,
      role: "rotation",
      parentClubId: null,
    },
    injury: null,
    currentSeasonStats: emptySeasonStats(),
    careerStats: emptySeasonStats(),
    nationalTeam: { selected: false, caps: 0, goals: 0 },
    tags: [],
  }));

it("keeps transfer offers legal and replayable across generated players", () => {
  const world = createDefaultWorld();
  fc.assert(
    fc.property(
      fc.integer({ min: 0, max: 9999 }).chain((seed) =>
        playerArbitrary(String(seed)).map((player) => ({ player, seed })),
      ),
      ({ player, seed }) => {
        const input = {
          player,
          world,
          season: 3,
          rng: seedRng(`transfer-property-${seed}`),
          intent: "open" as const,
        };
        const first = generateTransferOffers(input);
        const second = generateTransferOffers(input);
        expect(second).toEqual(first);

        const offers = first.value;
        expect(offers.length).toBeLessThanOrEqual(5);
        const ids = offers.map((offer) => offer.clubId);
        expect(new Set(ids).size).toBe(ids.length);
        for (const offer of offers) {
          expect(offer.clubId).not.toBe(player.clubId);
          expect(offer.financialFit).toBeGreaterThanOrEqual(1);
          const years = offer.contract.endSeason - offer.contract.startSeason + 1;
          expect(years).toBeGreaterThanOrEqual(1);
          expect(years).toBeLessThanOrEqual(5);
          expect(Number.isInteger(offer.contract.weeklyWage)).toBe(true);
          expect(offer.contract.weeklyWage).toBeGreaterThan(0);
          const moved = acceptTransfer(player, offer);
          expect(moved.clubId).toBe(offer.clubId);
        }
      },
    ),
    { numRuns: 60 },
  );
});
