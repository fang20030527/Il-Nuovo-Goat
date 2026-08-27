import { describe, expect, it } from "vitest";
import { nextFloat, nextInt, pickWeighted, seedRng } from "@/game/engine/rng";

describe("deterministic RNG", () => {
  it("replays the same sequence from the same seed", () => {
    let a = seedRng("career-42");
    let b = seedRng("career-42");
    const left: number[] = [];
    const right: number[] = [];
    for (let index = 0; index < 20; index += 1) {
      const ar = nextFloat(a); a = ar.state; left.push(ar.value);
      const br = nextFloat(b); b = br.state; right.push(br.value);
    }
    expect(left).toEqual(right);
  });

  it("uses inclusive integer bounds", () => {
    let state = seedRng("bounds");
    for (let index = 0; index < 200; index += 1) {
      const result = nextInt(state, 3, 7); state = result.state;
      expect(result.value).toBeGreaterThanOrEqual(3);
      expect(result.value).toBeLessThanOrEqual(7);
    }
  });

  it("rejects an invalid weighted list without consuming the cursor", () => {
    const state = seedRng("weights");
    expect(pickWeighted(state, []).ok).toBe(false);
    const result = pickWeighted(state, [
      { value: "a", weight: 0 },
      { value: "b", weight: 0 },
    ]);
    expect(result.ok).toBe(false);
  });

  it("picks deterministically from positive weights", () => {
    const items = [
      { value: "a", weight: 1 },
      { value: "b", weight: 3 },
    ];
    expect(pickWeighted(seedRng("w"), items)).toEqual(pickWeighted(seedRng("w"), items));
  });
});
