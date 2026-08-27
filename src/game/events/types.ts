import type { PlayerAttributes } from "@/game/domain/player";
import type { PositionFamily } from "@/game/domain/world";
import type { EventId } from "@/game/domain/ids";

export type EventCategory =
  | "training" | "recovery" | "coach" | "teammates" | "media"
  | "family" | "agent" | "national-team" | "contracts" | "milestones";

export type EventEffect =
  | { type: "ATTRIBUTE"; attribute: keyof PlayerAttributes; delta: number }
  | { type: "CONDITION"; field: "fitness" | "form" | "morale" | "coachTrust"; delta: number }
  | { type: "REPUTATION"; delta: number }
  | { type: "MARKET_VALUE_PERCENT"; percent: number }
  | { type: "INJURY_RISK"; matches: number; multiplier: number }
  | { type: "TAG"; tag: string }
  | { type: "TRANSFER_INTENT"; value: boolean };

export interface EventOption {
  readonly id: string;
  readonly label: string;
  readonly effects: readonly EventEffect[];
}

export interface CareerEvent {
  readonly id: EventId;
  readonly category: EventCategory;
  readonly title: string;
  readonly body: string;
  readonly positions?: readonly PositionFamily[];
  readonly minAge?: number;
  readonly maxAge?: number;
  readonly requiredTags?: readonly string[];
  readonly excludedTags?: readonly string[];
  readonly cooldownSeasons: number;
  readonly maxTriggers: number;
  readonly weight: number;
  readonly options: readonly EventOption[];
}
