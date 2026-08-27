import { describe, expect, it } from "vitest";
import { emptySeasonStats, type Player } from "@/game/domain/player";
import type { Club, World } from "@/game/domain/world";
import { clubId } from "@/game/domain/ids";
import { seedRng } from "@/game/engine/rng";
import { createDefaultWorld } from "@/game/world/default-world";
import {
  acceptTransfer,
  estimateClubRole,
  generateTransferOffers,
  renewContract,
  requestLoan,
  type TransferInput,
} from "@/game/engine/transfers";

const makePlayer = (overrides: Partial<Player> = {}): Player => ({
  id: "player-1",
  name: "Moving Player",
  nationality: "northland" as Player["nationality"],
  position: "midfielder",
  preferredFoot: "right",
  shirtNumber: 8,
  age: 21,
  attributes: { technique: 70, awareness: 68, physical: 65, mentality: 66 },
  overall: 68,
  potential: 85,
  fitness: 90,
  form: 65,
  morale: 65,
  coachTrust: 60,
  reputation: 40,
  marketValue: 5_000_000,
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
  ...overrides,
});

const makeClub = (overrides: Partial<Club> = {}): Club => ({
  id: clubId("club-x"),
  name: "Club X",
  countryId: "northland" as Club["countryId"],
  leagueId: "northland-1" as Club["leagueId"],
  reputation: 60,
  finances: 70,
  academy: 60,
  facilities: 60,
  lines: { goalkeeper: 65, defender: 66, midfielder: 70, forward: 68 },
  style: "balanced",
  homeAdvantage: 5,
  ...overrides,
});

const transferInput = (overrides: Partial<TransferInput> = {}): TransferInput => ({
  player: makePlayer(),
  world: createDefaultWorld(),
  season: 2,
  rng: seedRng("transfer"),
  intent: "open",
  ...overrides,
});

describe("estimateClubRole", () => {
  it("offers a starter role when player OVR exceeds the club line", () => {
    expect(
      estimateClubRole(makePlayer({ overall: 78 }), makeClub()),
    ).toBe("starter");
  });

  it("maps clear superiority to star and big gaps to prospect", () => {
    const club = makeClub();
    expect(estimateClubRole(makePlayer({ overall: 80 }), club)).toBe("star");
    expect(estimateClubRole(makePlayer({ overall: 72 }), club)).toBe("starter");
    expect(estimateClubRole(makePlayer({ overall: 66 }), club)).toBe("rotation");
    expect(estimateClubRole(makePlayer({ overall: 60 }), club)).toBe("prospect");
  });
});

describe("generateTransferOffers", () => {
  it("does not offer clubs that cannot afford the player or already employ them", () => {
    const input = transferInput();
    const result = generateTransferOffers(input);
    const offers = result.value;
    expect(offers.every((offer) => offer.clubId !== input.player.clubId)).toBe(true);
    expect(offers.every((offer) => offer.financialFit >= 1)).toBe(true);
    const ids = offers.map((offer) => offer.clubId);
    expect(new Set(ids).size).toBe(ids.length);
    expect(offers.length).toBeLessThanOrEqual(5);
  });

  it("produces legal contracts with integer wages and 1-5 year terms", () => {
    const result = generateTransferOffers(transferInput());
    for (const offer of result.value) {
      const years = offer.contract.endSeason - offer.contract.startSeason + 1;
      expect(years).toBeGreaterThanOrEqual(1);
      expect(years).toBeLessThanOrEqual(5);
      expect(Number.isInteger(offer.contract.weeklyWage)).toBe(true);
      expect(offer.contract.weeklyWage).toBeGreaterThan(0);
      expect(offer.contract.clubId).toBe(offer.clubId);
    }
  });

  it("is deterministic from the same RNG state", () => {
    const a = generateTransferOffers(transferInput());
    const b = generateTransferOffers(transferInput());
    expect(a).toEqual(b);
  });
});

describe("acceptTransfer", () => {
  it("moves the player exactly once to the offering club", () => {
    const input = transferInput();
    const offers = generateTransferOffers(input).value;
    expect(offers.length).toBeGreaterThan(0);
    const offer = offers[0]!;
    const moved = acceptTransfer(input.player, offer);
    expect(moved.clubId).toBe(offer.clubId);
    expect(moved.contract.clubId).toBe(offer.clubId);
    expect(moved.contract.parentClubId).toBe(null);
  });
});

describe("renewContract", () => {
  it("renews with the same club and a legal term", () => {
    const player = makePlayer();
    const result = renewContract(player, makeClub({ id: player.clubId }), 2, seedRng("renew"));
    const years = result.contract.endSeason - result.contract.startSeason + 1;
    expect(result.contract.clubId).toBe(player.clubId);
    expect(years).toBeGreaterThanOrEqual(1);
    expect(years).toBeLessThanOrEqual(5);
  });
});

describe("requestLoan", () => {
  it("allows young rotation players to join a club promising minutes", () => {
    const world = createDefaultWorld();
    const destination = world.clubs.find((club) => club.id !== makePlayer().clubId)!;
    const result = requestLoan({
      player: makePlayer({ age: 20 }),
      destination,
      season: 2,
      promisedRole: "rotation",
    });
    expect(result.ok).toBe(true);
    if (result.ok) {
      expect(result.value.clubId).toBe(destination.id);
      expect(result.value.contract.parentClubId).toBe(makePlayer().clubId);
    }
  });

  it("rejects loans for players over 23", () => {
    const world = createDefaultWorld();
    const destination = world.clubs[0]!;
    const result = requestLoan({
      player: makePlayer({ age: 28 }),
      destination,
      season: 2,
      promisedRole: "starter",
    });
    expect(result.ok).toBe(false);
  });
});
