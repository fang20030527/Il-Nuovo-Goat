/**
 * Versioned Zod schemas for persisted career state and its JSON transfer
 * envelopes. Unknown save-schema or rules major versions are rejected at the
 * root so a future client never silently misreads an older or newer save.
 */
import { z } from "zod";
import { worldSchema } from "@/game/world/schema";

export const SAVE_SCHEMA_VERSION = 1 as const;
export const RULES_MAJOR_VERSION = "1" as const;

const boundedInt = (max: number) => z.number().int().min(0).max(max);

const idString = z.string().min(1).max(80);

const seasonStatsSchema = z.strictObject({
  appearances: boundedInt(5000),
  starts: boundedInt(5000),
  minutes: boundedInt(500_000),
  goals: boundedInt(5000),
  assists: boundedInt(5000),
  cleanSheets: boundedInt(5000),
  saves: boundedInt(50_000),
  yellowCards: boundedInt(5000),
  redCards: boundedInt(5000),
  defensiveActions: boundedInt(100_000),
  chancesCreated: boundedInt(100_000),
  goalsPrevented: boundedInt(50_000),
  ratingTotal: z.number().min(0).max(1_000_000),
  ratedMatches: boundedInt(5000),
});

const playerAttributesSchema = z.strictObject({
  technique: z.number().int().min(1).max(100),
  awareness: z.number().int().min(1).max(100),
  physical: z.number().int().min(1).max(100),
  mentality: z.number().int().min(1).max(100),
});

const contractSchema = z.strictObject({
  clubId: idString,
  startSeason: z.number().int().min(1),
  endSeason: z.number().int().min(1),
  weeklyWage: boundedInt(10_000_000),
  appearanceBonus: boundedInt(10_000_000),
  titleBonus: boundedInt(100_000_000),
  role: z.enum(["prospect", "rotation", "starter", "star"]),
  parentClubId: idString.nullable(),
});

const injurySchema = z.strictObject({
  id: idString,
  severity: z.enum(["knock", "strain", "fracture", "major"]),
  remainingMatches: boundedInt(500),
  potentialDeltaOnRecovery: z.number().int().min(-20).max(20),
  physicalDeltaOnRecovery: z.number().int().min(-20).max(20),
});

const positionFamilySchema = z.enum(["goalkeeper", "defender", "midfielder", "forward"]);

const playerSchema = z.strictObject({
  id: idString,
  name: z.string().min(1).max(60),
  nationality: idString,
  position: positionFamilySchema,
  preferredFoot: z.enum(["left", "right"]),
  shirtNumber: z.number().int().min(1).max(99),
  age: z.number().int().min(16).max(36),
  attributes: playerAttributesSchema,
  overall: z.number().int().min(1).max(100),
  potential: z.number().int().min(1).max(100),
  fitness: z.number().int().min(0).max(100),
  form: z.number().int().min(0).max(100),
  morale: z.number().int().min(0).max(100),
  coachTrust: z.number().int().min(0).max(100),
  reputation: z.number().int().min(0).max(100),
  marketValue: boundedInt(1_000_000_000),
  clubId: idString,
  contract: contractSchema,
  injury: injurySchema.nullable(),
  currentSeasonStats: seasonStatsSchema,
  careerStats: seasonStatsSchema,
  nationalTeam: z.strictObject({
    selected: z.boolean(),
    caps: boundedInt(1000),
    goals: boundedInt(1000),
  }),
  tags: z.array(z.string().min(1).max(40)).max(20),
});

const competitionKindSchema = z.enum(["league", "domestic-cup", "continental", "national-team"]);

const fixtureSchema = z.strictObject({
  id: idString,
  competitionId: idString,
  kind: competitionKindSchema,
  season: z.number().int().min(1),
  round: z.number().int().min(1),
  homeClubId: idString,
  awayClubId: idString,
  status: z.enum(["scheduled", "in-progress", "complete"]),
});

const playerMatchPerformanceSchema = seasonStatsSchema.extend({
  rating: z.number().min(0).max(10),
});

const matchResultSchema = z.strictObject({
  fixtureId: idString,
  homeClubId: idString,
  awayClubId: idString,
  homeGoals: boundedInt(50),
  awayGoals: boundedInt(50),
  playerPerformance: playerMatchPerformanceSchema.nullable(),
  timeline: z.array(z.string().max(200)).max(500),
});

