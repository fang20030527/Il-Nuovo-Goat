import type { GameMode, TrainingFocus, CareerIntent } from "./career";

export type GameCommand =
  | { type: "START_SEASON"; mode: GameMode; training: TrainingFocus; intent: CareerIntent }
  | { type: "ADVANCE_CLASSIC" }
  | { type: "START_NEXT_MATCH" }
  | { type: "CHOOSE_MOMENT"; optionId: string }
  | { type: "ACKNOWLEDGE_MATCH" }
  | { type: "CHOOSE_EVENT"; optionId: string }
  | { type: "CHOOSE_TRANSFER"; offerId: string | "stay" | "seek" }
  | { type: "START_NEXT_SEASON" };
