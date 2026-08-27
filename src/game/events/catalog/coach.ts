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
  category: "coach",
  title,
  body,
  cooldownSeasons: 0,
  maxTriggers: 2,
  weight: 1,
  options,
  ...extra,
});

export const coachEvents: readonly CareerEvent[] = [
  evt("coach-earn-shirt", "Earn the Shirt", "The manager calls you into his office. 'The shirt is yours to lose,' he says. 'Prove it.'", [
    { id: "promise", label: "Promise to deliver", effects: [{ type: "CONDITION", field: "coachTrust", delta: 6 }, { type: "CONDITION", field: "morale", delta: 4 }] },
    { id: "actions", label: "Let actions speak", effects: [{ type: "ATTRIBUTE", attribute: "mentality", delta: 2 }, { type: "CONDITION", field: "coachTrust", delta: 3 }] },
  ]),
  evt("coach-tactical-responsibility", "Tactical Responsibility", "The manager wants you to anchor the press. It's a thankless role, but crucial.", [
    { id: "accept", label: "Accept the role", effects: [{ type: "ATTRIBUTE", attribute: "awareness", delta: 2 }, { type: "CONDITION", field: "coachTrust", delta: 5 }] },
    { id: "negotiate", label: "Ask for freedom", effects: [{ type: "ATTRIBUTE", attribute: "technique", delta: 1 }, { type: "CONDITION", field: "coachTrust", delta: -2 }] },
  ]),
  evt("coach-public-challenge", "Public Challenge", "The manager tells the press you need to 'show more.' Your phone buzzes with notifications.", [
    { id: "respond-pitch", label: "Respond on the pitch", effects: [{ type: "CONDITION", field: "form", delta: 5 }, { type: "REPUTATION", delta: 2 }] },
    { id: "respond-media", label: "Respond to media", effects: [{ type: "REPUTATION", delta: 4 }, { type: "CONDITION", field: "coachTrust", delta: -4 }] },
  ]),
  evt("coach-quiet-warning", "Quiet Warning", "After training, the manager pulls you aside. 'Your standards have slipped,' he says quietly.", [
    { id: "accept", label: "Accept and improve", effects: [{ type: "ATTRIBUTE", attribute: "mentality", delta: 2 }, { type: "CONDITION", field: "coachTrust", delta: 4 }] },
    { id: "defend", label: "Defend yourself", effects: [{ type: "CONDITION", field: "morale", delta: -3 }, { type: "CONDITION", field: "coachTrust", delta: -5 }] },
  ]),
  evt("coach-captains-example", "Captain's Example", "The captain is injured. The manager asks you to lead by example this week.", [
    { id: "embrace", label: "Embrace leadership", effects: [{ type: "ATTRIBUTE", attribute: "mentality", delta: 3 }, { type: "TAG", tag: "leader" }, { type: "REPUTATION", delta: 3 }] },
    { id: "defer", label: "Defer to others", effects: [{ type: "CONDITION", field: "morale", delta: 1 }, { type: "CONDITION", field: "coachTrust", delta: -3 }] },
  ], { minAge: 24 }),
  evt("coach-new-system", "New System", "The manager unveils a new formation. Your position shifts slightly. The whiteboard is full of arrows.", [
    { id: "study", label: "Study the system", effects: [{ type: "ATTRIBUTE", attribute: "awareness", delta: 2 }, { type: "CONDITION", field: "coachTrust", delta: 3 }] },
    { id: "improvise", label: "Improvise within it", effects: [{ type: "ATTRIBUTE", attribute: "technique", delta: 2 }, { type: "CONDITION", field: "coachTrust", delta: -1 }] },
  ]),
  evt("coach-rotation-promise", "Rotation Promise", "The manager promises you minutes in the cup. 'Stay ready,' he says.", [
    { id: "trust", label: "Trust the plan", effects: [{ type: "CONDITION", field: "coachTrust", delta: 3 }, { type: "CONDITION", field: "morale", delta: 2 }] },
    { id: "doubt", label: "Doubt his word", effects: [{ type: "CONDITION", field: "morale", delta: -3 }, { type: "CONDITION", field: "coachTrust", delta: -2 }] },
  ]),
  evt("coach-training-dispute", "Training Ground Dispute", "You and the manager disagree about a drill in front of the squad. The air is thick.", [
    { id: "apologize", label: "Apologize after", effects: [{ type: "CONDITION", field: "coachTrust", delta: 2 }, { type: "CONDITION", field: "morale", delta: -2 }] },
    { id: "stand-firm", label: "Stand your ground", effects: [{ type: "ATTRIBUTE", attribute: "mentality", delta: 2 }, { type: "CONDITION", field: "coachTrust", delta: -6 }, { type: "REPUTATION", delta: 2 }] },
  ]),
];
