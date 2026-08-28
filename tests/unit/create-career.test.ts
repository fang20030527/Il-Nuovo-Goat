import { describe, expect, it } from "vitest";
import { createCareer, type CreateCareerInput } from "@/game/application/create-career";
import { createDefaultWorld } from "@/game/world/default-world";
import { seedRng } from "@/game/engine/rng";
import { clubId, countryId } from "@/game/domain/ids";

export const validCreateInput = (overrides: Partial<CreateCareerInput> = {}): CreateCareerInput => {
  const world = createDefaultWorld();
  return {
    world,
    playerName: "Test Player",
    nationality: countryId("italy"),
    position: "forward",
    preferredFoot: "right",
    shirtNumber: 9,
    difficulty: "balanced",
    seed: "my-career",
    startingClubId: world.clubs[0]!.id,
    mode: "classic",
    trainingFocus: "technique",
    careerIntent: "steady-growth",
    ...overrides,
  };
};

describe("createCareer", () => {
  it("creates a 16-year-old career in preseason with a stable seed", () => {
    const result = createCareer(validCreateInput({ seed: "my-career", mode: "classic" }));
    expect(result.ok).toBe(true);
    if (result.ok) {
      expect(result.value.player.age).toBe(16);
      expect(result.value.phase).toBe("preseason");
      expect(result.value.rng).toEqual(seedRng("my-career"));
    }
  });

  it("rejects blank names and a starting club outside the world", () => {
    expect(createCareer(validCreateInput({ playerName: "" })).ok).toBe(false);
    expect(createCareer(validCreateInput({ startingClubId: clubId("missing") })).ok).toBe(false);
  });

  it("rejects unsupported nationality, shirt numbers, and long names", () => {
    expect(createCareer(validCreateInput({ nationality: countryId("nope") })).ok).toBe(false);
    expect(createCareer(validCreateInput({ shirtNumber: 0 })).ok).toBe(false);
    expect(createCareer(validCreateInput({ shirtNumber: 100 })).ok).toBe(false);
    expect(createCareer(validCreateInput({ playerName: "x".repeat(41) })).ok).toBe(false);
  });

  it("derives starting attributes within 45-62 and potential within 70-92", () => {
    const result = createCareer(validCreateInput({ seed: "attr-check" }));
    expect(result.ok).toBe(true);
    if (result.ok) {
      for (const value of Object.values(result.value.player.attributes)) {
        expect(value).toBeGreaterThanOrEqual(45);
        expect(value).toBeLessThanOrEqual(62);
      }
      expect(result.value.player.potential).toBeGreaterThanOrEqual(70);
      expect(result.value.player.potential).toBeLessThanOrEqual(92);
    }
  });

  it("is deterministic for the same input", () => {
    const first = createCareer(validCreateInput({ seed: "repeatable" }));
    const second = createCareer(validCreateInput({ seed: "repeatable" }));
    expect(first).toEqual(second);
  });

  it("gives the player a two-year prospect contract at the starting club", () => {
    const input = validCreateInput({ seed: "contract-check" });
    const result = createCareer(input);
    expect(result.ok).toBe(true);
    if (result.ok) {
      expect(result.value.player.contract.clubId).toBe(input.startingClubId);
      expect(result.value.player.contract.startSeason).toBe(1);
      expect(result.value.player.contract.endSeason).toBe(2);
      expect(result.value.player.contract.role).toBe("prospect");
    }
  });
});
