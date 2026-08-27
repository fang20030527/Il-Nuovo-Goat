import { describe, expect, it } from "vitest";
import { clubId, countryId, leagueId } from "@/game/domain/ids";
import { emptySeasonStats } from "@/game/domain/player";

describe("domain contracts", () => {
  it("creates stable branded IDs without changing their wire value", () => {
    expect(clubId("northland-aster-vale")).toBe("northland-aster-vale");
    expect(countryId("northland")).toBe("northland");
    expect(leagueId("northland-1")).toBe("northland-1");
  });

  it("creates independent zeroed season statistics", () => {
    const stats = emptySeasonStats();
    expect(stats).toEqual({
      appearances: 0, starts: 0, minutes: 0, goals: 0, assists: 0,
      cleanSheets: 0, saves: 0, yellowCards: 0, redCards: 0,
      defensiveActions: 0, chancesCreated: 0, goalsPrevented: 0,
      ratingTotal: 0, ratedMatches: 0,
    });
  });
});
