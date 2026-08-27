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
  category: "milestones",
  title,
  body,
  cooldownSeasons: 0,
  maxTriggers: 1,
  weight: 0.5,
  options,
  ...extra,
});

export const milestonesEvents: readonly CareerEvent[] = [
  evt("milestones-first-goal", "First Goal", "The net ripples. The crowd roars. Your teammates mob you. You will remember this forever.", [
    { id: "savor", label: "Savor the moment", effects: [{ type: "CONDITION", field: "morale", delta: 8 }, { type: "REPUTATION", delta: 3 }] },
    { id: "build", label: "Build on it", effects: [{ type: "ATTRIBUTE", attribute: "technique", delta: 2 }, { type: "CONDITION", field: "form", delta: 4 }] },
  ], { positions: ["forward", "midfielder", "defender"] }),
  evt("milestones-hundred-appearances", "Hundred Appearances", "The stadium announcer reads your name for the hundredth time. The badge on your chest feels heavier.", [
    { id: "reflect", label: "Reflect on the journey", effects: [{ type: "ATTRIBUTE", attribute: "mentality", delta: 2 }, { type: "CONDITION", field: "morale", delta: 4 }] },
    { id: "push", label: "Push for more", effects: [{ type: "ATTRIBUTE", attribute: "physical", delta: 1 }, { type: "CONDITION", field: "form", delta: 3 }] },
  ]),
  evt("milestones-club-record", "Club Record", "You've broken a record that stood for thirty years. The previous holder sends a bottle of wine.", [
    { id: "celebrate", label: "Celebrate publicly", effects: [{ type: "REPUTATION", delta: 6 }, { type: "CONDITION", field: "morale", delta: 5 }] },
    { id: "humble", label: "Stay humble", effects: [{ type: "TAG", tag: "humble" }, { type: "CONDITION", field: "coachTrust", delta: 3 }] },
  ]),
  evt("milestones-continental-night", "Continental Night", "The anthem plays under the lights. This is the competition you dreamed about as a kid.", [
    { id: "rise", label: "Rise to the occasion", effects: [{ type: "CONDITION", field: "form", delta: 6 }, { type: "REPUTATION", delta: 4 }] },
    { id: "routine", label: "Treat it as routine", effects: [{ type: "ATTRIBUTE", attribute: "mentality", delta: 2 }, { type: "CONDITION", field: "morale", delta: 1 }] },
  ]),
  evt("milestones-testimonial", "Testimonial Match", "Ten years at the club. The fans sing your name for ninety minutes. You score a penalty you weren't supposed to take.", [
    { id: "emotional", label: "Get emotional", effects: [{ type: "CONDITION", field: "morale", delta: 6 }, { type: "REPUTATION", delta: 5 }, { type: "TAG", tag: "club-legend" }] },
    { id: "composed", label: "Stay composed", effects: [{ type: "ATTRIBUTE", attribute: "mentality", delta: 3 }, { type: "CONDITION", field: "coachTrust", delta: 2 }] },
  ], { minAge: 28 }),
  evt("milestones-farewell-speech", "Farewell Speech", "The dressing room is silent. Twenty years of memories. You clear your throat.", [
    { id: "heartfelt", label: "Speak from the heart", effects: [{ type: "REPUTATION", delta: 8 }, { type: "TAG", tag: "legend" }, { type: "CONDITION", field: "morale", delta: 5 }] },
    { id: "brief", label: "Keep it brief", effects: [{ type: "ATTRIBUTE", attribute: "mentality", delta: 2 }, { type: "CONDITION", field: "morale", delta: 2 }] },
  ], { minAge: 35 }),
];
