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
  category: "contracts",
  title,
  body,
  cooldownSeasons: 0,
  maxTriggers: 2,
  weight: 1,
  options,
  ...extra,
});

export const contractsEvents: readonly CareerEvent[] = [
  evt("contracts-first-professional", "First Professional Deal", "The academy director slides a contract across the desk. Your signature turns you from promise to professional.", [
    { id: "sign", label: "Sign immediately", effects: [{ type: "TAG", tag: "professional" }, { type: "CONDITION", field: "morale", delta: 5 }, { type: "MARKET_VALUE_PERCENT", percent: 10 }] },
    { id: "review", label: "Review with family", effects: [{ type: "ATTRIBUTE", attribute: "mentality", delta: 1 }, { type: "CONDITION", field: "morale", delta: 2 }] },
  ], { maxAge: 18, maxTriggers: 1 }),
  evt("contracts-extension-talks", "Extension Talks", "Your contract has eighteen months left. The sporting director wants to 'discuss the future.'", [
    { id: "extend", label: "Open to extension", effects: [{ type: "CONDITION", field: "coachTrust", delta: 4 }, { type: "TAG", tag: "loyal" }] },
    { id: "wait", label: "Wait and see", effects: [{ type: "TRANSFER_INTENT", value: true }, { type: "CONDITION", field: "morale", delta: 1 }] },
    { id: "demand", label: "Demand more", effects: [{ type: "MARKET_VALUE_PERCENT", percent: 8 }, { type: "CONDITION", field: "coachTrust", delta: -2 }] },
  ]),
  evt("contracts-wage-or-role", "Wage or Role", "The club offers two options: more money on the bench, or less money as a starter.", [
    { id: "money", label: "Take the money", effects: [{ type: "MARKET_VALUE_PERCENT", percent: 15 }, { type: "CONDITION", field: "morale", delta: -3 }] },
    { id: "role", label: "Choose the role", effects: [{ type: "CONDITION", field: "coachTrust", delta: 5 }, { type: "ATTRIBUTE", attribute: "mentality", delta: 2 }] },
  ]),
  evt("contracts-loyalty-offer", "Loyalty Offer", "The club offers a 'loyalty bonus' to reject other interest. It's generous. It's also a cage.", [
    { id: "accept", label: "Accept and stay", effects: [{ type: "MARKET_VALUE_PERCENT", percent: 10 }, { type: "TAG", tag: "club-legend" }, { type: "CONDITION", field: "coachTrust", delta: 5 }] },
    { id: "decline", label: "Decline politely", effects: [{ type: "TRANSFER_INTENT", value: true }, { type: "CONDITION", field: "morale", delta: 2 }] },
  ]),
  evt("contracts-pay-cut-request", "Pay Cut Request", "The club's finances are tight. The captain has already taken a cut. The manager looks at you.", [
    { id: "accept", label: "Accept the cut", effects: [{ type: "MARKET_VALUE_PERCENT", percent: -10 }, { type: "CONDITION", field: "coachTrust", delta: 6 }, { type: "TAG", tag: "team-player" }] },
    { id: "refuse", label: "Refuse firmly", effects: [{ type: "CONDITION", field: "coachTrust", delta: -6 }, { type: "CONDITION", field: "morale", delta: -3 }] },
  ]),
  evt("contracts-free-agent-winter", "Free-Agent Winter", "Six months left. You can talk to anyone in January. Your phone is already warm.", [
    { id: "explore", label: "Explore options", effects: [{ type: "TRANSFER_INTENT", value: true }, { type: "REPUTATION", delta: 2 }] },
    { id: "commit", label: "Commit to the club", effects: [{ type: "TAG", tag: "loyal" }, { type: "CONDITION", field: "coachTrust", delta: 5 }] },
  ]),
  evt("contracts-final-contract", "Final Contract", "At 35, this is likely your last deal. The terms are modest. The legacy is not.", [
    { id: "sign", label: "Sign with grace", effects: [{ type: "TAG", tag: "club-legend" }, { type: "CONDITION", field: "morale", delta: 4 }, { type: "REPUTATION", delta: 3 }] },
    { id: "negotiate", label: "One last negotiation", effects: [{ type: "MARKET_VALUE_PERCENT", percent: 5 }, { type: "ATTRIBUTE", attribute: "mentality", delta: 1 }] },
  ], { minAge: 34, maxTriggers: 1 }),
];
