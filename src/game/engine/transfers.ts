import type { ClubId } from "@/game/domain/ids";
import type { Contract, Player, TransferOffer } from "@/game/domain/player";
import type { Club, World } from "@/game/domain/world";
import type { RngState } from "@/game/domain/career";
import { gameError, type GameResult } from "@/game/domain/errors";
import { nextFloat, nextInt, pickWeighted } from "@/game/engine/rng";

export type SquadRole = "prospect" | "rotation" | "starter" | "star";

export type CareerIntent = "stay" | "open" | "push";

export interface TransferInput {
  readonly player: Player;
  readonly world: World;
  readonly season: number;
  readonly rng: RngState;
  readonly intent: CareerIntent;
}

export const estimateClubRole = (player: Player, club: Club): SquadRole => {
  const line = club.lines[player.position];
  const difference = player.overall - line;
  if (difference >= 10) return "star";
  if (difference >= 2) return "starter";
  if (difference >= -6) return "rotation";
  return "prospect";
};

const clamp = (min: number, max: number, value: number) => Math.max(min, Math.min(max, value));

interface OfferCandidate {
  readonly club: Club;
  readonly financialFit: number;
  readonly weight: number;
}

const weeklyWageFor = (club: Club, player: Player): number => {
  const base = (club.finances * 900 + player.marketValue / 400) * (0.8 + club.reputation / 250);
  return Math.max(500, Math.round(base));
};

const buildContract = (
  club: Club,
  player: Player,
  season: number,
  rng: RngState,
): { contract: Contract; rng: RngState } => {
  const years = nextInt(rng, 1, 5);
  const role = estimateClubRole(player, club);
  const weeklyWage = weeklyWageFor(club, player);
  return {
    contract: {
      clubId: club.id,
      startSeason: season,
      endSeason: season + years.value - 1,
      weeklyWage,
      appearanceBonus: Math.round(weeklyWage * 0.1),
      titleBonus: Math.round(weeklyWage * 4),
      role,
      parentClubId: null,
    },
    rng: years.state,
  };
};

const listCandidates = (input: TransferInput): OfferCandidate[] => {
  const { player, world, intent } = input;
  const candidates: OfferCandidate[] = [];
  for (const club of world.clubs) {
    if (club.id === player.clubId) continue;
    const line = club.lines[player.position];
    if (line - player.overall > 22) continue;
    const weeklyWage = weeklyWageFor(club, player);
    const annualCost = weeklyWage * 52 + player.marketValue;
    const budget = club.finances * 1_000_000;
    const financialFit = budget / Math.max(1, annualCost);
    if (financialFit < 1) continue;
    const role = estimateClubRole(player, club);
    if (role === "prospect" && player.age > 23) continue;
    const league = world.leagues.find((entry) => entry.id === club.leagueId);
    const levelFit = league?.level === 1 ? 1.2 : 0.8;
    const roleFit = role === "star" ? 1.4 : role === "starter" ? 1.2 : role === "rotation" ? 1 : 0.6;
    const sameCountry = club.countryId === player.nationality;
    const countryFit = intent === "stay" ? (sameCountry ? 1.3 : 0.5) : sameCountry ? 1 : 1.1;
    const intentFit = intent === "push" ? 1.3 : 1;
    const formFit = 0.7 + clamp(0, 100, player.form) / 150;
    const weight = (club.reputation / 100) * levelFit * roleFit * countryFit * intentFit * formFit;
    if (weight > 0) candidates.push({ club, financialFit, weight });
  }
  return candidates;
};

export const generateTransferOffers = (
  input: TransferInput,
): { value: TransferOffer[]; rng: RngState } => {
  const candidates = listCandidates(input);
  let rng = input.rng;
  const pool = [...candidates];
  const offers: TransferOffer[] = [];
  const targetCount = nextInt(rng, 0, Math.min(5, pool.length));
  rng = targetCount.state;

  for (let count = 0; count < targetCount.value && pool.length > 0; count += 1) {
    const pick = pickWeighted(
      rng,
      pool.map((candidate) => ({ value: candidate, weight: candidate.weight })),
    );
    if (!pick.ok) break;
    rng = pick.value.state;
    const candidate = pick.value.value;
    pool.splice(pool.indexOf(candidate), 1);
    const built = buildContract(candidate.club, input.player, input.season, rng);
    rng = built.rng;
    offers.push({
      id: `offer-${input.season}-${candidate.club.id}-${input.player.id}-${rng.cursor}`,
      clubId: candidate.club.id,
      financialFit: candidate.financialFit,
      contract: built.contract,
      marketValue: input.player.marketValue,
    });
  }
  return { value: offers, rng };
};

export const acceptTransfer = (player: Player, offer: TransferOffer): Player => ({
  ...player,
  clubId: offer.clubId,
  contract: { ...offer.contract, parentClubId: null },
});

export const renewContract = (
  player: Player,
  club: Club,
  season: number,
  rng: RngState,
): { contract: Contract; rng: RngState } => buildContract(club, player, season, rng);

export interface LoanInput {
  readonly player: Player;
  readonly destination: Club;
  readonly season: number;
  readonly promisedRole: SquadRole;
}

export const requestLoan = (input: LoanInput): GameResult<Player> => {
  const { player, destination, season, promisedRole } = input;
  if (player.age > 23) {
    return gameError("INVALID_STATE", "Loans are only available to players aged 16-23");
  }
  const yearsRemaining = player.contract.endSeason - season + 1;
  if (yearsRemaining < 2) {
    return gameError("INVALID_STATE", "Loans require at least two remaining contract years");
  }
  if (player.contract.role !== "prospect" && player.contract.role !== "rotation") {
    return gameError("INVALID_STATE", "Only prospect or rotation players can be loaned");
  }
  if (promisedRole !== "starter" && promisedRole !== "rotation") {
    return gameError("INVALID_STATE", "Destination must promise a starter or rotation role");
  }
  const contract: Contract = {
    ...player.contract,
    clubId: destination.id,
    parentClubId: player.clubId,
    role: promisedRole,
  };
  return { ok: true, value: { ...player, clubId: destination.id as ClubId, contract } };
};

export const transferRandomEventNoise = (rng: RngState): RngState => nextFloat(rng).state;
