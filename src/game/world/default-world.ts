import { clubId, countryId, leagueId } from "@/game/domain/ids";
import type { Club, ClubStyle, World } from "@/game/domain/world";

interface CountrySeed {
  readonly id: string;
  readonly name: string;
  readonly locations: readonly string[];
}

const countrySeeds: readonly CountrySeed[] = [
  { id: "northland", name: "Northland", locations: [
    "Aster Vale", "Ironford", "Greyhaven", "Morrow Bay", "Highmere",
    "Stonewick", "Cedar Crown", "Brindle", "Foxbridge", "Northwatch",
    "Elmstead", "Rookport", "Frostmere", "Dunmarsh", "Oakcross",
    "Raven Fell", "Whitecliff", "Briar Gate", "Kestrel", "Westbarrow",
  ] },
  { id: "solaria", name: "Solaria", locations: [
    "Luz Marina", "Costa Dorada", "Valmora", "Sierra Azul", "Puerto Alba",
    "Rio Claro", "Monteluz", "San Vero", "Cobre Vista", "Isla Verde",
    "Campo Rojo", "Nueva Estrella", "Bahia Sur", "Piedra Sol", "Las Palmas",
    "Miraflor", "Torrenube", "Prado Alto", "Vela Cruz", "Arena Blanca",
  ] },
  { id: "verdancia", name: "Verdancia", locations: [
    "Greenwall", "Lake Ember", "Willow City", "Pine Harbour", "Meadowgate",
    "Brookfield", "Ashbourne", "Holloway", "Mossley", "Riverglass",
    "Fernhill", "Maple Junction", "Orchard Row", "Woodmere", "Claybank",
    "Roseford", "Birch Point", "Thistle End", "Hazelton", "Millgrove",
  ] },
  { id: "eastria", name: "Eastria", locations: [
    "Akebono", "Jade Harbour", "Sun Crane", "Lotus Gate", "Silver Pagoda",
    "Red Maple", "Moonbridge", "Cloud Peak", "Pearl River", "Golden Field",
    "Bamboo Coast", "Morning Bell", "Pine Lantern", "Azure Steppe", "Plum City",
    "Quiet Bay", "Sky Temple", "Amber Road", "Snow Blossom", "Eastwind",
  ] },
] as const;

const clampRating = (value: number): number => Math.max(1, Math.min(100, Math.round(value)));
const styles: readonly ClubStyle[] = ["balanced", "pressing", "counter", "possession", "direct"];

const makeClub = (countryIndex: number, country: CountrySeed, location: string, index: number): Club => {
  const level = index < 10 ? 1 : 2;
  const withinDivision = index % 10;
  const base = (level === 1 ? 76 : 58) - withinDivision * 2 + countryIndex;
  const slug = location.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/(^-|-$)/g, "");
  return {
    id: clubId(`${country.id}-${slug}`),
    name: `${location} ${level === 1 ? "Athletic" : "Union"}`,
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
  northland: 78, solaria: 84, verdancia: 71, eastria: 66,
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
      name: `${seed.name} ${level === 1 ? "Premier Division" : "Second Division"}`,
      level,
    })),
  );
  const clubs = countrySeeds.flatMap((seed, countryIndex) =>
    seed.locations.map((location, index) => makeClub(countryIndex, seed, location, index)),
  );
  return { schemaVersion: 1, countries, leagues, clubs };
};
