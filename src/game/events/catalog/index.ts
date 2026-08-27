import type { CareerEvent } from "../types";
import { trainingEvents } from "./training";
import { recoveryEvents } from "./recovery";
import { coachEvents } from "./coach";
import { teammatesEvents } from "./teammates";
import { mediaEvents } from "./media";
import { familyEvents } from "./family";
import { agentEvents } from "./agent";
import { nationalTeamEvents } from "./national-team";
import { contractsEvents } from "./contracts";
import { milestonesEvents } from "./milestones";

export const eventCatalog: readonly CareerEvent[] = [
  ...trainingEvents,
  ...recoveryEvents,
  ...coachEvents,
  ...teammatesEvents,
  ...mediaEvents,
  ...familyEvents,
  ...agentEvents,
  ...nationalTeamEvents,
  ...contractsEvents,
  ...milestonesEvents,
];
