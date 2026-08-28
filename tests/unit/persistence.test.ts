import "fake-indexeddb/auto";
import { beforeEach, describe, expect, it } from "vitest";
import {
  __resetDatabaseForTests,
  commitSlot,
  deleteSlot,
  listSlots,
  loadActiveWorld,
  loadSlot,
  restoreSlotBackup,
  saveActiveWorld,
} from "@/persistence/career-db";
import { emptySeasonStats, type Player } from "@/game/domain/player";
import type { CareerState } from "@/game/domain/career";
import { clubId } from "@/game/domain/ids";
import { seedRng } from "@/game/engine/rng";
import { createDefaultWorld } from "@/game/world/default-world";

const makePlayer = (age: number): Player => ({
  id: "player-1",
  name: "Persisted Player",
  nationality: "italy" as Player["nationality"],
  position: "midfielder",
  preferredFoot: "right",
  shirtNumber: 8,
  age,
  attributes: { technique: 70, awareness: 72, physical: 68, mentality: 71 },
  overall: 74,
  potential: 85,
  fitness: 80,
  form: 60,
  morale: 65,
  coachTrust: 70,
  reputation: 60,
  marketValue: 8_000_000,
  clubId: clubId("italy-torino"),
  contract: {
    clubId: clubId("italy-torino"),
    startSeason: 1,
    endSeason: 4,
    weeklyWage: 20_000,
    appearanceBonus: 1_000,
    titleBonus: 5_000,
    role: "starter",
    parentClubId: null,
  },
  injury: null,
  currentSeasonStats: emptySeasonStats(),
  careerStats: emptySeasonStats(),
  nationalTeam: { selected: false, caps: 0, goals: 0 },
  tags: [],
});

const careerState = ({ age }: { age: number }): CareerState => ({
  saveSchemaVersion: 1,
  rulesVersion: "1.0.0",
  rng: seedRng("persist"),
  phase: "preseason",
  mode: "classic",
  difficulty: "balanced",
  trainingFocus: "technique",
  careerIntent: "steady-growth",
  world: createDefaultWorld(),
  player: makePlayer(age),
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
});

beforeEach(async () => {
  __resetDatabaseForTests();
  const { deleteDB } = await import("idb");
  await deleteDB("open-pitch-legacy");
  __resetDatabaseForTests();
});

describe("career slots", () => {
  it("stores three independent slots and preserves the prior state as backup", async () => {
    await commitSlot(1, careerState({ age: 16 }), "2026-08-27T01:00:00.000Z");
    await commitSlot(1, careerState({ age: 17 }), "2026-08-27T02:00:00.000Z");
    await commitSlot(2, careerState({ age: 20 }), "2026-08-27T03:00:00.000Z");
    expect((await loadSlot(1))?.state.player.age).toBe(17);
    expect((await loadSlot(1))?.backup?.player.age).toBe(16);
    expect((await loadSlot(2))?.state.player.age).toBe(20);
    expect(await loadSlot(3)).toBeNull();
  });

  it("commits atomically so the backup is the previous live state", async () => {
    await commitSlot(1, careerState({ age: 16 }), "t1");
    await commitSlot(1, careerState({ age: 17 }), "t2");
    await commitSlot(1, careerState({ age: 18 }), "t3");
    const record = await loadSlot(1);
    expect(record?.state.player.age).toBe(18);
    // Only the immediately previous state survives as the backup.
    expect(record?.backup?.player.age).toBe(17);
  });

  it("restores a backup and makes the restore itself reversible once", async () => {
    await commitSlot(1, careerState({ age: 16 }), "t1");
    await commitSlot(1, careerState({ age: 17 }), "t2");
    expect(await restoreSlotBackup(1)).toBe(true);
    expect((await loadSlot(1))?.state.player.age).toBe(16);
    expect((await loadSlot(1))?.backup?.player.age).toBe(17);
    expect(await restoreSlotBackup(1)).toBe(true);
    expect((await loadSlot(1))?.state.player.age).toBe(17);
  });

  it("returns false when restoring a slot with no backup", async () => {
    expect(await restoreSlotBackup(1)).toBe(false);
    await commitSlot(1, careerState({ age: 16 }), "t1");
    expect(await restoreSlotBackup(1)).toBe(false);
  });

  it("deletes a slot without touching the others", async () => {
    await commitSlot(1, careerState({ age: 16 }), "t1");
    await commitSlot(2, careerState({ age: 20 }), "t2");
    await deleteSlot(1);
    expect(await loadSlot(1)).toBeNull();
    expect((await loadSlot(2))?.state.player.age).toBe(20);
  });

  it("summarises slots for the load screen without exposing full state", async () => {
    await commitSlot(2, careerState({ age: 20 }), "2026-08-27T03:00:00.000Z");
    const summaries = await listSlots();
    expect(summaries).toHaveLength(1);
    expect(summaries[0]).toMatchObject({ slot: 2, season: 1, age: 20, retired: false });
  });

  it("persists the active custom world separately from career slots", async () => {
    expect(await loadActiveWorld()).toBeNull();
    const world = createDefaultWorld();
    await saveActiveWorld(world);
    expect(await loadActiveWorld()).toEqual(world);
  });
});
