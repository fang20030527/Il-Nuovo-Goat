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
  category: "teammates",
  title,
  body,
  cooldownSeasons: 0,
  maxTriggers: 2,
  weight: 1,
  options,
  ...extra,
});

export const teammatesEvents: readonly CareerEvent[] = [
  evt("teammates-new-roommate", "New Roommate", "The club assigns you a new roommate for the away trip. He snores. Loudly.", [
    { id: "adapt", label: "Adapt and bond", effects: [{ type: "CONDITION", field: "morale", delta: 3 }, { type: "TAG", tag: "popular" }] },
    { id: "complain", label: "Request a change", effects: [{ type: "CONDITION", field: "morale", delta: -2 }, { type: "CONDITION", field: "coachTrust", delta: -2 }] },
  ]),
  evt("teammates-senior-advice", "Senior Advice", "The veteran striker pulls you aside after training. 'I was like you once,' he says.", [
    { id: "listen", label: "Listen closely", effects: [{ type: "ATTRIBUTE", attribute: "mentality", delta: 2 }, { type: "CONDITION", field: "morale", delta: 2 }] },
    { id: "nod", label: "Nod politely", effects: [{ type: "CONDITION", field: "morale", delta: 1 }] },
  ], { maxAge: 23 }),
  evt("teammates-dressing-room-vote", "Dressing-Room Vote", "The squad votes on the players' player award. Your name is on the ballot.", [
    { id: "campaign", label: "Campaign subtly", effects: [{ type: "REPUTATION", delta: 2 }, { type: "CONDITION", field: "morale", delta: 2 }] },
    { id: "stay-quiet", label: "Stay humble", effects: [{ type: "CONDITION", field: "morale", delta: 1 }, { type: "TAG", tag: "humble" }] },
  ]),
  evt("teammates-assist-bonus", "Assist Bonus", "The squad has a bonus pool for assists. You're one behind the leader with two games left.", [
    { id: "chase", label: "Chase the bonus", effects: [{ type: "ATTRIBUTE", attribute: "technique", delta: 1 }, { type: "CONDITION", field: "form", delta: 3 }] },
    { id: "ignore", label: "Ignore it", effects: [{ type: "CONDITION", field: "morale", delta: 1 }] },
  ], { positions: ["midfielder", "forward"] }),
  evt("teammates-training-collision", "Training Collision", "You and the backup goalkeeper collide in training. He's holding his shoulder. You're holding your breath.", [
    { id: "apologize", label: "Apologize immediately", effects: [{ type: "CONDITION", field: "morale", delta: 2 }, { type: "TAG", tag: "respectful" }] },
    { id: "play-on", label: "Play on", effects: [{ type: "CONDITION", field: "coachTrust", delta: 2 }, { type: "CONDITION", field: "morale", delta: -2 }] },
  ]),
  evt("teammates-young-prospect", "Young Prospect", "A 16-year-old academy graduate watches your every move in training. He wears your number on his jersey.", [
    { id: "mentor", label: "Take him under your wing", effects: [{ type: "TAG", tag: "mentor" }, { type: "REPUTATION", delta: 3 }, { type: "CONDITION", field: "morale", delta: 3 }] },
    { id: "focus", label: "Focus on yourself", effects: [{ type: "ATTRIBUTE", attribute: "technique", delta: 1 }, { type: "CONDITION", field: "morale", delta: -1 }] },
  ], { minAge: 22 }),
  evt("teammates-team-dinner", "Team Dinner", "The captain organizes a team dinner. You're seated between the goalkeeper and the new signing.", [
    { id: "engage", label: "Engage everyone", effects: [{ type: "CONDITION", field: "morale", delta: 4 }, { type: "TAG", tag: "popular" }] },
    { id: "quiet", label: "Keep to yourself", effects: [{ type: "CONDITION", field: "morale", delta: 1 }] },
  ]),
  evt("teammates-derby-message", "Derby Message", "The group chat is buzzing about the derby. Someone posts a motivational video at 2 AM.", [
    { id: "respond", label: "Respond with fire", effects: [{ type: "CONDITION", field: "morale", delta: 3 }, { type: "CONDITION", field: "form", delta: 2 }] },
    { id: "sleep", label: "Sleep through it", effects: [{ type: "CONDITION", field: "fitness", delta: 4 }, { type: "CONDITION", field: "morale", delta: -1 }] },
  ]),
];
