import type { World } from "@/game/domain/world";
import { worldSchema } from "./schema";

export interface WorldPreview {
  readonly countryCount: number;
  readonly leagueCount: number;
  readonly clubCount: number;
}

export interface WorldImportIssue {
  readonly path: string;
  readonly message: string;
}

export type WorldImportResult =
  | { ok: true; world: World; preview: WorldPreview }
  | { ok: false; issues: readonly WorldImportIssue[] };

export const previewWorld = (world: World): WorldPreview => ({
  countryCount: world.countries.length,
  leagueCount: world.leagues.length,
  clubCount: world.clubs.length,
});

export const parseWorldJson = (text: string): WorldImportResult => {
  let raw: unknown;
  try {
    raw = JSON.parse(text);
  } catch {
    return { ok: false, issues: [{ path: "$", message: "File is not valid JSON" }] };
  }
  const parsed = worldSchema.safeParse(raw);
  if (!parsed.success) {
    return {
      ok: false,
      issues: parsed.error.issues.map((issue) => ({
        path: issue.path.length > 0 ? issue.path.join(".") : "$",
        message: issue.message,
      })),
    };
  }
  const world = parsed.data as unknown as World;
  return { ok: true, world, preview: previewWorld(world) };
};
