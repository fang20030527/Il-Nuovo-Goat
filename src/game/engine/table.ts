import type { ClubId } from "@/game/domain/ids";
import type { LeagueTableRow, MatchResult } from "@/game/domain/competition";

export const createEmptyTable = (clubs: readonly ClubId[]): LeagueTableRow[] =>
  clubs.map((id) => ({
    clubId: id, played: 0, won: 0, drawn: 0, lost: 0,
    goalsFor: 0, goalsAgainst: 0, points: 0,
  }));

export const applyLeagueResult = (
  table: readonly LeagueTableRow[],
  result: MatchResult,
): LeagueTableRow[] => {
  const homeWon = result.homeGoals > result.awayGoals;
  const awayWon = result.awayGoals > result.homeGoals;
  const drawn = result.homeGoals === result.awayGoals;
  return table.map((row) => {
    if (row.clubId === result.homeClubId) {
      return {
        ...row,
        played: row.played + 1,
        won: row.won + (homeWon ? 1 : 0),
        drawn: row.drawn + (drawn ? 1 : 0),
        lost: row.lost + (awayWon ? 1 : 0),
        goalsFor: row.goalsFor + result.homeGoals,
        goalsAgainst: row.goalsAgainst + result.awayGoals,
        points: row.points + (homeWon ? 3 : drawn ? 1 : 0),
      };
    }
    if (row.clubId === result.awayClubId) {
      return {
        ...row,
        played: row.played + 1,
        won: row.won + (awayWon ? 1 : 0),
        drawn: row.drawn + (drawn ? 1 : 0),
        lost: row.lost + (homeWon ? 1 : 0),
        goalsFor: row.goalsFor + result.awayGoals,
        goalsAgainst: row.goalsAgainst + result.homeGoals,
        points: row.points + (awayWon ? 3 : drawn ? 1 : 0),
      };
    }
    return row;
  });
};

export const sortTable = (table: readonly LeagueTableRow[]): LeagueTableRow[] =>
  [...table].sort((a, b) =>
    b.points - a.points
    || (b.goalsFor - b.goalsAgainst) - (a.goalsFor - a.goalsAgainst)
    || b.goalsFor - a.goalsFor
    || b.won - a.won
    || (a.clubId < b.clubId ? -1 : 1),
  );
