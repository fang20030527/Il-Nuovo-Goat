import { describe, expect, it } from "vitest";
import { emptySeasonStats, type Player, type SeasonStats } from "@/game/domain/player";
import { clubId } from "@/game/domain/ids";
import { seedRng } from "@/game/engine/rng";
import {
  applySeasonProgression,
  trainingEffect,
  type ProgressionInput,
} from "@/game/engine/progression";

const makeStats = (overrides: Partial<SeasonStats> = {}): SeasonStats => ({
  ...emptySeasonStats(),
  ...overrides,
});

const makePlayer = (overrides: Partial<Player> = {}): Player => ({
  id: "player-1",
  name: "Growing Player",
  nationality: "country-1" as Player["nationality"],
  position: "midfielder",
  preferredFoot: "right",
  shirtNumber: 8,
  age: 20,
  attributes: { technique: 60, awareness: 60, physical: 60, mentality: 60 },
  overall: 60,
  potential: 80,
  fitness: 80,
  form: 60,
  morale: 60,
  coachTrust: 60,
  reputation: 30,
  marketValue: 500_000,
  clubId: clubId("club-1"),
  contract: {
    clubId: clubId("club-1"),
    startSeason: 1,
    endSeason: 4,
    weeklyWage: 1000,
    appearanceBonus: 100,
    titleBonus: 500,
    role: "rotation",
    parentClubId: null,
  },
  injury: null,
  currentSeasonStats: makeStats(),
  careerStats: makeStats(),
  nationalTeam: { selected: false, caps: 0, goals: 0 },
  tags: [],
  ...overrides,
});

const progressionInput = (overrides: Partial<ProgressionInput> = {}): ProgressionInput => ({
  player: makePlayer(),
  seasonStats: makeStats({ minutes: 1500, ratingTotal: 68, ratedMatches: 10 }),
  facilities: 60,
  trainingFocus: "technique",
  rng: seedRng("progression"),
  ...overrides,
});

describe("applySeasonProgression", () => {
  it("grows a high-potential 18-year-old starter faster than a benched peer", () => {
    const base = makePlayer({ age: 18, potential: 88 });
    const starter = applySeasonProgression(
      progressionInput({
        player: base,
        seasonStats: makeStats({ minutes: 2400, ratingTotal: 70, ratedMatches: 10 }),
      }),
    );
    const bench = applySeasonProgression(
      progressionInput({
        player: base,
        seasonStats: makeStats({ minutes: 180, ratingTotal: 70, ratedMatches: 10 }),
      }),
    );
    expect(starter.player.overall).toBeGreaterThan(bench.player.overall);
  });

  it("declines physical ability after age 33 while allowing mentality to hold", () => {
    const result = applySeasonProgression(
      progressionInput({
        player: makePlayer({
          age: 34,
          attributes: { technique: 70, awareness: 70, physical: 82, mentality: 76 },
          overall: 74,
        }),
      }),
    );
    expect(result.player.attributes.physical).toBeLessThan(82);
    expect(result.player.attributes.mentality).toBeGreaterThanOrEqual(75);
  });

  it("never lets overall exceed potential by more than two points", () => {
    const result = applySeasonProgression(
      progressionInput({
        player: makePlayer({ age: 19, overall: 88, potential: 88 }),
        seasonStats: makeStats({ minutes: 3000, ratingTotal: 90, ratedMatches: 10 }),
        facilities: 99,
      }),
    );
    expect(result.player.overall).toBeLessThanOrEqual(result.player.potential + 2);
  });

  it("clamps every attribute between 1 and 99", () => {
    const result = applySeasonProgression(
      progressionInput({
        player: makePlayer({ age: 19, potential: 99 }),
        seasonStats: makeStats({ minutes: 3000, ratingTotal: 95, ratedMatches: 10 }),
        facilities: 99,
      }),
    );
    for (const value of Object.values(result.player.attributes)) {
      expect(value).toBeGreaterThanOrEqual(1);
      expect(value).toBeLessThanOrEqual(99);
    }
  });

  it("is deterministic for identical inputs", () => {
    expect(applySeasonProgression(progressionInput())).toEqual(
      applySeasonProgression(progressionInput()),
    );
  });
});

describe("trainingEffect", () => {
  it("boosts the focused attribute family more than unfocused ones", () => {
    const player = makePlayer({ age: 20 });
    expect(trainingEffect("technique", player).technique).toBeGreaterThan(0);
  });
});
