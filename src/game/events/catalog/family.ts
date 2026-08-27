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
  category: "family",
  title,
  body,
  cooldownSeasons: 0,
  maxTriggers: 2,
  weight: 1,
  options,
  ...extra,
});

export const familyEvents: readonly CareerEvent[] = [
  evt("family-long-distance", "Long-Distance Choice", "Your partner gets a dream job offer in another country. The timing is terrible.", [
    { id: "support", label: "Support their move", effects: [{ type: "CONDITION", field: "morale", delta: -4 }, { type: "ATTRIBUTE", attribute: "mentality", delta: 3 }] },
    { id: "ask-stay", label: "Ask them to stay", effects: [{ type: "CONDITION", field: "morale", delta: 2 }, { type: "CONDITION", field: "form", delta: -2 }] },
  ]),
  evt("family-home-town-visit", "Home-Town Visit", "The international break gives you three days off. Your childhood coach invites you to visit the old club.", [
    { id: "visit", label: "Make the trip", effects: [{ type: "CONDITION", field: "morale", delta: 5 }, { type: "REPUTATION", delta: 2 }] },
    { id: "rest", label: "Rest instead", effects: [{ type: "CONDITION", field: "fitness", delta: 6 }, { type: "CONDITION", field: "morale", delta: -1 }] },
  ]),
  evt("family-new-responsibility", "New Responsibility", "Your family asks you to invest in a business back home. The numbers look optimistic.", [
    { id: "invest", label: "Invest cautiously", effects: [{ type: "MARKET_VALUE_PERCENT", percent: -8 }, { type: "TAG", tag: "business-minded" }] },
    { id: "decline", label: "Politely decline", effects: [{ type: "CONDITION", field: "morale", delta: -2 }, { type: "ATTRIBUTE", attribute: "mentality", delta: 1 }] },
  ], { minAge: 24 }),
  evt("family-at-final", "Family at the Final", "The cup final is tomorrow. Your parents call—they've got tickets in the family section.", [
    { id: "dedicate", label: "Dedicate the performance", effects: [{ type: "CONDITION", field: "form", delta: 5 }, { type: "CONDITION", field: "morale", delta: 4 }] },
    { id: "focus", label: "Stay focused", effects: [{ type: "ATTRIBUTE", attribute: "mentality", delta: 2 }, { type: "CONDITION", field: "morale", delta: 1 }] },
  ]),
  evt("family-private-celebration", "Private Celebration", "Your child takes their first steps while you're away at an away game. The video arrives at midnight.", [
    { id: "call-home", label: "Call home immediately", effects: [{ type: "CONDITION", field: "morale", delta: 3 }, { type: "CONDITION", field: "fitness", delta: -2 }] },
    { id: "watch-later", label: "Watch it tomorrow", effects: [{ type: "CONDITION", field: "morale", delta: -3 }, { type: "CONDITION", field: "fitness", delta: 2 }] },
  ], { minAge: 22 }),
  evt("family-life-after", "Life After Football", "Your uncle asks what you'll do 'after all this running around.' It's a fair question.", [
    { id: "plan", label: "Start planning", effects: [{ type: "ATTRIBUTE", attribute: "mentality", delta: 2 }, { type: "TAG", tag: "planner" }] },
    { id: "live-now", label: "Live in the moment", effects: [{ type: "CONDITION", field: "morale", delta: 3 }, { type: "ATTRIBUTE", attribute: "awareness", delta: -1 }] },
  ], { minAge: 30 }),
];
