import type { CountryId, LeagueId, ClubId } from "./ids";

export type PositionFamily = "goalkeeper" | "defender" | "midfielder" | "forward";
export type ClubStyle = "balanced" | "pressing" | "counter" | "possession" | "direct";

export interface Country {
  readonly id: CountryId;
  readonly name: string;
  readonly nationalTeamStrength: number;
}
export interface League {
  readonly id: LeagueId;
  readonly countryId: CountryId;
  readonly name: string;
  readonly level: 1 | 2;
}
export interface Club {
  readonly id: ClubId;
  readonly name: string;
  readonly countryId: CountryId;
  readonly leagueId: LeagueId;
  readonly reputation: number;
  readonly finances: number;
  readonly academy: number;
  readonly facilities: number;
  readonly lines: Readonly<Record<PositionFamily, number>>;
  readonly style: ClubStyle;
  readonly homeAdvantage: number;
}
export interface World {
  readonly schemaVersion: 1;
  readonly countries: readonly Country[];
  readonly leagues: readonly League[];
  readonly clubs: readonly Club[];
}
