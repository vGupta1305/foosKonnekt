import { prisma } from "@/lib/prisma";
import { getStandings } from "@/lib/actions/standings";

export type PlayerStatRow = {
  playerId: string;
  playerName: string;
  teamName: string | null;
  gamesPlayed: number;
  gamesWon: number;
  gamesLost: number;
  winPct: number;
  goalsScored: number;
  goalsConceded: number;
};

export type TeamStatRow = {
  teamId: string;
  teamName: string;
  leaguePoints: number;
  matchesWon: number;
  matchesLost: number;
  gamesWon: number;
  gamesLost: number;
  goalsFor: number;
  goalsAgainst: number;
  goalDifference: number;
  winningPct: number;
  longestWinningStreak: number;
  averageGoals: number;
};

export async function getPlayerStats(): Promise<PlayerStatRow[]> {
  const [players, games] = await Promise.all([
    prisma.player.findMany({
      include: { team: { select: { name: true } } },
    }),
    prisma.game.findMany({
      select: {
        teamAPlayer1Id: true,
        teamAPlayer2Id: true,
        teamBPlayer1Id: true,
        teamBPlayer2Id: true,
        winner: true,
        scoreA: true,
        scoreB: true,
      },
    }),
  ]);

  const stats = new Map<
    string,
    { gamesPlayed: number; gamesWon: number; goalsScored: number; goalsConceded: number }
  >();

  function bump(
    playerId: string,
    side: "A" | "B",
    winner: string | null,
    scoreA: number,
    scoreB: number,
  ) {
    const entry = stats.get(playerId) ?? {
      gamesPlayed: 0,
      gamesWon: 0,
      goalsScored: 0,
      goalsConceded: 0,
    };
    entry.gamesPlayed += 1;
    if (winner === (side === "A" ? "TEAM_A" : "TEAM_B")) entry.gamesWon += 1;
    entry.goalsScored += side === "A" ? scoreA : scoreB;
    entry.goalsConceded += side === "A" ? scoreB : scoreA;
    stats.set(playerId, entry);
  }

  for (const game of games) {
    bump(game.teamAPlayer1Id, "A", game.winner, game.scoreA, game.scoreB);
    bump(game.teamAPlayer2Id, "A", game.winner, game.scoreA, game.scoreB);
    bump(game.teamBPlayer1Id, "B", game.winner, game.scoreA, game.scoreB);
    bump(game.teamBPlayer2Id, "B", game.winner, game.scoreA, game.scoreB);
  }

  return players
    .map((p) => {
      const s = stats.get(p.id) ?? {
        gamesPlayed: 0,
        gamesWon: 0,
        goalsScored: 0,
        goalsConceded: 0,
      };
      return {
        playerId: p.id,
        playerName: p.name,
        teamName: p.team?.name ?? null,
        gamesPlayed: s.gamesPlayed,
        gamesWon: s.gamesWon,
        gamesLost: s.gamesPlayed - s.gamesWon,
        winPct: s.gamesPlayed > 0 ? Math.round((s.gamesWon / s.gamesPlayed) * 1000) / 10 : 0,
        goalsScored: s.goalsScored,
        goalsConceded: s.goalsConceded,
      };
    })
    .sort((a, b) => b.winPct - a.winPct || b.gamesPlayed - a.gamesPlayed);
}

export async function getTeamStats(): Promise<TeamStatRow[]> {
  const [standings, teams, matches] = await Promise.all([
    getStandings(),
    prisma.team.findMany(),
    prisma.match.findMany({
      where: { completed: true },
      include: { games: true },
      orderBy: { createdAt: "asc" },
    }),
  ]);

  const rows: TeamStatRow[] = teams.map((team) => {
    const teamMatches = matches.filter(
      (m) => m.homeTeamId === team.id || m.awayTeamId === team.id,
    );

    let longestStreak = 0;
    let currentStreak = 0;
    let matchesWon = 0;
    let matchesLost = 0;
    let gamesWon = 0;
    let gamesLost = 0;
    let goalsFor = 0;
    let goalsAgainst = 0;

    for (const m of teamMatches) {
      const isHome = m.homeTeamId === team.id;
      const won = m.winnerTeamId === team.id;
      currentStreak = won ? currentStreak + 1 : 0;
      longestStreak = Math.max(longestStreak, currentStreak);
      if (won) matchesWon += 1;
      else matchesLost += 1;

      gamesWon += isHome ? m.homeScore : m.awayScore;
      gamesLost += isHome ? m.awayScore : m.homeScore;

      for (const g of m.games) {
        goalsFor += isHome ? g.scoreA : g.scoreB;
        goalsAgainst += isHome ? g.scoreB : g.scoreA;
      }
    }

    const totalGames = gamesWon + gamesLost;
    const standingRow = standings.find((s) => s.teamId === team.id);

    return {
      teamId: team.id,
      teamName: team.name,
      leaguePoints: standingRow?.leaguePoints ?? 0,
      matchesWon,
      matchesLost,
      gamesWon,
      gamesLost,
      goalsFor,
      goalsAgainst,
      goalDifference: goalsFor - goalsAgainst,
      winningPct:
        teamMatches.length > 0 ? Math.round((matchesWon / teamMatches.length) * 1000) / 10 : 0,
      longestWinningStreak: longestStreak,
      averageGoals: totalGames > 0 ? Math.round((goalsFor / totalGames) * 10) / 10 : 0,
    };
  });

  return rows.sort((a, b) => b.leaguePoints - a.leaguePoints);
}