const leagueTableRowSchema = z.strictObject({
  clubId: idString,
  played: boundedInt(100),
  won: boundedInt(100),
  drawn: boundedInt(100),
  lost: boundedInt(100),
  goalsFor: boundedInt(500),
  goalsAgainst: boundedInt(500),
  points: boundedInt(500),
});

const momentOptionSchema = z.strictObject({
  id: idString,
  label: z.string().min(1).max(120),
  risk: z.enum(["low", "medium", "high"]),
});

const activeMomentSchema = z.strictObject({
  fixtureId: idString,
  minute: z.number().int().min(1).max(120),
  score: z.tuple([boundedInt(50), boundedInt(50)]),
  prompt: z.string().min(1).max(300),
  options: z.array(momentOptionSchema).min(2).max(4),
});

const pendingMomentSchema = z.strictObject({
  fixtureId: idString,
  minute: z.number().int().min(1).max(120),
  score: z.tuple([boundedInt(50), boundedInt(50)]),
  playerMinutes: boundedInt(120),
  opponentLine: z.number().int().min(1).max(100),
  performance: playerMatchPerformanceSchema,
  options: z.array(momentOptionSchema).min(2).max(4),
});

const detailedSeasonSchema = z.strictObject({
  playerFixtures: z.array(fixtureSchema).max(100),
  nextFixtureIndex: boundedInt(100),
  seasonStats: seasonStatsSchema,
  timeline: z.array(z.string().max(200)).max(2000),
  pendingMoment: pendingMomentSchema.nullable(),
  lastMatch: matchResultSchema.nullable(),
  playedResults: z.array(matchResultSchema).max(100),
  neutralResults: z.array(matchResultSchema).max(2000),
});

const seasonStateSchema = z.strictObject({
  season: z.number().int().min(1),
  status: z.enum(["not-started", "active", "complete"]),
  completedClubFixtures: boundedInt(100),
  fixtures: z.array(fixtureSchema).max(2000),
  results: z.array(matchResultSchema).max(2000),
  leagueTables: z.array(
    z.strictObject({ leagueId: idString, rows: z.array(leagueTableRowSchema).max(40) }),
  ).max(16),
  domesticCupWinners: z.array(idString).max(16),
  continentalCupWinner: idString.nullable(),
  nationalTeamResult: z.strictObject({
    selected: z.boolean(),
    appearances: boundedInt(20),
    goals: boundedInt(20),
    tournamentFinish: z.enum(["not-held", "group", "runner-up", "champion"]),
  }),
  pendingFixtureId: idString.nullable(),
  detailed: detailedSeasonSchema.nullable(),
});

const honourSchema = z.strictObject({
  id: idString,
  label: z.string().min(1).max(80),
  kind: competitionKindSchema,
  contributionMinutes: boundedInt(500_000),
  availableMinutes: boundedInt(500_000),
});

const individualAwardSchema = z.strictObject({
  id: idString,
  label: z.string().min(1).max(80),
  scope: z.enum(["club", "league", "continental", "national-team", "world"]),
});

const competitionStatsSchema = z.strictObject({
  competitionId: idString,
  kind: competitionKindSchema,
  availableMinutes: boundedInt(500_000),
  stats: seasonStatsSchema,
});

const careerArchiveSchema = z.strictObject({
  season: z.number().int().min(1),
  age: z.number().int().min(16).max(36),
  clubId: idString,
  stats: seasonStatsSchema,
  overall: z.number().int().min(1).max(100),
  marketValue: boundedInt(1_000_000_000),
  competitionStats: z.array(competitionStatsSchema).max(8),
  honours: z.array(honourSchema).max(8),
  awards: z.array(individualAwardSchema).max(8),
});

const gameCommandSchema = z.discriminatedUnion("type", [
  z.strictObject({ type: z.literal("START_CAREER") }),
  z.strictObject({ type: z.literal("ADVANCE_CLASSIC") }),
  z.strictObject({ type: z.literal("START_NEXT_MATCH") }),
  z.strictObject({ type: z.literal("CHOOSE_MOMENT"), optionId: idString }),
  z.strictObject({ type: z.literal("FINISH_MATCH") }),
  z.strictObject({ type: z.literal("FINISH_SEASON") }),
  z.strictObject({ type: z.literal("SET_TRAINING_FOCUS"), focus: z.enum(["technique", "awareness", "physical", "mentality"]) }),
  z.strictObject({ type: z.literal("SET_CAREER_INTENT"), intent: z.enum(["earn-start", "steady-growth", "chase-honours", "seek-transfer"]) }),
  z.strictObject({ type: z.literal("SET_MODE"), mode: z.enum(["classic", "detailed"]) }),
  z.strictObject({ type: z.literal("CHOOSE_EVENT_OPTION"), optionId: idString }),
  z.strictObject({ type: z.literal("ACCEPT_TRANSFER"), offerId: idString }),
  z.strictObject({ type: z.literal("DECLINE_TRANSFERS") }),
  z.strictObject({ type: z.literal("RETIRE") }),
]);

