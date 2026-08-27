/**
 * Three-slot local save storage backed by IndexedDB. Every commit runs in a
 * single read-write transaction and demotes the previously committed state to
 * the slot's backup so one bad write can always be rolled back by hand.
 *
 * `committedAt` is supplied by the caller; persistence never reads the system
 * clock on behalf of the engine, keeping simulated time deterministic.
 */
import { openDB, type DBSchema, type IDBPDatabase } from "idb";
import type { CareerState } from "@/game/domain/career";
import type { World } from "@/game/domain/world";

export type CareerSlot = 1 | 2 | 3;

export interface SlotRecord {
  readonly slot: CareerSlot;
  readonly state: CareerState;
  readonly backup: CareerState | null;
  readonly committedAt: string;
}

export interface SlotSummary {
  readonly slot: CareerSlot;
  readonly committedAt: string;
  readonly season: number;
  readonly age: number;
  readonly overall: number;
  readonly retired: boolean;
}

interface CareerDatabase extends DBSchema {
  careers: { key: CareerSlot; value: SlotRecord };
  settings: { key: "active-world"; value: { key: "active-world"; world: World } };
}

const DATABASE_NAME = "open-pitch-legacy";
const DATABASE_VERSION = 1;

let cached: IDBPDatabase<CareerDatabase> | null = null;

const getDatabase = (): Promise<IDBPDatabase<CareerDatabase>> => {
  if (!cached) {
    cached = null;
    return openDB<CareerDatabase>(DATABASE_NAME, DATABASE_VERSION, {
      upgrade(database) {
        database.createObjectStore("careers", { keyPath: "slot" });
        database.createObjectStore("settings", { keyPath: "key" });
      },
    }).then((db) => {
      cached = db;
      return db;
    });
  }
  return Promise.resolve(cached);
};

/** Test hook: drop the cached connection so fake-indexeddb state resets apply. */
export const __resetDatabaseForTests = (): void => {
  if (cached) {
    cached.close();
    cached = null;
  }
};

export const listSlots = async (): Promise<readonly SlotSummary[]> => {
  const db = await getDatabase();
  const records = await db.getAll("careers");
  return records
    .sort((a, b) => a.slot - b.slot)
    .map((record) => ({
      slot: record.slot,
      committedAt: record.committedAt,
      season: record.state.season.season,
      age: record.state.player.age,
      overall: record.state.player.overall,
      retired: record.state.phase === "retired",
    }));
};

export const loadSlot = async (slot: CareerSlot): Promise<SlotRecord | null> => {
  const db = await getDatabase();
  const record = await db.get("careers", slot);
  return record ?? null;
};

/**
 * Atomically replaces the slot's live state with `nextState` while moving the
 * previous live state into `backup`. Runs inside one read-write transaction so
 * a crash mid-commit can never leave a half-written slot.
 */
export const commitSlot = async (
  slot: CareerSlot,
  nextState: CareerState,
  committedAt: string,
): Promise<void> => {
  const db = await getDatabase();
  const tx = db.transaction("careers", "readwrite");
  const existing = await tx.store.get(slot);
  await tx.store.put(
    {
      slot,
      state: nextState,
      backup: existing ? existing.state : null,
      committedAt,
    } satisfies SlotRecord,
  );
  await tx.done;
};

export const deleteSlot = async (slot: CareerSlot): Promise<void> => {
  const db = await getDatabase();
  await db.delete("careers", slot);
};

/**
 * Promotes the slot's backup to the live state. The displaced live state
 * becomes the new backup so a mistaken restore is itself reversible once.
 * Returns false when the slot has no backup to restore.
 */
export const restoreSlotBackup = async (slot: CareerSlot): Promise<boolean> => {
  const db = await getDatabase();
  const tx = db.transaction("careers", "readwrite");
  const existing = await tx.store.get(slot);
  if (!existing || existing.backup === null) {
    await tx.done;
    return false;
  }
  await tx.store.put(
    { ...existing, state: existing.backup, backup: existing.state },
  );
  await tx.done;
  return true;
};

export const loadActiveWorld = async (): Promise<World | null> => {
  const db = await getDatabase();
  const record = await db.get("settings", "active-world");
  return record?.world ?? null;
};

export const saveActiveWorld = async (world: World): Promise<void> => {
  const db = await getDatabase();
  await db.put("settings", { key: "active-world", world });
};
