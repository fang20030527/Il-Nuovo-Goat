import { describe, expect, it } from "vitest";
import { createDefaultWorld } from "@/game/world/default-world";
import { parseWorldJson, previewWorld } from "@/game/world/import-world";

describe("world import", () => {
  it("reports a field path and never returns a partial world", () => {
    const invalid = JSON.stringify({ ...createDefaultWorld(), clubs: [] });
    const result = parseWorldJson(invalid);
    expect(result.ok).toBe(false);
    if (!result.ok) expect(result.issues[0]?.path).toContain("clubs");
  });

  it("returns a count preview for valid JSON", () => {
    const result = parseWorldJson(JSON.stringify(createDefaultWorld()));
    expect(result).toMatchObject({
      ok: true,
      preview: { countryCount: 4, leagueCount: 8, clubCount: 80 },
    });
  });

  it("rejects invalid JSON text", () => {
    expect(parseWorldJson("{not json").ok).toBe(false);
  });

  it("rejects duplicate club ids", () => {
    const world = createDefaultWorld();
    const duplicated = { ...world, clubs: [world.clubs[0]!, world.clubs[0]!, ...world.clubs.slice(2)] };
    const result = parseWorldJson(JSON.stringify(duplicated));
    expect(result.ok).toBe(false);
  });

  it("previews a world directly", () => {
    expect(previewWorld(createDefaultWorld())).toEqual({
      countryCount: 4, leagueCount: 8, clubCount: 80,
    });
  });
});
