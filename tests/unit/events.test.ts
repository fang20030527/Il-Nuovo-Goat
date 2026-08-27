import { describe, expect, it } from "vitest";
import { eventCatalog } from "@/game/events/catalog";
import { eligibleEvents, selectEvent } from "@/game/events/select-event";
import { applyEventChoice } from "@/game/events/apply-event-choice";
import { emptySeasonStats, type Player } from "@/game/domain/player";
import { clubId } from "@/game/domain/ids";
import { seedRng } from "@/game/engine/rng";
import { createDefaultWorld } from "@/game/world/default-world";
import type { CareerState } from "@/game/domain/career";

const makePlayer = (overrides: Partial<Player> = {}): Player => ({
  id: "player-1",
  name: "Event Player",
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

const makeState = (overrides: Partial<CareerState> = {}): CareerState => ({
  saveSchemaVersion: 1,
  rulesVersion: "1.0.0",
  rng: seedRng("events"),
  phase: "preseason",
  mode: "classic",
  difficulty: "balanced",
  trainingFocus: "technique",
  careerIntent: "steady-growth",
  world: createDefaultWorld(),
  player: makePlayer(),
  season: {
    season: 1,
    status: "not-started",
    completedClubFixtures: 0,
    fixtures: [],
    results: [],
    leagueTables: [],
    domesticCupWinners: [],
    continentalCupWinner: null,
    nationalTeamResult: { selected: false, appearances: 0, goals: 0, tournamentFinish: "not-held" },
    pendingFixtureId: null,
    detailed: null,
  },
  archives: [],
  activeMoment: null,
  activeEventId: null,
  eventHistory: [],
  careerHistory: [],
  commandHistory: [],
  transferOffers: [],
  ...overrides,
});

describe("event catalog", () => {
  it("contains at least 72 unique original events across all ten categories", () => {
    expect(eventCatalog.length).toBeGreaterThanOrEqual(72);
    expect(new Set(eventCatalog.map((event) => event.id)).size).toBe(eventCatalog.length);
    expect(new Set(eventCatalog.map((event) => event.category))).toEqual(
      new Set([
        "training", "recovery", "coach", "teammates", "media",
        "family", "agent", "national-team", "contracts", "milestones",
      ]),
    );
  });

  it("every event has two or three unique options and a positive max trigger count", () => {
    for (const event of eventCatalog) {
      expect(event.options.length).toBeGreaterThanOrEqual(2);
      expect(event.options.length).toBeLessThanOrEqual(3);
      expect(new Set(event.options.map((option) => option.id)).size).toBe(event.options.length);
      expect(event.maxTriggers).toBeGreaterThan(0);
    }
  });

  it("effects respect the bounded vocabulary", () => {
    for (const event of eventCatalog) {
      for (const option of event.options) {
        for (const effect of option.effects) {
          if (effect.type === "ATTRIBUTE") expect(Math.abs(effect.delta)).toBeLessThanOrEqual(3);
          if (effect.type === "CONDITION") expect(Math.abs(effect.delta)).toBeLessThanOrEqual(12);
          if (effect.type === "REPUTATION") expect(Math.abs(effect.delta)).toBeLessThanOrEqual(8);
          if (effect.type === "MARKET_VALUE_PERCENT") expect(Math.abs(effect.percent)).toBeLessThanOrEqual(20);
        }
      }
    }
  });
});

describe("eligibleEvents", () => {
  it("filters by age, position, and tags", () => {
    const state = makeState({ player: makePlayer({ age: 17, position: "forward" }) });
    const eligible = eligibleEvents(state);
    const hasForwardOnly = eligible.some((event) => event.positions?.includes("forward"));
    const hasLateAge = eligible.some((event) => (event.minAge ?? 0) > 17);
    expect(hasForwardOnly).toBe(true);
    expect(hasLateAge).toBe(false);
  });

  it("respects maxTriggers and cooldown", () => {
    const event = eventCatalog.find((entry) => entry.maxTriggers === 1)!;
    const state = makeState({
      eventHistory: [{ eventId: event.id, optionId: event.options[0]!.id, season: 1, age: 21 }],
    });
    const eligible = eligibleEvents(state);
    expect(eligible.some((entry) => entry.id === event.id)).toBe(false);
  });
});

describe("selectEvent", () => {
  it("returns NO_ELIGIBLE_EVENT when nothing is eligible", () => {
    const allTriggered = eventCatalog.flatMap((event) =>
      Array.from({ length: event.maxTriggers }, (_, index) => ({
        eventId: event.id,
        optionId: event.options[0]!.id,
        season: 1 + index,
        age: 21,
      })),
    );
    const state = makeState({ eventHistory: allTriggered });
    const result = selectEvent(state);
    expect(result.ok).toBe(false);
    if (!result.ok) expect(result.error.code).toBe("NO_ELIGIBLE_EVENT");
  });

  it("selects deterministically from the same RNG state", () => {
    const state = makeState();
    const first = selectEvent(state);
    const second = selectEvent(state);
    expect(first).toEqual(second);
  });
});

describe("applyEventChoice", () => {
  it("applies effects and records history", () => {
    const event = eventCatalog[0]!;
    const option = event.options[0]!;
    const state = makeState();
    const result = applyEventChoice(state, event.id, option.id);
    expect(result.ok).toBe(true);
    if (result.ok) {
      expect(result.value.eventHistory).toHaveLength(1);
      expect(result.value.eventHistory[0]?.eventId).toBe(event.id);
    }
  });

  it("rejects invalid event or option without changing state", () => {
    const state = makeState();
    const badEvent = applyEventChoice(state, "not-an-event" as never, "x");
    expect(badEvent.ok).toBe(false);
    const goodEvent = eventCatalog[0]!;
    const badOption = applyEventChoice(state, goodEvent.id, "not-an-option");
    expect(badOption.ok).toBe(false);
  });
});
