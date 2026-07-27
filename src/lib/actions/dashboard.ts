import { prisma } from "@/lib/prisma";
import { getPlayoffData } from "@/lib/actions/playoffs";

export async function ensureTournament() {
  const existing = await prisma.tournament.findFirst();
  if (existing) return existing;
  return prisma.tournament.create({ data: {} });
}

export async function getDashboardData() {
  const [tournament, totalPlayers, totalTeams, leagueMatches, allPendingMatches, playoffData, upcomingMatch] =
    await Promise.all([
      ensureTournament(),
      prisma.player.count(),
      prisma.team.count(),
      prisma.match.findMany({ where: { stage: "LEAGUE" } }),
      prisma.match.count({ where: { completed: false } }),
      getPlayoffData(),
      prisma.match.findFirst({
        where: { completed: false },
        include: {
          homeTeam: { select: { name: true } },
          awayTeam: { select: { name: true } },
        },
        orderBy: [{ stage: "asc" }, { order: "asc" }],
      }),
    ]);

  const leagueTotal = leagueMatches.length;
  const leagueCompleted = leagueMatches.filter((m) => m.completed).length;

  return {
    tournamentName: tournament.name,
    totalPlayers,
    totalTeams,
    leagueTotal,
    leagueCompleted,
    remainingMatches: allPendingMatches,
    standings: playoffData.standings.slice(0, 5),
    upcomingMatch: upcomingMatch
      ? {
          id: upcomingMatch.id,
          homeTeamName: upcomingMatch.homeTeam.name,
          awayTeamName: upcomingMatch.awayTeam.name,
          stage: upcomingMatch.stage,
        }
      : null,
    championName: playoffData.champion?.name ?? null,
  };
}
