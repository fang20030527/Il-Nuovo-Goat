"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import type { CareerState } from "@/game/domain/career";
import type { GameCommand } from "@/game/domain/commands";
import { dispatchCommand } from "@/game/application/dispatch-command";
import {
  commitSlot,
  loadSlot,
  restoreSlotBackup,
  type CareerSlot,
} from "@/persistence/career-db";
import { exportCareer } from "@/persistence/json-transfer";

/**
 * Applies a domain command, then persists, then publishes. Persistence runs
 * before the caller ever sees the new state, so a rejected write leaves the
 * UI on the previous committed state instead of showing phantom progress.
 */
export const applyAndCommit = async (
  current: CareerState,
  command: GameCommand,
  persist: (next: CareerState) => Promise<void>,
): Promise<CareerState> => {
  const result = dispatchCommand(current, command);
  if (!result.ok) {
    throw new Error(result.error.message);
  }
  await persist(result.value);
  return result.value;
};

export type CareerSlotStatus = "loading" | "empty" | "ready" | "error";

export interface CareerSlotController {
  readonly state: CareerState | null;
  readonly status: CareerSlotStatus;
  readonly error: string | null;
  readonly pending: boolean;
  readonly hasBackup: boolean;
  readonly dispatch: (command: GameCommand) => Promise<void>;
  readonly restoreBackup: () => Promise<boolean>;
  readonly exportSave: () => string | null;
}

/**
 * Coordinates one career slot for the UI. Commands are serialized through a
 * single promise chain so two rapid clicks can never interleave engine
 * transitions, and `setState` only fires after IndexedDB has committed.
 */
export const useCareerSlot = (slot: CareerSlot): CareerSlotController => {
  const [state, setState] = useState<CareerState | null>(null);
  const [status, setStatus] = useState<CareerSlotStatus>("loading");
  const [error, setError] = useState<string | null>(null);
  const [pending, setPending] = useState(false);
  const [hasBackup, setHasBackup] = useState(false);
  const chainRef = useRef<Promise<void>>(Promise.resolve());
  const stateRef = useRef<CareerState | null>(null);

  useEffect(() => {
    stateRef.current = state;
  }, [state]);

  useEffect(() => {
    let cancelled = false;
    queueMicrotask(() => setStatus("loading"));
    loadSlot(slot)
      .then((record) => {
        if (cancelled) return;
        if (record) {
          setState(record.state);
          setHasBackup(record.backup !== null);
          setStatus("ready");
        } else {
          setState(null);
          setHasBackup(false);
          setStatus("empty");
        }
      })
      .catch((cause: unknown) => {
        if (cancelled) return;
        setError(cause instanceof Error ? cause.message : "Failed to load save");
        setStatus("error");
      });
    return () => {
      cancelled = true;
    };
  }, [slot]);

  const dispatch = useCallback(
    async (command: GameCommand): Promise<void> => {
      const current = stateRef.current;
      if (!current) {
        throw new Error("No career loaded in this slot");
      }
      const job = chainRef.current.then(async () => {
        setPending(true);
        try {
          const next = await applyAndCommit(current, command, (nextState) =>
            commitSlot(slot, nextState, new Date().toISOString()),
          );
          setState(next);
          setHasBackup(true);
          setError(null);
        } finally {
          setPending(false);
        }
      });
      chainRef.current = job.catch(() => undefined);
      return job;
    },
    [slot],
  );

  const restoreBackup = useCallback(async (): Promise<boolean> => {
    const restored = await restoreSlotBackup(slot);
    if (restored) {
      const record = await loadSlot(slot);
      if (record) {
        setState(record.state);
        setHasBackup(record.backup !== null);
      }
    }
    return restored;
  }, [slot]);

  const exportSave = useCallback((): string | null => {
    const current = stateRef.current;
    if (!current) return null;
    return exportCareer(current, new Date().toISOString());
  }, []);

  return { state, status, error, pending, hasBackup, dispatch, restoreBackup, exportSave };
};
