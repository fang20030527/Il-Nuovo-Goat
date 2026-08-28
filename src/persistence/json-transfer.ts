/**
 * JSON envelopes for moving careers and custom worlds between browsers.
 * Import is pure: it validates and returns data, never touches IndexedDB.
 * The caller supplies `exportedAt` so exports stay deterministic.
 */
import type { CareerState } from "@/game/domain/career";
import type { World } from "@/game/domain/world";
import type { ZodError } from "zod";
import {
  careerExportEnvelopeSchema,
  worldExportEnvelopeSchema,
  SAVE_SCHEMA_VERSION,
} from "./save-schema";

export interface CareerExportEnvelope {
  readonly kind: "open-pitch-legacy-career";
  readonly exportedAt: string;
  readonly saveSchemaVersion: typeof SAVE_SCHEMA_VERSION;
  readonly state: CareerState;
}

export interface WorldExportEnvelope {
  readonly kind: "open-pitch-legacy-world";
  readonly exportedAt: string;
  readonly worldSchemaVersion: 1;
  readonly world: World;
}

export interface TransferIssue {
  readonly path: string;
  readonly message: string;
}

export type CareerImportResult =
  | { ok: true; state: CareerState }
  | { ok: false; issues: readonly TransferIssue[] };

export type WorldTransferImportResult =
  | { ok: true; world: World }
  | { ok: false; issues: readonly TransferIssue[] };

const toIssues = (error: ZodError): readonly TransferIssue[] =>
  error.issues.map((issue) => ({
    path: issue.path.length > 0 ? issue.path.map(String).join(".") : "$",
    message: issue.message,
  }));

const parseJson = (text: string): { ok: true; raw: unknown } | { ok: false; issues: readonly TransferIssue[] } => {
  try {
    return { ok: true, raw: JSON.parse(text) };
  } catch {
    return { ok: false, issues: [{ path: "$", message: "File is not valid JSON" }] };
  }
};

export const exportCareer = (state: CareerState, exportedAt: string): string =>
  JSON.stringify(
    {
      kind: "open-pitch-legacy-career",
      exportedAt,
      saveSchemaVersion: SAVE_SCHEMA_VERSION,
      state,
    } satisfies CareerExportEnvelope,
    null,
    2,
  );

export const exportWorld = (world: World, exportedAt: string): string =>
  JSON.stringify(
    {
      kind: "open-pitch-legacy-world",
      exportedAt,
      worldSchemaVersion: 1,
      world,
    } satisfies WorldExportEnvelope,
    null,
    2,
  );

export const importCareer = (text: string): CareerImportResult => {
  const parsed = parseJson(text);
  if (!parsed.ok) return parsed;
  const raw = parsed.raw as { kind?: unknown } | null;
  if (raw === null || typeof raw !== "object" || raw.kind !== "open-pitch-legacy-career") {
    return { ok: false, issues: [{ path: "kind", message: "File is not an Il Nuovo Goat career export" }] };
  }
  const result = careerExportEnvelopeSchema.safeParse(raw);
  if (!result.success) {
    return { ok: false, issues: toIssues(result.error) };
  }
  return { ok: true, state: result.data.state as unknown as CareerState };
};

export const importWorldEnvelope = (text: string): WorldTransferImportResult => {
  const parsed = parseJson(text);
  if (!parsed.ok) return parsed;
  const raw = parsed.raw as { kind?: unknown } | null;
  if (raw === null || typeof raw !== "object" || raw.kind !== "open-pitch-legacy-world") {
    return { ok: false, issues: [{ path: "kind", message: "File is not an Il Nuovo Goat world export" }] };
  }
  const result = worldExportEnvelopeSchema.safeParse(raw);
  if (!result.success) {
    return { ok: false, issues: toIssues(result.error) };
  }
  return { ok: true, world: result.data.world as unknown as World };
};
