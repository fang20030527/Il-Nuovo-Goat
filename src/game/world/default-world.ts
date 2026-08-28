import { clubId, countryId, leagueId } from "@/game/domain/ids";
import type { Club, ClubStyle, World } from "@/game/domain/world";

interface CountrySeed {
  readonly id: string;
  readonly name: string;
  readonly locations: readonly string[];
}

const countrySeeds: readonly CountrySeed[] = [
  { id: "italy", name: "Italy", locations: [
    "Torino", "Milano", "Napoli", "Roma", "Firenze",
    "Bologna", "Genova", "Palermo", "Verona", "Bari",
    "Cagliari", "Parma", "Udine", "Brescia", "Lecce",
    "Como", "Empoli", "Salerno", "Sassuolo", "Monza",
  ] },
  { id: "england", name: "England", locations: [
    "London", "Manchester", "Liverpool", "Leeds", "Newcastle",
    "Birmingham", "Sheffield", "Nottingham", "Bristol", "Southampton",
    "Leicester", "Brighton", "Wolverhampton", "Derby", "Norwich",
    "Middlesbrough", "Sunderland", "Coventry", "Plymouth", "Portsmouth",
  ] },
  { id: "spain", name: "Spain", locations: [
    "Madrid", "Barcelona", "Sevilla", "Valencia", "Bilbao",
    "San Sebastian", "Villarreal", "Malaga", "Granada", "Zaragoza",
    "Valladolid", "Santander", "Coruna", "Oviedo", "Murcia",
    "Pamplona", "Almeria", "Cadiz", "Huesca", "Gijon",
  ] },
  { id: "germany", name: "Germany", locations: [
    "Munich", "Berlin", "Hamburg", "Cologne", "Frankfurt",
    "Dortmund", "Leipzig", "Stuttgart", "Bremen", "Hanover",
    "Dusseldorf", "Nuremberg", "Freiburg", "Mainz", "Augsburg",
    "Bielefeld", "Karlsruhe", "Bochum", "Rostock", "Kiel",
  ] },
] as const;

const clampRating = (value: number): number => Math.max(1, Math.min(100, Math.round(value)));
const styles: readonly ClubStyle[] = ["balanced", "pressing", "counter", "possession", "direct"];

const clubPrefix = (countryId: string, location: string, level: number): string => {
  if (countryId === "italy") {
    const prefixes = ["AC", "SSC", "AS", "FC", "UC", "SS", "US", "Calcio"];
    return `${prefixes[location.length % prefixes.length]} ${location}`;
  }
  if (countryId === "england") {
    if (level === 1) return `${location} ${["United", "City", "FC", "Rovers", "Athletic"][location.length % 5]}`;
    return `${location} ${["FC", "Town", "Wanderers", "Albion", "County"][location.length % 5]}`;
  }
  if (countryId === "spain") {
    const prefixes = ["Real", "Atletico", "Deportivo", "CF", "UD"];
    return `${prefixes[location.length % prefixes.length]} ${location}`;
  }
  if (countryId === "germany") {
    if (level === 1) return `${["FC Bayern", "Borussia", "Bayer", "VfL", "SV"][location.length % 5]} ${location}`;
    return `${["FC", "VfB", "TSV", "SC", "Rot-Weiss"][location.length % 5]} ${location}`;
  }
  return `${location} FC`;
};

const makeClub = (countryIndex: number, country: CountrySeed, location: string, index: number): Club => {
  const level = index < 10 ? 1 : 2;
  const withinDivision = index % 10;
  const base = (level === 1 ? 76 : 58) - withinDivision * 2 + countryIndex;
  const slug = location.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/(^-|-$)/g, "");
  const name = clubPrefix(country.id, location, level);
  return {
    id: clubId(`${country.id}-${slug}`),
    name,
    countryId: countryId(country.id),
    leagueId: leagueId(`${country.id}-${level}`),
    reputation: clampRating(base + 4),
    finances: clampRating(base + (withinDivision % 3) * 2),
    academy: clampRating(base - 3 + ((withinDivision + countryIndex) % 5) * 3),
    facilities: clampRating(base),
    lines: {
      goalkeeper: clampRating(base + ((withinDivision + 1) % 4) - 2),
      defender: clampRating(base + ((withinDivision + 2) % 5) - 2),
      midfielder: clampRating(base + ((withinDivision + 3) % 5) - 2),
      forward: clampRating(base + ((withinDivision + 4) % 5) - 2),
    },
    style: styles[(withinDivision + countryIndex) % styles.length]!,
    homeAdvantage: 3 + ((withinDivision + countryIndex) % 4),
  };
};

const nationalStrengths: Record<string, number> = {
  italy: 86, england: 88, spain: 85, germany: 84,
};

export const createDefaultWorld = (): World => {
  const countries = countrySeeds.map((seed) => ({
    id: countryId(seed.id),
    name: seed.name,
    nationalTeamStrength: nationalStrengths[seed.id] ?? 70,
  }));
  const leagues = countrySeeds.flatMap((seed) =>
    ([1, 2] as const).map((level) => ({
      id: leagueId(`${seed.id}-${level}`),
      countryId: countryId(seed.id),
      name: seed.id === "italy"
        ? (level === 1 ? "Serie A" : "Serie B")
        : seed.id === "england"
          ? (level === 1 ? "Premier League" : "Championship")
          : seed.id === "spain"
            ? (level === 1 ? "La Liga" : "La Liga 2")
            : (level === 1 ? "Bundesliga" : "2. Bundesliga"),
      level,
    })),
  );
  const clubs = countrySeeds.flatMap((seed, countryIndex) =>
    seed.locations.map((location, index) => makeClub(countryIndex, seed, location, index)),
  );
  return { schemaVersion: 1, countries, leagues, clubs };
};
