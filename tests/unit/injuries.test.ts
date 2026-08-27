import { describe, expect, it } from "vitest";
import { emptySeasonStats, type Player } from "@/game/domain/player";
import { clubId } from "@/game/domain/ids";
import { seedRng } from "@/game/engine/rng";
import { advanceInjuryRecovery, rollMatchInjury } from "@/game/engine/injuries";

const makePlayer = (overrides: Partial<Player> = {}): Player => ({
  id: "player-1",
  name: "Fragile Player",
  nationality: "country-1" as Player["nationality"],
  position: "forward",
  preferredFoot: "right",
  shirtNumber: 9,
  age: 27,
  attributes: { technique: 70, awareness: 70, physical: 70, mentality: 70 },
  overall: 70,
  potential: 78,
  fitness: 80,
  form: 60,
  morale: 60,
  coachTrust: 60,
  reputation: 50,
  marketValue: 5_000_000,
  clubId: clubId("club-1"),
  contract: {
    clubId: clubId("club-1"),
    startSeason: 1,
    endSeason: 4,
    weeklyWage: 2000,
    appearanceBonus: 200,
    titleBonus: 1000,
    role: "starter",
    parentClubId: null,
  },
  injury: null,
  currentSeasonStats: emptySeasonStats(),
  careerStats: emptySeasonStats(),
  nationalTeam: { selected: false, caps: 0, goals: 0 },
  tags: [],
  ...overrides,
});

describe("rollMatchInjury", () => {
  it("is deterministic for identical inputs", () => {
    const player = makePlayer();
    const first = rollMatchInjury({ player, rng: seedRng("injury"), recentMinutes: 900 });
    const second = rollMatchInjury({ player, rng: seedRng("injury"), recentMinutes: 900 });
    expect(first).toEqual(second);
  });

  it("never injures an already-injured player", () => {
    const player = makePlayer({
      injury: {
        id: "injury-1",
        severity: "strain",
        remainingMatches: 2,
        potentialDeltaOnRecovery: 0,
        physicalDeltaOnRecovery: 0,
      },
    });
    const { injury } = rollMatchInjury({ player, rng: seedRng("injury"), recentMinutes: 900 });
    expect(injury).toBeNull();
  });

  it("keeps severe injury durations inside their defined windows", () => {
    for (let index = 0; index < 200; index += 1) {
      const player = makePlayer({ fitness: 10, age: 35, attributes: { technique: 70, awareness: 70, physical: 40, mentality: 70 } });
      const { injury } = rollMatchInjury({
        player,
        rng: seedRng(`injury-${index}`),
        recentMinutes: 1200,
      });
      if (!injury) continue;
      if (injury.severity === "knock") expect(injury.remainingMatches).toBe(1);
      if (injury.severity === "strain") {
        expect(injury.remainingMatches).toBeGreaterThanOrEqual(2);
        expect(injury.remainingMatches).toBeLessThanOrEqual(4);
      }
      if (injury.severity === "fracture") {
        expect(injury.remainingMatches).toBeGreaterThanOrEqual(5);
        expect(injury.remainingMatches).toBeLessThanOrEqual(10);
      }
      if (injury.severity === "major") {
        expect(injury.remainingMatches).toBeGreaterThanOrEqual(11);
        expect(injury.remainingMatches).toBeLessThanOrEqual(24);
        expect(injury.potentialDeltaOnRecovery).toBeLessThanOrEqual(0);
        expect(injury.potentialDeltaOnRecovery).toBeGreaterThanOrEqual(-2);
        expect(injury.physicalDeltaOnRecovery).toBeLessThanOrEqual(0);
        expect(injury.physicalDeltaOnRecovery).toBeGreaterThanOrEqual(-3);
      }
    }
  });
});

describe("advanceInjuryRecovery", () => {
  it("reduces remaining matches and clears the injury at zero with a fitness floor", () => {
    const player = makePlayer({
      fitness: 30,
      injury: {
        id: "injury-1",
        severity: "knock",
        remainingMatches: 1,
        potentialDeltaOnRecovery: 0,
        physicalDeltaOnRecovery: 0,
      },
    });
    const recovered = advanceInjuryRecovery(player);
    expect(recovered.injury).toBeNull();
    expect(recovered.fitness).toBe(55);
  });

  it("counts down longer injuries", () => {
    const player = makePlayer({
      injury: {
        id: "injury-1",
        severity: "fracture",
        remainingMatches: 6,
        potentialDeltaOnRecovery: -1,
        physicalDeltaOnRecovery: -2,
      },
    });
    const next = advanceInjuryRecovery(player);
    expect(next.injury?.remainingMatches).toBe(5);
  });

  it("returns the same player when not injured", () => {
    const player = makePlayer();
    expect(advanceInjuryRecovery(player)).toBe(player);
  });
});
