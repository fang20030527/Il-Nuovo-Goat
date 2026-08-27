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
  category: "agent",
  title,
  body,
  cooldownSeasons: 0,
  maxTriggers: 2,
  weight: 1,
  options,
  ...extra,
});

export const agentEvents: readonly CareerEvent[] = [
  evt("agent-first-representation", "First Representation", "Three agencies want to represent you. One promises the moon, one has a track record, one is your cousin's friend.", [
    { id: "big-agency", label: "Sign with the big agency", effects: [{ type: "TAG", tag: "represented" }, { type: "MARKET_VALUE_PERCENT", percent: 10 }, { type: "REPUTATION", delta: 2 }] },
    { id: "boutique", label: "Choose the boutique firm", effects: [{ type: "TAG", tag: "represented" }, { type: "CONDITION", field: "morale", delta: 3 }] },
    { id: "cousin", label: "Go with family", effects: [{ type: "CONDITION", field: "morale", delta: 2 }, { type: "MARKET_VALUE_PERCENT", percent: -5 }] },
  ]),
  evt("agent-better-commission", "Better Commission", "Your agent wants to renegotiate their cut. They say they're worth it.", [
    { id: "accept", label: "Accept the new terms", effects: [{ type: "MARKET_VALUE_PERCENT", percent: -6 }, { type: "TAG", tag: "loyal-agent" }] },
    { id: "negotiate", label: "Negotiate hard", effects: [{ type: "MARKET_VALUE_PERCENT", percent: -3 }, { type: "ATTRIBUTE", attribute: "mentality", delta: 1 }] },
    { id: "switch", label: "Consider switching", effects: [{ type: "TAG", tag: "agent-shopping" }, { type: "CONDITION", field: "morale", delta: -2 }] },
  ], { requiredTags: ["represented"] }),
  evt("agent-release-clause", "Release Clause", "Your agent suggests inserting a release clause in your next contract. It cuts both ways.", [
    { id: "high-clause", label: "Set it high", effects: [{ type: "TAG", tag: "high-clause" }, { type: "CONDITION", field: "morale", delta: 2 }] },
    { id: "low-clause", label: "Set it reasonable", effects: [{ type: "TRANSFER_INTENT", value: true }, { type: "MARKET_VALUE_PERCENT", percent: 5 }] },
    { id: "no-clause", label: "No clause", effects: [{ type: "TAG", tag: "no-clause" }, { type: "CONDITION", field: "coachTrust", delta: 3 }] },
  ]),
  evt("agent-overseas-call", "Overseas Call", "A foreign club's sporting director calls your agent directly. The project sounds ambitious.", [
    { id: "listen", label: "Listen to the offer", effects: [{ type: "TRANSFER_INTENT", value: true }, { type: "REPUTATION", delta: 3 }] },
    { id: "decline", label: "Decline politely", effects: [{ type: "CONDITION", field: "coachTrust", delta: 3 }, { type: "CONDITION", field: "morale", delta: 1 }] },
  ]),
  evt("agent-sponsor-offer", "Sponsor Offer", "A boot brand wants you as their face. The money is good. The boots are... colorful.", [
    { id: "sign", label: "Sign the deal", effects: [{ type: "MARKET_VALUE_PERCENT", percent: 12 }, { type: "REPUTATION", delta: 4 }, { type: "TAG", tag: "sponsored" }] },
    { id: "negotiate", label: "Negotiate terms", effects: [{ type: "MARKET_VALUE_PERCENT", percent: 8 }, { type: "ATTRIBUTE", attribute: "mentality", delta: 1 }] },
  ], { minAge: 20 }),
  evt("agent-change-agent", "Change of Agent", "A rival agent approaches you directly. Your current agent finds out. The phone call is heated.", [
    { id: "stay", label: "Stay loyal", effects: [{ type: "TAG", tag: "loyal-agent" }, { type: "CONDITION", field: "morale", delta: 2 }] },
    { id: "switch", label: "Make the switch", effects: [{ type: "TAG", tag: "new-agent" }, { type: "MARKET_VALUE_PERCENT", percent: 8 }, { type: "CONDITION", field: "morale", delta: -3 }] },
  ], { requiredTags: ["represented"] }),
  evt("agent-deadline-pressure", "Deadline Pressure", "Transfer deadline day. Your agent's phone hasn't stopped ringing. You have three hours.", [
    { id: "push-move", label: "Push for the move", effects: [{ type: "TRANSFER_INTENT", value: true }, { type: "CONDITION", field: "morale", delta: 3 }] },
    { id: "stay-put", label: "Stay put", effects: [{ type: "CONDITION", field: "coachTrust", delta: 4 }, { type: "CONDITION", field: "morale", delta: -1 }] },
  ]),
];
