import "fake-indexeddb/auto";
import { describe, expect, it } from "vitest";
import {
  exportCareer,
  exportWorld,
  importCareer,
  importWorldEnvelope,
} from "@/persistence/json-transfer";
import { __resetDatabaseForTests, listSlots } from "@/persistence/career-db";
import { emptySeasonStats, type Player } from "@/game/domain/player";
import type { CareerState } from "@/game/domain/career";
import { clubId } from "@/game/domain/ids";
import { seedRng } from "@/game/engine/rng";
import { createDefaultWorld } from "@/game/world/default-world";

const makePlayer = (): Player => ({
  id: "player-1",
  name: "Transfer Player",
  nationality: "northland" as Player["nationality"],
  position: "forward",
  preferredFoot: "left",
  shirtNumber: 9,
  age: 19,
  attributes: { technique: 76, awareness: 74, physical: 72, mentality: 70 },
  overall: 76,
  potential: 88,
  fitness: 85,
  form: 65,
  morale: 70,
  coachTrust: 72,
  reputation: 66,
  marketValue: 12_000_000,
  clubId: clubId("northland-aster-vale"),
  contract: {
    clubId: clubId("northland-aster-vale"),
    startSeason: 2,
    endSeason: 6,
    weeklyWage: 30_000,
    appearanceBonus: 1_500,
    titleBonus: 8_000,
    role: "starter",
    parentClubId: null,
  },
  injury: null,
  currentSeasonStats: emptySeasonStats(),
  careerStats: emptySeasonStats(),
  nationalTeam: { selected: true, caps: 4, goals: 1 },
  tags: ["professional"],
});

const makeCareer = (): CareerState => ({
  saveSchemaVersion: 1,
  rulesVersion: "1.0.0",
  rng: seedRng("transfer"),
  phase: "detailed-prematch",
  mode: "detailed",
  difficulty: "balanced",
  trainingFocus: "technique",
  careerIntent: "chase-honours",
  world: createDefaultWorld(),
  player: makePlayer(),
  season: {
    season: 2,
    status: "active",
    completedClubFixtures: 3,
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
});

describe("career JSON transfer", () => {
  it("round-trips a career export exactly", () => {
    const career = makeCareer();
    const text = exportCareer(career, "2026-08-28T00:00:00.000Z");
    const result = importCareer(text);
    expect(result.ok).toBe(true);
    if (result.ok) {
      expect(result.state).toEqual(career);
    }
  });

  it("rejects a world envelope imported as a career", () => {
    const worldText = exportWorld(createDefaultWorld(), "2026-08-28T00:00:00.000Z");
    const result = importCareer(worldText);
    expect(result.ok).toBe(false);
    if (!result.ok) {
      expect(result.issues[0]?.path).toBe("kind");
    }
  });

  it("rejects invalid JSON with parse feedback", () => {
    const result = importCareer("{ not json");
    expect(result.ok).toBe(false);
    if (!result.ok) {
      expect(result.issues[0]?.message).toContain("not valid JSON");
    }
  });

  it("rejects an unsupported save schema version at the root", () => {
    const envelope = JSON.parse(exportCareer(makeCareer(), "t"));
    envelope.saveSchemaVersion = 2;
    envelope.state.saveSchemaVersion = 2;
    const result = importCareer(JSON.stringify(envelope));
    expect(result.ok).toBe(false);
    if (!result.ok) {
      expect(result.issues.some((issue) => issue.path.includes("saveSchemaVersion"))).toBe(true);
    }
  });

  it("rejects an unsupported rules major version at the root", () => {
    const envelope = JSON.parse(exportCareer(makeCareer(), "t"));
    envelope.state.rulesVersion = "2.0.0";
    const result = importCareer(JSON.stringify(envelope));
    expect(result.ok).toBe(false);
    if (!result.ok) {
      expect(result.issues.some((issue) => issue.path.includes("rulesVersion"))).toBe(true);
    }
  });

  it("rejects a career whose player club is missing from the embedded world", () => {
    const envelope = JSON.parse(exportCareer(makeCareer(), "t"));
    envelope.state.player.clubId = "ghost-club";
    const result = importCareer(JSON.stringify(envelope));
    expect(result.ok).toBe(false);
    if (!result.ok) {
      expect(result.issues.some((issue) => issue.path.startsWith("state.player.clubId"))).toBe(true);
    }
  });

  it("never writes to IndexedDB when an import fails", async () => {
    __resetDatabaseForTests();
    expect(importCareer("garbage").ok).toBe(false);
    expect(await listSlots()).toHaveLength(0);
  });
});

describe("world JSON transfer", () => {
  it("round-trips a world export exactly", () => {
    const world = createDefaultWorld();
    const text = exportWorld(world, "2026-08-28T00:00:00.000Z");
    const result = importWorldEnvelope(text);
    expect(result.ok).toBe(true);
    if (result.ok) {
      expect(result.world).toEqual(world);
    }
  });

  it("rejects a career envelope imported as a world", () => {
    const careerText = exportCareer(makeCareer(), "2026-08-28T00:00:00.000Z");
    const result = importWorldEnvelope(careerText);
    expect(result.ok).toBe(false);
  });
});