const transferOfferSchema = z.strictObject({
  id: idString,
  clubId: idString,
  financialFit: z.number().int().min(0).max(100),
  contract: contractSchema,
  marketValue: boundedInt(1_000_000_000),
});

/** Persisted career root. The world is embedded so a save is self-contained. */
export const careerStateSchema = z
  .strictObject({
    saveSchemaVersion: z.literal(SAVE_SCHEMA_VERSION),
    rulesVersion: z.string().regex(/^\d+\.\d+\.\d+$/),
    rng: z.strictObject({ seed: z.number().int(), cursor: z.number().int().min(0) }),
    phase: z.enum([
      "preseason", "classic-checkpoint", "detailed-prematch", "detailed-moment",
      "detailed-postmatch", "season-review", "transfer-window", "retired",
    ]),
    mode: z.enum(["classic", "detailed"]),
    difficulty: z.enum(["story", "balanced", "hard"]),
    trainingFocus: z.enum(["technique", "awareness", "physical", "mentality"]),
    careerIntent: z.enum(["earn-start", "steady-growth", "chase-honours", "seek-transfer"]),
    world: worldSchema,
    player: playerSchema,
    season: seasonStateSchema,
    archives: z.array(careerArchiveSchema).max(21),
    activeMoment: activeMomentSchema.nullable(),
    activeEventId: idString.nullable(),
    eventHistory: z.array(z.strictObject({
      eventId: idString, optionId: idString,
      season: z.number().int().min(1), age: z.number().int().min(16).max(36),
    })).max(500),
    careerHistory: z.array(z.strictObject({
      type: z.string().min(1).max(40),
      season: z.number().int().min(1),
      age: z.number().int().min(16).max(36),
      summary: z.string().max(300),
    })).max(2000),
    commandHistory: z.array(z.strictObject({
      index: z.number().int().min(0),
      command: gameCommandSchema,
    })).max(10_000),
    transferOffers: z.array(transferOfferSchema).max(10),
  })
  .superRefine((state, ctx) => {
    const [major] = state.rulesVersion.split(".");
    if (major !== RULES_MAJOR_VERSION) {
      ctx.addIssue({
        code: "custom",
        path: ["rulesVersion"],
        message: `Unsupported rules major version ${state.rulesVersion}`,
      });
    }
    const clubIds = new Set(state.world.clubs.map((club) => club.id));
    if (!clubIds.has(state.player.clubId)) {
      ctx.addIssue({
        code: "custom",
        path: ["player", "clubId"],
        message: `Player club ${state.player.clubId} is not in the embedded world`,
      });
    }
    if (state.player.contract.parentClubId !== null && !clubIds.has(state.player.contract.parentClubId)) {
      ctx.addIssue({
        code: "custom",
        path: ["player", "contract", "parentClubId"],
        message: `Parent club ${state.player.contract.parentClubId} is not in the embedded world`,
      });
    }
    const fixtureIds = new Set(state.season.fixtures.map((fixture) => fixture.id));
    if (state.season.pendingFixtureId !== null && !fixtureIds.has(state.season.pendingFixtureId)) {
      ctx.addIssue({
        code: "custom",
        path: ["season", "pendingFixtureId"],
        message: "Pending fixture is not part of the season schedule",
      });
    }
    if (state.activeMoment !== null && !fixtureIds.has(state.activeMoment.fixtureId)) {
      ctx.addIssue({
        code: "custom",
        path: ["activeMoment", "fixtureId"],
        message: "Active moment references an unknown fixture",
      });
    }
  });

export type PersistedCareerState = z.infer<typeof careerStateSchema>;

export const careerExportEnvelopeSchema = z.strictObject({
  kind: z.literal("open-pitch-legacy-career"),
  exportedAt: z.string().min(1).max(40),
  saveSchemaVersion: z.literal(SAVE_SCHEMA_VERSION),
  state: careerStateSchema,
});

export const worldExportEnvelopeSchema = z.strictObject({
  kind: z.literal("open-pitch-legacy-world"),
  exportedAt: z.string().min(1).max(40),
  worldSchemaVersion: z.literal(1),
  world: worldSchema,
});
