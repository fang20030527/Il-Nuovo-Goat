import type { CareerEvent, EventEffect } from "../types";
import { eventId } from "@/game/domain/ids";

const evt = (
  id: string,
  title: string,
  body: string,
  options: { id: string; label: string; effects: readonly EventEffect[] }[],
  extra: Partial<CareerEvent> = {},
): CareerEvent => ({
  id: eventId(id),
  category: "recovery",
  title,
  body,
  cooldownSeasons: 0,
  maxTriggers: 2,
  weight: 1,
  options,
  ...extra,
});

export const recoveryEvents: readonly CareerEvent[] = [
  evt("recovery-tight-hamstring", "Tight Hamstring", "You feel a familiar tug in your left hamstring during the warm-down. It's not painful yet, but it's there.", [
    { id: "rest", label: "Rest immediately", effects: [{ type: "CONDITION", field: "fitness", delta: 10 }, { type: "CONDITION", field: "form", delta: -3 }] },
    { id: "play-through", label: "Play through it", effects: [{ type: "INJURY_RISK", matches: 3, multiplier: 2 }, { type: "CONDITION", field: "coachTrust", delta: 4 }] },
  ], { excludedTags: ["injury-free-season"] }),
  evt("recovery-cold-morning", "Cold Morning Session", "The training pitch is frozen. Your breath hangs in the air and your muscles refuse to wake up.", [
    { id: "extra-warmup", label: "Extra warm-up", effects: [{ type: "CONDITION", field: "fitness", delta: 5 }, { type: "ATTRIBUTE", attribute: "physical", delta: 1 }] },
    { id: "rush", label: "Rush to start", effects: [{ type: "INJURY_RISK", matches: 2, multiplier: 1.4 }, { type: "CONDITION", field: "coachTrust", delta: 2 }] },
  ]),
  evt("recovery-return-ahead", "Return Ahead of Schedule", "The medical team says you could be back a week early. The coach is eager. Your body is less certain.", [
    { id: "return", label: "Come back early", effects: [{ type: "CONDITION", field: "coachTrust", delta: 6 }, { type: "INJURY_RISK", matches: 4, multiplier: 1.8 }] },
    { id: "wait", label: "Wait for full clearance", effects: [{ type: "CONDITION", field: "fitness", delta: 6 }, { type: "CONDITION", field: "coachTrust", delta: -3 }] },
  ], { requiredTags: ["injured"] }),
  evt("recovery-specialist", "Specialist Consultation", "A renowned sports physician has reviewed your scan. She has opinions.", [
    { id: "follow", label: "Follow her plan", effects: [{ type: "CONDITION", field: "fitness", delta: 12 }, { type: "MARKET_VALUE_PERCENT", percent: -5 }] },
    { id: "second-opinion", label: "Seek a second opinion", effects: [{ type: "CONDITION", field: "morale", delta: -4 }, { type: "CONDITION", field: "fitness", delta: -2 }] },
  ]),
  evt("recovery-confidence", "Confidence After Injury", "The first full-contact session back. Your body remembers, but your mind hesitates.", [
    { id: "commit", label: "Commit to every challenge", effects: [{ type: "CONDITION", field: "morale", delta: 5 }, { type: "CONDITION", field: "form", delta: 3 }] },
    { id: "hesitate", label: "Protect yourself", effects: [{ type: "CONDITION", field: "form", delta: -4 }, { type: "CONDITION", field: "coachTrust", delta: -2 }] },
  ], { requiredTags: ["injured"] }),
  evt("recovery-protected", "Protected Training", "The coach has you in a yellow bib—no contact allowed. It feels like being wrapped in cotton wool.", [
    { id: "accept", label: "Accept the protection", effects: [{ type: "CONDITION", field: "fitness", delta: 8 }, { type: "CONDITION", field: "morale", delta: -2 }] },
    { id: "remove-bib", label: "Take the bib off", effects: [{ type: "CONDITION", field: "coachTrust", delta: 3 }, { type: "INJURY_RISK", matches: 2, multiplier: 1.6 }] },
  ], { requiredTags: ["injured"] }),
  evt("recovery-final-test", "Final Fitness Test", "The beep test stands between you and the squad sheet. Your heart is already pounding.", [
    { id: "give-everything", label: "Give everything", effects: [{ type: "CONDITION", field: "fitness", delta: 6 }, { type: "CONDITION", field: "coachTrust", delta: 5 }, { type: "INJURY_RISK", matches: 1, multiplier: 1.2 }] },
    { id: "pace", label: "Pace yourself", effects: [{ type: "CONDITION", field: "fitness", delta: 4 }, { type: "CONDITION", field: "coachTrust", delta: 1 }] },
  ]),
];
