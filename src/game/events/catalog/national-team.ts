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
  category: "national-team",
  title,
  body,
  cooldownSeasons: 0,
  maxTriggers: 2,
  weight: 1,
  options,
  ...extra,
});

export const nationalTeamEvents: readonly CareerEvent[] = [
  evt("national-first-call-up", "First Call-Up", "The envelope arrives at the training ground. Your name is on the squad list. Your hands shake slightly.", [
    { id: "celebrate", label: "Celebrate with family", effects: [{ type: "REPUTATION", delta: 6 }, { type: "CONDITION", field: "morale", delta: 6 }, { type: "TAG", tag: "international" }] },
    { id: "stay-focused", label: "Stay focused", effects: [{ type: "ATTRIBUTE", attribute: "mentality", delta: 2 }, { type: "CONDITION", field: "coachTrust", delta: 2 }] },
  ], { maxTriggers: 1 }),
  evt("national-debut-nerves", "Debut Nerves", "The anthem plays. You look at the flag on your chest. Eighty thousand people are singing.", [
    { id: "embrace", label: "Embrace the moment", effects: [{ type: "CONDITION", field: "form", delta: 4 }, { type: "REPUTATION", delta: 4 }] },
    { id: "breathe", label: "Focus on breathing", effects: [{ type: "ATTRIBUTE", attribute: "mentality", delta: 2 }, { type: "CONDITION", field: "morale", delta: 1 }] },
  ], { requiredTags: ["international"], maxTriggers: 1 }),
  evt("national-international-role", "International Role", "The national coach sees you differently than your club manager. He wants you in a new position.", [
    { id: "adapt", label: "Adapt for country", effects: [{ type: "ATTRIBUTE", attribute: "awareness", delta: 2 }, { type: "TAG", tag: "versatile" }] },
    { id: "discuss", label: "Discuss concerns", effects: [{ type: "CONDITION", field: "morale", delta: -1 }, { type: "ATTRIBUTE", attribute: "mentality", delta: 1 }] },
  ], { requiredTags: ["international"] }),
  evt("national-tournament-camp", "Tournament Camp", "Six weeks in a hotel with the same twenty-three people. The cards are already out.", [
    { id: "bond", label: "Bond with teammates", effects: [{ type: "CONDITION", field: "morale", delta: 5 }, { type: "TAG", tag: "popular" }] },
    { id: "train", label: "Extra training", effects: [{ type: "ATTRIBUTE", attribute: "physical", delta: 2 }, { type: "CONDITION", field: "morale", delta: -2 }] },
  ], { requiredTags: ["international"] }),
  evt("national-captains-armband", "Captain's Armband", "The regular captain is suspended. The coach hands you the armband in the tunnel.", [
    { id: "lead", label: "Lead by example", effects: [{ type: "ATTRIBUTE", attribute: "mentality", delta: 3 }, { type: "REPUTATION", delta: 5 }, { type: "TAG", tag: "leader" }] },
    { id: "defer", label: "Suggest someone else", effects: [{ type: "CONDITION", field: "morale", delta: -3 }, { type: "CONDITION", field: "coachTrust", delta: -3 }] },
  ], { requiredTags: ["international"], minAge: 26 }),
  evt("national-club-or-country", "Club or Country", "The international break falls right before the cup final. Your club manager is furious.", [
    { id: "country", label: "Honor the call-up", effects: [{ type: "REPUTATION", delta: 3 }, { type: "CONDITION", field: "coachTrust", delta: -5 }] },
    { id: "club", label: "Ask to stay", effects: [{ type: "CONDITION", field: "coachTrust", delta: 4 }, { type: "REPUTATION", delta: -2 }, { type: "TAG", tag: "club-first" }] },
  ], { requiredTags: ["international"] }),
  evt("national-final-tournament", "Final Tournament", "You're 35. The coach says this is probably your last major tournament. The young players call you 'grandad.'", [
    { id: "mentor", label: "Mentor the youngsters", effects: [{ type: "TAG", tag: "mentor" }, { type: "REPUTATION", delta: 4 }, { type: "CONDITION", field: "morale", delta: 3 }] },
    { id: "last-run", label: "One last run", effects: [{ type: "CONDITION", field: "form", delta: 5 }, { type: "ATTRIBUTE", attribute: "mentality", delta: 2 }] },
  ], { requiredTags: ["international"], minAge: 33, maxTriggers: 1 }),
];
