import fc from "fast-check";
import { expect, it } from "vitest";
import { nextFloat, seedRng } from "@/game/engine/rng";

it("replays arbitrary seeds and sequence lengths", () => {
  fc.assert(fc.property(fc.string(), fc.integer({ min: 1, max: 200 }), (seed, length) => {
    const run = () => {
      let state = seedRng(seed);
      return Array.from({ length }, () => {
        const result = nextFloat(state); state = result.state; return result.value;
      });
    };
    expect(run()).toEqual(run());
  }));
});
