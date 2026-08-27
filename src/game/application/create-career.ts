import type {
  CareerIntent,
  CareerState,
  Difficulty,
  GameMode,
  TrainingFocus,
} from "@/game/domain/career";
import type { ClubId, CountryId } from "@/game/domain/ids";
import type { PositionFamily, World } from "@/game/domain/world";
import type { PlayerAttributes } from "@/game/domain/player";
import { emptySeasonStats } from "@/game/domain/player";
import { gameError, type GameResult } from "@/game/domain/errors";
import { seedRng, nextInt, type RandomResult } from "@/game/engine/rng";
import { calculateOverall } from "@/game/engine/ratings";
export interface CreateCareerInput {
  readonly world: World;
  readonly playerName: string;
  readonly nationality: CountryId;
  readonly position: PositionFamily;
  readonly preferredFoot: "left" | "right";
  readonly shirtNumber: number;
  readonly difficulty: Difficulty;
  readonly seed: string;
  readonly startingClubId: ClubId;
  readonly mode: GameMode;
  readonly trainingFocus: TrainingFocus;
  readonly careerIntent: CareerIntent;
}

const positionProfile: Record<PositionFamily, PlayerAttributes> = {
  goalkeeper: { technique: 0, awareness: 4, physical: 2, mentality: 4 },
  defender: { technique: -2, awareness: 2, physical: 4, mentality: 2 },
  midfielder: { technique: 3, awareness: 3, physical: 0, mentality: 0 },
  forward: { technique: 4, awareness: 0, physical: 2, mentality: -2 },
};

const difficultyShift: Record<Difficulty, number> = {
  story: 2,
  balanced: 0,
  hard: -2,
};

export const createCareer = (input: CreateCareerInput): GameResult<CareerState> => {
  const name = input.playerName.trim();
  if (name.length < 1 || name.length > 40) {
    return gameError("INVALID_COMMAND", "Player name must be 1-40 characters", "playerName");
  }
  if (!Number.isInteger(input.shirtNumber) || input.shirtNumber < 1 || input.shirtNumber > 99) {
    return gameError("INVALID_COMMAND", "Shirt number must be an integer between 1 and 99", "shirtNumber");
  }
  const country = input.world.countries.find((entry) => entry.id === input.nationality);
  if (!country) {
    return gameError("INVALID_COMMAND", `Unsupported nationality: ${input.nationality}`, "nationality");
  }
  const club = input.world.clubs.find((entry) => entry.id === input.startingClubId);
  if (!club) {
    return gameError("INVALID_COMMAND", `Unknown starting club: ${input.startingClubId}`, "startingClubId");
  }

  const rng = seedRng(input.seed);
  let initRng = seedRng(`${input.seed}:init`);
  const profile = positionProfile[input.position];
  const shift = difficultyShift[input.difficulty];

  const drawAttribute = (bonus: number): number => {
    const draw: RandomResult<number> = nextInt(initRng, 45 + bonus + shift, 62 + bonus + shift);
    initRng = draw.state;
    return Math.max(1, Math.min(99, draw.value));
  };

  const attributes: PlayerAttributes = {
    technique: drawAttribute(profile.technique),
    awareness: drawAttribute(profile.awareness),
    physical: drawAttribute(profile.physical),
    mentality: drawAttribute(profile.mentality),
  };

  const potentialDraw = nextInt(initRng, 70, 92);
  initRng = potentialDraw.state;
  const potential = potentialDraw.value;

  const overall = Math.max(
    1,
    Math.min(99, Math.min(calculateOverall(input.position, attributes), potential)),
  );

  const player = {
    id: `player-${name.toLowerCase().replace(/[^a-z0-9]+/g, "-")}-${rng.seed}`,
    name,
    nationality: input.nationality,
    position: input.position,
    preferredFoot: input.preferredFoot,
    shirtNumber: input.shirtNumber,
    age: 16,
    attributes,
    overall,
    potential,
    fitness: 80,
    form: 55,
    morale: 65,
    coachTrust: 45,
    reputation: 10,
    marketValue: 250_000,
    clubId: club.id,
    contract: {
      clubId: club.id,
      startSeason: 1,
      endSeason: 2,
      weeklyWage: 500,
      appearanceBonus: 50,
      titleBonus: 2_000,
      role: "prospect" as const,
      parentClubId: null,
    },
    injury: null,
    currentSeasonStats: emptySeasonStats(),
    careerStats: emptySeasonStats(),
    nationalTeam: { selected: false, caps: 0, goals: 0 },
    tags: [],
  };

  return {
    ok: true,
    value: {
      saveSchemaVersion: 1,
      rulesVersion: "1.0.0",
      rng,
      phase: "preseason",
      mode: input.mode,
      difficulty: input.difficulty,
      trainingFocus: input.trainingFocus,
      careerIntent: input.careerIntent,
      world: input.world,
      player,
      season: {
        season: 1,
        status: "not-started",
        completedClubFixtures: 0,
        fixtures: [],
        results: [],
        leagueTables: [],
        domesticCupWinners: [],
        continentalCupWinner: null,
        nationalTeamResult: {
          selected: false,
          appearances: 0,
          goals: 0,
          tournamentFinish: "not-held",
        },
        pendingFixtureId: null,
        detailed: null,
      },
      archives: [],
      activeMoment: null,
      activeEventId: null,
      eventHistory: [],
      careerHistory: [
        {
          type: "CAREER_CREATED",
          season: 1,
          age: 16,
          summary: `${name} started a career at ${club.name} as a ${input.position}.`,
        },
      ],
      commandHistory: [],
      transferOffers: [],
    },
  };
};
