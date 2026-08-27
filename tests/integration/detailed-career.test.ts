import { describe, expect, it } from "vitest";
import { createCareer } from "@/game/application/create-career";
import { dispatchCommand } from "@/game/application/dispatch-command";
import { chooseDeterministicDefault } from "@/game/application/auto-strategy";
import { validCreateInput } from "../unit/create-career.test";
import type { CareerState } from "@/game/domain/career";
import type { GameCommand } from "@/game/domain/commands";

const createDetailedCareer = (seed: string): CareerState => {
  const result = createCareer(validCreateInput({ seed, mode: "detailed" }));
  if (!result.ok) throw new Error(result.error.message);
  return result.value;
};

const startDetailedSeason = (initial: CareerState): CareerState => {
  const started = dispatchCommand(initial, {
    type: "START_SEASON",
    mode: "detailed",
    training: "technique",
    intent: "steady-growth",
  });
  if (!started.ok) throw new Error(started.error.message);
  return started.value;
};

const step = (state: CareerState, command: GameCommand): CareerState => {
  const next = dispatchCommand(state, command);
  if (!next.ok) {
    throw new Error(`${next.error.code}: ${next.error.message} (phase ${state.phase})`);
  }
  return next.value;
};

const runUntilPhase = (
  initial: CareerState,
  phases: readonly CareerState["phase"][],
  maxSteps = 400,
): CareerState => {
  let state = initial;
  for (let i = 0; i < maxSteps; i += 1) {
    if (phases.includes(state.phase)) return state;
    state = step(state, chooseDeterministicDefault(state));
  }
  throw new Error(`Did not reach ${phases.join("/")} from ${initial.phase}`);
};

describe("detailed career", () => {
  it("advances match by match and pauses at key moments", () => {
    let state = startDetailedSeason(createDetailedCareer("detail-flow"));
    expect(state.phase).toBe("detailed-prematch");

    let sawMoment = false;
    let matches = 0;
    for (let i = 0; i < 60 && state.phase !== "transfer-window" && state.phase !== "retired"; i += 1) {
      if (state.phase === "detailed-moment") {
        sawMoment = true;
        expect(state.activeMoment).not.toBeNull();
        expect(state.activeMoment!.options.length).toBeGreaterThan(0);
      }
      if (state.phase === "detailed-postmatch") matches += 1;
      state = step(state, chooseDeterministicDefault(state));
    }
    expect(sawMoment).toBe(true);
    expect(matches).toBeGreaterThan(0);
  });

  it("resolving a moment is deterministic for identical state and choice", () => {
    const initial = startDetailedSeason(createDetailedCareer("moment-pause"));
    const paused = runUntilPhase(initial, ["detailed-moment"]);
    const option = paused.activeMoment!.options[0]!.id;
    const first = dispatchCommand(paused, { type: "CHOOSE_MOMENT", optionId: option });
    const second = dispatchCommand(paused, { type: "CHOOSE_MOMENT", optionId: option });
    expect(first.ok).toBe(true);
    expect(second.ok).toBe(true);
    if (first.ok && second.ok) {
      expect(second.value.rng).toEqual(first.value.rng);
      expect(second.value.player.currentSeasonStats).toEqual(first.value.player.currentSeasonStats);
      expect(second.value.phase).toBe(first.value.phase);
    }
  });

  it("rejects a moment option that is not offered", () => {
    const initial = startDetailedSeason(createDetailedCareer("moment-invalid"));
    const paused = runUntilPhase(initial, ["detailed-moment"]);
    const rejected = dispatchCommand(paused, { type: "CHOOSE_MOMENT", optionId: "not-offered" });
    expect(rejected.ok).toBe(false);
    expect(paused.phase).toBe("detailed-moment");
  });

  it("accumulates season stats equal to the sum of played matches", () => {
    let state = startDetailedSeason(createDetailedCareer("detail-stats"));
    state = runUntilPhase(state, ["transfer-window", "retired"]);
    expect(state.archives).toHaveLength(1);
    const stats = state.archives[0]!.stats;
    expect(stats.appearances).toBeGreaterThan(0);
    expect(stats.minutes).toBeGreaterThanOrEqual(stats.appearances);
    expect(stats.ratedMatches).toBe(stats.appearances);
  });

  it("completes a full detailed career to retirement", () => {
    let state = createDetailedCareer("detail-retire");
    let guard = 0;
    while (state.phase !== "retired" && guard < 5000) {
      state = step(state, chooseDeterministicDefault(state));
      guard += 1;
    }
    expect(state.phase).toBe("retired");
    expect(state.archives).toHaveLength(21);
  });

  it("is deterministic across two identical detailed runs", () => {
    const run = (seed: string) => {
      let state = startDetailedSeason(createDetailedCareer(seed));
      let guard = 0;
      while (state.phase !== "transfer-window" && state.phase !== "retired" && guard < 500) {
        state = step(state, chooseDeterministicDefault(state));
        guard += 1;
      }
      return state;
    };
    const first = run("detail-replay");
    const second = run("detail-replay");
    expect(second.rng).toEqual(first.rng);
    expect(second.archives[0]!.stats).toEqual(first.archives[0]!.stats);
    expect(second.player.currentSeasonStats).toEqual(first.player.currentSeasonStats);
  });
});
