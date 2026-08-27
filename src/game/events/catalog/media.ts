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
  category: "media",
  title,
  body,
  cooldownSeasons: 0,
  maxTriggers: 2,
  weight: 1,
  options,
  ...extra,
});

export const mediaEvents: readonly CareerEvent[] = [
  evt("media-breakout-headline", "Breakout Headline", "'THE NEXT BIG THING?' screams the back page. Your face is everywhere.", [
    { id: "embrace", label: "Embrace the hype", effects: [{ type: "REPUTATION", delta: 5 }, { type: "CONDITION", field: "morale", delta: 4 }] },
    { id: "dismiss", label: "Dismiss it", effects: [{ type: "ATTRIBUTE", attribute: "mentality", delta: 2 }, { type: "CONDITION", field: "morale", delta: -1 }] },
  ]),
  evt("media-difficult-interview", "Difficult Interview", "The journalist asks about your contract situation. Twice. The recorder is running.", [
    { id: "deflect", label: "Deflect professionally", effects: [{ type: "REPUTATION", delta: 2 }, { type: "ATTRIBUTE", attribute: "mentality", delta: 1 }] },
    { id: "honest", label: "Be brutally honest", effects: [{ type: "REPUTATION", delta: 4 }, { type: "CONDITION", field: "coachTrust", delta: -5 }, { type: "TRANSFER_INTENT", value: true }] },
  ]),
  evt("media-transfer-rumour", "Transfer Rumour", "A 'source close to the player' says you want out. You are the player. You said no such thing.", [
    { id: "deny", label: "Issue a denial", effects: [{ type: "CONDITION", field: "coachTrust", delta: 4 }, { type: "REPUTATION", delta: 1 }] },
    { id: "ignore", label: "Ignore the noise", effects: [{ type: "ATTRIBUTE", attribute: "mentality", delta: 2 }, { type: "CONDITION", field: "morale", delta: -2 }] },
  ]),
  evt("media-social-slip", "Social-Media Slip", "You liked a post criticizing the manager. At 3 AM. The screenshot is already viral.", [
    { id: "apologize", label: "Public apology", effects: [{ type: "REPUTATION", delta: -3 }, { type: "CONDITION", field: "coachTrust", delta: -4 }, { type: "CONDITION", field: "morale", delta: -3 }] },
    { id: "claim-hack", label: "Claim you were hacked", effects: [{ type: "REPUTATION", delta: -5 }, { type: "CONDITION", field: "coachTrust", delta: -6 }] },
  ]),
  evt("media-player-of-month", "Player of the Month", "The league announces you're on the shortlist. Your mother has already voted forty times.", [
    { id: "campaign", label: "Campaign for votes", effects: [{ type: "REPUTATION", delta: 4 }, { type: "CONDITION", field: "morale", delta: 3 }] },
    { id: "focus", label: "Focus on the team", effects: [{ type: "CONDITION", field: "coachTrust", delta: 3 }, { type: "ATTRIBUTE", attribute: "mentality", delta: 1 }] },
  ]),
  evt("media-goal-drought", "Goal Drought Questions", "Six games without a goal. The press conference microphone feels heavier than usual.", [
    { id: "confident", label: "Stay confident", effects: [{ type: "ATTRIBUTE", attribute: "mentality", delta: 2 }, { type: "REPUTATION", delta: 1 }] },
    { id: "frustrated", label: "Show frustration", effects: [{ type: "CONDITION", field: "morale", delta: -3 }, { type: "REPUTATION", delta: -2 }] },
  ], { positions: ["forward", "midfielder"] }),
  evt("media-national-spotlight", "National Spotlight", "The national broadcaster wants a documentary crew to follow you for a week.", [
    { id: "accept", label: "Accept the exposure", effects: [{ type: "REPUTATION", delta: 6 }, { type: "CONDITION", field: "morale", delta: 2 }] },
    { id: "decline", label: "Decline politely", effects: [{ type: "ATTRIBUTE", attribute: "mentality", delta: 1 }, { type: "CONDITION", field: "morale", delta: -1 }] },
  ]),
  evt("media-retirement-speculation", "Retirement Speculation", "A pundit suggests you're 'past your peak.' You're 29. The comments section is merciless.", [
    { id: "prove-wrong", label: "Prove them wrong", effects: [{ type: "ATTRIBUTE", attribute: "mentality", delta: 3 }, { type: "CONDITION", field: "form", delta: 4 }] },
    { id: "laugh", label: "Laugh it off", effects: [{ type: "CONDITION", field: "morale", delta: 3 }, { type: "REPUTATION", delta: 1 }] },
  ], { minAge: 28 }),
];
