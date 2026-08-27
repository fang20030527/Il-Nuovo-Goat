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
  category: "training",
  title,
  body,
  cooldownSeasons: 0,
  maxTriggers: 2,
  weight: 1,
  options,
  ...extra,
});

export const trainingEvents: readonly CareerEvent[] = [
  evt("training-extra-repetitions", "Extra Repetitions", "The training pitch is empty except for you and the floodlights. You can feel the rhythm in your feet. What do you work on?", [
    { id: "technique", label: "Technique drills", effects: [{ type: "ATTRIBUTE", attribute: "technique", delta: 2 }, { type: "CONDITION", field: "fitness", delta: -4 }] },
    { id: "physical", label: "Physical conditioning", effects: [{ type: "ATTRIBUTE", attribute: "physical", delta: 2 }, { type: "CONDITION", field: "fitness", delta: -6 }] },
    { id: "rest", label: "Call it a day", effects: [{ type: "CONDITION", field: "fitness", delta: 6 }, { type: "CONDITION", field: "morale", delta: 2 }] },
  ]),
  evt("training-new-position-drill", "New Position Drill", "The coach asks you to try an unfamiliar role in the small-sided game. It feels awkward but revealing.", [
    { id: "embrace", label: "Embrace the challenge", effects: [{ type: "ATTRIBUTE", attribute: "awareness", delta: 3 }, { type: "TAG", tag: "versatile" }] },
    { id: "focus", label: "Stay in your lane", effects: [{ type: "ATTRIBUTE", attribute: "technique", delta: 1 }, { type: "CONDITION", field: "morale", delta: 1 }] },
  ]),
  evt("training-weaker-foot-week", "Weaker Foot Week", "The academy director declares this week 'weak foot only' in training. Your strong foot is tied behind your back, metaphorically.", [
    { id: "commit", label: "Fully commit", effects: [{ type: "ATTRIBUTE", attribute: "technique", delta: 2 }, { type: "ATTRIBUTE", attribute: "awareness", delta: 1 }, { type: "CONDITION", field: "form", delta: -2 }] },
    { id: "cheat", label: "Cheat when possible", effects: [{ type: "CONDITION", field: "morale", delta: 2 }, { type: "CONDITION", field: "coachTrust", delta: -3 }] },
  ]),
  evt("training-recovery-or-work", "Recovery or Work", "Your legs are heavy from the last match. The schedule says active recovery, but you could push through a full session.", [
    { id: "recover", label: "Follow the plan", effects: [{ type: "CONDITION", field: "fitness", delta: 8 }, { type: "ATTRIBUTE", attribute: "physical", delta: -1 }] },
    { id: "push", label: "Push through", effects: [{ type: "ATTRIBUTE", attribute: "physical", delta: 2 }, { type: "INJURY_RISK", matches: 2, multiplier: 1.5 }] },
  ]),
  evt("training-video-study", "Video Study", "The analyst has clipped your last five appearances. Some patterns are flattering; others are not.", [
    { id: "deep-dive", label: "Study every frame", effects: [{ type: "ATTRIBUTE", attribute: "awareness", delta: 2 }, { type: "CONDITION", field: "morale", delta: -2 }] },
    { id: "highlights", label: "Watch highlights only", effects: [{ type: "CONDITION", field: "morale", delta: 3 }, { type: "ATTRIBUTE", attribute: "awareness", delta: -1 }] },
  ]),
  evt("training-sprint-block", "Sprint Block", "The fitness coach has laid out cones for a brutal sprint block. Your lungs are already protesting.", [
    { id: "full-send", label: "Give everything", effects: [{ type: "ATTRIBUTE", attribute: "physical", delta: 3 }, { type: "CONDITION", field: "fitness", delta: -8 }, { type: "INJURY_RISK", matches: 1, multiplier: 1.3 }] },
    { id: "moderate", label: "Moderate effort", effects: [{ type: "ATTRIBUTE", attribute: "physical", delta: 1 }, { type: "CONDITION", field: "fitness", delta: -2 }] },
  ]),
  evt("training-set-piece-duty", "Set-Piece Duty", "The set-piece coach is looking for a new taker. The ball sits on the training pitch, waiting.", [
    { id: "volunteer", label: "Volunteer", effects: [{ type: "ATTRIBUTE", attribute: "technique", delta: 2 }, { type: "TAG", tag: "set-piece-taker" }, { type: "CONDITION", field: "coachTrust", delta: 4 }] },
    { id: "decline", label: "Stay out of it", effects: [{ type: "CONDITION", field: "morale", delta: 1 }] },
  ], { positions: ["midfielder", "forward"] }),
  evt("training-academy-demonstration", "Academy Demonstration", "The under-16s are watching first-team training today. Their eyes are wide.", [
    { id: "showboat", label: "Put on a show", effects: [{ type: "REPUTATION", delta: 3 }, { type: "CONDITION", field: "morale", delta: 4 }] },
    { id: "mentor", label: "Offer advice", effects: [{ type: "REPUTATION", delta: 2 }, { type: "TAG", tag: "mentor" }, { type: "CONDITION", field: "coachTrust", delta: 2 }] },
  ]),
];
