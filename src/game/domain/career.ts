import type { ClubId, EventId, FixtureId, LeagueId } from "./ids";
import type { CompetitionKind, Fixture, LeagueTableRow, MatchResult, ActiveMoment } from "./competition";
import type { Player, SeasonStats, TransferOffer } from "./player";
import type { PositionFamily, World } from "./world";
import type { GameCommand } from "./commands";

export type GameMode = "classic" | "detailed";
export type CareerPhase =
  | "preseason" | "classic-checkpoint" | "detailed-prematch"
  | "detailed-moment" | "detailed-postmatch" | "season-review"
  | "transfer-window" | "retired";
export type TrainingFocus = "technique" | "awareness" | "physical" | "mentality";
export type CareerIntent = "earn-start" | "steady-growth" | "chase-honours" | "seek-transfer";
export type Difficulty = "story" | "balanced" | "hard";

export interface Honour {
  readonly id: string; readonly label: string; readonly kind: CompetitionKind;
  readonly contributionMinutes: number; readonly availableMinutes: number;
}
export interface IndividualAward {
  readonly id: string; readonly label: string;
  readonly scope: "club" | "league" | "continental" | "national-team" | "world";
}
export interface CareerArchive {
  readonly season: number; readonly age: number; readonly clubId: ClubId;
  readonly stats: SeasonStats; readonly overall: number; readonly marketValue: number;
  readonly competitionStats: readonly {
    readonly competitionId: string; readonly kind: CompetitionKind;
    readonly availableMinutes: number; readonly stats: SeasonStats;
  }[];
  readonly honours: readonly Honour[]; readonly awards: readonly IndividualAward[];
}
export interface SeasonState {
  readonly season: number; readonly status: "not-started" | "active" | "complete";
  readonly completedClubFixtures: number; readonly fixtures: readonly Fixture[];
  readonly results: readonly MatchResult[];
  readonly leagueTables: readonly { readonly leagueId: LeagueId; readonly rows: readonly LeagueTableRow[] }[];
  readonly domesticCupWinners: readonly ClubId[]; readonly continentalCupWinner: ClubId | null;
  readonly nationalTeamResult: {
    readonly selected: boolean; readonly appearances: number; readonly goals: number;
    readonly tournamentFinish: "not-held" | "group" | "runner-up" | "champion";
  };
  readonly pendingFixtureId: FixtureId | null;
}
export interface RngState { readonly seed: number; readonly cursor: number }
export interface CareerState {
  readonly saveSchemaVersion: 1; readonly rulesVersion: string; readonly rng: RngState;
  readonly phase: CareerPhase; readonly mode: GameMode; readonly difficulty: Difficulty;
  readonly trainingFocus: TrainingFocus; readonly careerIntent: CareerIntent; readonly world: World;
  readonly player: Player; readonly season: SeasonState; readonly archives: readonly CareerArchive[];
  readonly activeMoment: ActiveMoment | null; readonly activeEventId: EventId | null;
  readonly eventHistory: readonly { eventId: EventId; optionId: string; season: number; age: number }[];
  readonly careerHistory: readonly { type: string; season: number; age: number; summary: string }[];
  readonly commandHistory: readonly { index: number; command: GameCommand }[];
  readonly transferOffers: readonly TransferOffer[];
}

export type { PositionFamily };
