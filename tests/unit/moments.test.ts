import { describe, expect, it } from "vitest";
import { seedRng } from "@/game/engine/rng";
import {
  createMoment,
  momentOptions,
  resolveMoment,
  type MomentContext,
} from "@/game/engine/moments";
import type { Player } from "@/game/domain/player";
import { emptySeasonStats } from "@/game/domain/player";
import { clubId, fixtureId } from "@/game/domain/ids";

const makePlayer = (position: Player["position"], minutes = 90): Player => ({
  id: "player-1",
  name: "Moment Player",
  nationality: "country-1" as Player["nationality"],
  position,
  preferredFoot: "right",
  shirtNumber: 9,
  age: 24,
  attributes: { technique: 70, awareness: 70, physical: 70, mentality: 70 },
  overall: 70,
  potential: 80,
  fitness: 90,
  form: 60,
  morale: 70,
  coachTrust: 65,
  reputation: 45,
  marketValue: 5_000_000,
  clubId: clubId("home-club"),
  contract: {
    clubId: clubId("home-club"),
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
});

const momentContext = (overrides: Partial<MomentContext> = {}): MomentContext => ({
  fixtureId: fixtureId("fixture-1"),
  minute: 63,
  score: [1, 1],
  player: makePlayer("midfielder"),
  playerMinutes: 90,
  opponentLine: 66,
  rng: seedRng("moment-seed"),
  ...overrides,
});

describe("momentOptions", () => {
  it("defines four options for every position family", () => {
    for (const position of ["goalkeeper", "defender", "midfielder", "forward"] as const) {
      expect(momentOptions[position]).toHaveLength(4);
    }
  });
});

describe("createMoment", () => {
  it("returns no moment when the player did not appear", () => {
    const { moment } = createMoment(momentContext({ playerMinutes: 0 }));
    expect(moment).toBeNull();
  });

  it("only offers options from the player's own position family", () => {
    for (const position of ["goalkeeper", "defender", "midfielder", "forward"] as const) {
      const { moment } = createMoment(momentContext({ player: makePlayer(position) }));
      if (moment) {
        const legalIds: ReadonlySet<string> = new Set(
          momentOptions[position].map((option) => option.id),
        );
        expect(moment.options.every((option) => legalIds.has(option.id))).toBe(true);
      }
    }
  });

  it("is deterministic for the same context", () => {
    expect(createMoment(momentContext())).toEqual(createMoment(momentContext()));
  });
});

describe("resolveMoment", () => {
  it("rejects an option outside the active moment without consuming RNG", () => {
    const context = momentContext();
    const { moment } = createMoment({ ...context, playerMinutes: 90 });
    expect(moment).not.toBeNull();
    const outcome = resolveMoment({ ...context, moment: moment! }, "not-a-real-option");
    expect(outcome.ok).toBe(false);
    if (!outcome.ok) {
      expect(outcome.error.code).toBe("INVALID_OPTION");
    }
  });

  it("resolves a valid option deterministically", () => {
    const context = momentContext();
    const { moment } = createMoment(context);
    expect(moment).not.toBeNull();
    const optionId = moment!.options[0]!.id;
    const first = resolveMoment({ ...context, moment: moment! }, optionId);
    const second = resolveMoment({ ...context, moment: moment! }, optionId);
    expect(first).toEqual(second);
    expect(first.ok).toBe(true);
  });
});
