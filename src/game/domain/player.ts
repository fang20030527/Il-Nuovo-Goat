import type { ClubId, CountryId } from "./ids";
import type { PositionFamily } from "./world";

export interface PlayerAttributes {
  readonly technique: number;
  readonly awareness: number;
  readonly physical: number;
  readonly mentality: number;
}
export interface SeasonStats {
  readonly appearances: number; readonly starts: number; readonly minutes: number;
  readonly goals: number; readonly assists: number; readonly cleanSheets: number;
  readonly saves: number; readonly yellowCards: number; readonly redCards: number;
  readonly defensiveActions: number; readonly chancesCreated: number; readonly goalsPrevented: number;
  readonly ratingTotal: number; readonly ratedMatches: number;
}
export interface Contract {
  readonly clubId: ClubId; readonly startSeason: number; readonly endSeason: number;
  readonly weeklyWage: number; readonly appearanceBonus: number; readonly titleBonus: number;
  readonly role: "prospect" | "rotation" | "starter" | "star";
  readonly parentClubId: ClubId | null;
}
export interface TransferOffer {
  readonly id: string; readonly clubId: ClubId; readonly financialFit: number;
  readonly contract: Contract; readonly marketValue: number;
}
export interface Injury {
  readonly id: string;
  readonly severity: "knock" | "strain" | "fracture" | "major";
  readonly remainingMatches: number;
  readonly potentialDeltaOnRecovery: number;
  readonly physicalDeltaOnRecovery: number;
}
export interface Player {
  readonly id: string; readonly name: string; readonly nationality: CountryId;
  readonly position: PositionFamily; readonly preferredFoot: "left" | "right";
  readonly shirtNumber: number; readonly age: number; readonly attributes: PlayerAttributes;
  readonly overall: number; readonly potential: number; readonly fitness: number;
  readonly form: number; readonly morale: number; readonly coachTrust: number;
  readonly reputation: number; readonly marketValue: number; readonly clubId: ClubId;
  readonly contract: Contract; readonly injury: Injury | null;
  readonly currentSeasonStats: SeasonStats; readonly careerStats: SeasonStats;
  readonly nationalTeam: { readonly selected: boolean; readonly caps: number; readonly goals: number };
  readonly tags: readonly string[];
}
export const emptySeasonStats = (): SeasonStats => ({
  appearances: 0, starts: 0, minutes: 0, goals: 0, assists: 0,
  cleanSheets: 0, saves: 0, yellowCards: 0, redCards: 0,
  defensiveActions: 0, chancesCreated: 0, goalsPrevented: 0,
  ratingTotal: 0, ratedMatches: 0,
});
