import type { ClubId, FixtureId, LeagueId } from "./ids";
import type { SeasonStats } from "./player";

export type CompetitionKind = "league" | "domestic-cup" | "continental" | "national-team";

export interface Fixture {
  readonly id: FixtureId; readonly competitionId: string; readonly kind: CompetitionKind;
  readonly season: number; readonly round: number; readonly homeClubId: ClubId;
  readonly awayClubId: ClubId; readonly status: "scheduled" | "in-progress" | "complete";
}
export interface PlayerMatchPerformance extends SeasonStats { readonly rating: number; readonly minutes: number }
export interface MatchResult {
  readonly fixtureId: FixtureId; readonly homeClubId: ClubId; readonly awayClubId: ClubId;
  readonly homeGoals: number; readonly awayGoals: number;
  readonly playerPerformance: PlayerMatchPerformance | null;
  readonly timeline: readonly string[];
}
export interface LeagueTableRow {
  readonly clubId: ClubId; readonly played: number; readonly won: number;
  readonly drawn: number; readonly lost: number; readonly goalsFor: number;
  readonly goalsAgainst: number; readonly points: number;
}
export interface ActiveMoment {
  readonly fixtureId: FixtureId; readonly minute: number; readonly score: readonly [number, number];
  readonly prompt: string;
  readonly options: readonly { id: string; label: string; risk: "low" | "medium" | "high" }[];
}
