import { describe, expect, it } from "vitest";
import { createCareer } from "@/game/application/create-career";
import { dispatchCommand } from "@/game/application/dispatch-command";
import { chooseDeterministicDefault } from "@/game/application/auto-strategy";
import { validCreateInput } from "../unit/create-career.test";
import type { CareerState } from "@/game/domain/career";

const createClassicCareer = (seed: string): CareerState => {
  const result = createCareer(validCreateInput({ seed, mode: "classic" }));
  if (!result.ok) throw new Error(result.error.message);
  return result.value;
};

const runCareerToRetirement = (initial: CareerState): CareerState => {
  let state = initial;
  let guard = 0;
  while (state.phase !== "retired" && guard < 500) {
    const command = chooseDeterministicDefault(state);
    const next = dispatchCommand(state, command);
    if (!next.ok) throw new Error(`${next.error.code}: ${next.error.message} (phase ${state.phase})`);
    state = next.value;
    guard += 1;
  }
  if (guard >= 500) throw new Error(`Career did not retire; stuck in phase ${state.phase}`);
  return state;
};

describe("classic career", () => {
  it("completes exactly 21 archived seasons in classic mode", () => {
    const final = runCareerToRetirement(createClassicCareer("classic-21"));
    expect(final.phase).toBe("retired");
    expect(final.archives).toHaveLength(21);
    expect(final.archives.map((archive) => archive.age)).toEqual(
      Array.from({ length: 21 }, (_, index) => index + 16),
    );
  });

  it("rejects commands outside the current phase and leaves state unchanged", () => {
    const career = createClassicCareer("invalid-cmd");
    const rejected = dispatchCommand(career, { type: "ADVANCE_CLASSIC" });
    expect(rejected.ok).toBe(false);
    const acknowledged = dispatchCommand(career, { type: "ACKNOWLEDGE_MATCH" });
    expect(acknowledged.ok).toBe(false);
    expect(career.phase).toBe("preseason");
  });

  it("rejects retired careers", () => {
    const final = runCareerToRetirement(createClassicCareer("retired-reject"));
    const after = dispatchCommand(final, chooseDeterministicDefault(final));
    expect(after.ok).toBe(false);
  });

  it("is fully deterministic across two identical runs", () => {
    const first = runCareerToRetirement(createClassicCareer("replay-career"));
    const second = runCareerToRetirement(createClassicCareer("replay-career"));
    expect(second.rng).toEqual(first.rng);
    expect(second.archives).toEqual(first.archives);
    expect(second.player.overall).toBe(first.player.overall);
    expect(second.world).toEqual(first.world);
  });

  it("records every accepted command in order", () => {
    const final = runCareerToRetirement(createClassicCareer("command-log"));
    expect(final.commandHistory.length).toBeGreaterThan(0);
    final.commandHistory.forEach((entry, index) => {
      expect(entry.index).toBe(index);
    });
    const seasonsStarted = final.commandHistory.filter(
      (entry) => entry.command.type === "START_SEASON" || entry.command.type === "START_NEXT_SEASON",
    );
    expect(seasonsStarted.length).toBe(21);
  });

  it("resolves one classic season in less than one second on the test host", () => {
    const initial = createClassicCareer("classic-performance");
    const startedAt = performance.now();
    let state = dispatchCommand(initial, chooseDeterministicDefault(initial));
    if (!state.ok) throw new Error(state.error.message);
    let current = state.value;
    while (current.phase !== "transfer-window" && current.phase !== "retired") {
      const next = dispatchCommand(current, chooseDeterministicDefault(current));
      if (!next.ok) throw new Error(next.error.message);
      current = next.value;
    }
    expect(performance.now() - startedAt).toBeLessThan(1_000);
    expect(current.archives).toHaveLength(1);
  });
});
