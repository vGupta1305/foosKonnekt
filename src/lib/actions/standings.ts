import { prisma } from "@/lib/prisma";

export type StandingRow = {
  teamId: string;
  teamName: string;
  matchesPlayed: number;
  wins: number;
  losses: number;
  leaguePoints: number;
  gamesWon: number;
  gamesLost: number;
  gameDifference: number;
  goalsFor: number;
  goalsAgainst: number;
  goalDifference: number;
};

function leaguePointsForGamesWon(gamesWon: number): number {
  if (gamesWon === 3) return 3;
  if (gamesWon === 2) return 2;
  if (gamesWon === 1) return 1;
  return 0;
}

export async function getStandings(): Promise<StandingRow[]> {
  const teams = await prisma.team.findMany({ orderBy: { createdAt: "asc" } });
  const matches = await prisma.match.findMany({
    where: { stage: "LEAGUE", completed: true },
    include: { games: true },
  });

  const rows = new Map<string, StandingRow>();
  for (const team of teams) {
    rows.set(team.id, {
      teamId: team.id,
      teamName: team.name,
      matchesPlayed: 0,
      wins: 0,
      losses: 0,
      leaguePoints: 0,
      gamesWon: 0,
      gamesLost: 0,
      gameDifference: 0,
      goalsFor: 0,
      goalsAgainst: 0,
      goalDifference: 0,
    });
  }

  for (const match of matches) {
    const home = rows.get(match.homeTeamId);
    const away = rows.get(match.awayTeamId);
    if (!home || !away) continue;

    home.matchesPlayed += 1;
    away.matchesPlayed += 1;

    home.gamesWon += match.homeScore;
    home.gamesLost += match.awayScore;
    away.gamesWon += match.awayScore;
    away.gamesLost += match.homeScore;

    home.leaguePoints += leaguePointsForGamesWon(match.homeScore);
    away.leaguePoints += leaguePointsForGamesWon(match.awayScore);

    if (match.winnerTeamId === match.homeTeamId) {
      home.wins += 1;
      away.losses += 1;
    } else if (match.winnerTeamId === match.awayTeamId) {
      away.wins += 1;
      home.losses += 1;
    }

    for (const game of match.games) {
      home.goalsFor += game.scoreA;
      home.goalsAgainst += game.scoreB;
      away.goalsFor += game.scoreB;
      away.goalsAgainst += game.scoreA;
    }
  }

  for (const row of rows.values()) {
    row.gameDifference = row.gamesWon - row.gamesLost;
    row.goalDifference = row.goalsFor - row.goalsAgainst;
  }

  const list = [...rows.values()];

  // Group teams by league points, then resolve ties within each group using
  // only the matches played among that group's own members (a "mini-league"),
  // which correctly generalizes head-to-head to 3+-way ties instead of a
  // pairwise comparator that can be non-transitive.
  const byPoints = new Map<number, StandingRow[]>();
  for (const row of list) {
    const group = byPoints.get(row.leaguePoints) ?? [];
    group.push(row);
    byPoints.set(row.leaguePoints, group);
  }

  const orderedGroups = [...byPoints.entries()].sort(([a], [b]) => b - a);

  const result: StandingRow[] = [];
  for (const [, group] of orderedGroups) {
    if (group.length === 1) {
      result.push(group[0]);
      continue;
    }

    const groupIds = new Set(group.map((row) => row.teamId));
    const subPoints = new Map<string, number>(group.map((row) => [row.teamId, 0]));
    for (const match of matches) {
      if (!groupIds.has(match.homeTeamId) || !groupIds.has(match.awayTeamId)) continue;
      subPoints.set(
        match.homeTeamId,
        (subPoints.get(match.homeTeamId) ?? 0) + leaguePointsForGamesWon(match.homeScore),
      );
      subPoints.set(
        match.awayTeamId,
        (subPoints.get(match.awayTeamId) ?? 0) + leaguePointsForGamesWon(match.awayScore),
      );
    }

    const sortedGroup = [...group].sort((a, b) => {
      const spA = subPoints.get(a.teamId) ?? 0;
      const spB = subPoints.get(b.teamId) ?? 0;
      if (spA !== spB) return spB - spA;
      if (a.gameDifference !== b.gameDifference) return b.gameDifference - a.gameDifference;
      if (a.goalDifference !== b.goalDifference) return b.goalDifference - a.goalDifference;
      if (a.goalsFor !== b.goalsFor) return b.goalsFor - a.goalsFor;
      return 0;
    });

    result.push(...sortedGroup);
  }

  return result;
}
