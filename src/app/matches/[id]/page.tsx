import { notFound } from "next/navigation";
import { getMatch } from "@/lib/actions/matches";
import { MatchEntryForm } from "@/components/matches/match-entry-form";
import { PlayoffSeriesForm } from "@/components/matches/playoff-series-form";
import { verifySession } from "@/lib/auth";

export const dynamic = "force-dynamic";

export default async function MatchPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const [match, session] = await Promise.all([getMatch(id), verifySession()]);
  if (!match) notFound();
  const isAdmin = session?.role === "ADMIN";

  const homeTeam = {
    id: match.homeTeam.id,
    name: match.homeTeam.name,
    players: match.homeTeam.players.map((p) => ({ id: p.id, name: p.name })),
  };
  const awayTeam = {
    id: match.awayTeam.id,
    name: match.awayTeam.name,
    players: match.awayTeam.players.map((p) => ({ id: p.id, name: p.name })),
  };

  return (
    <div className="mx-auto w-full max-w-4xl flex-1 px-4 py-8 sm:px-6">
      <div className="mb-6 flex flex-col gap-1">
        <h1 className="text-2xl font-semibold tracking-tight">
          {match.homeTeam.name} vs {match.awayTeam.name}
        </h1>
        <p className="text-sm text-muted-foreground">
          {match.stage === "LEAGUE"
            ? "League matchup · 3 games · participation must follow the 2-2-1-1 rule"
            : match.stage === "QUALIFIER"
              ? "Qualifier · best of 3 · no participation restrictions"
              : "Grand Final · best of 5 · no participation restrictions"}
        </p>
      </div>
      {match.stage === "LEAGUE" ? (
        <MatchEntryForm
          matchId={match.id}
          stage={match.stage}
          isAdmin={isAdmin}
          homeTeam={homeTeam}
          awayTeam={awayTeam}
          existingGames={match.games.map((g) => ({
            teamAPlayer1Id: g.teamAPlayer1Id,
            teamAPlayer2Id: g.teamAPlayer2Id,
            teamBPlayer1Id: g.teamBPlayer1Id,
            teamBPlayer2Id: g.teamBPlayer2Id,
            winner: g.winner,
            scoreA: g.scoreA,
            scoreB: g.scoreB,
            notes: g.notes,
          }))}
        />
      ) : (
        <PlayoffSeriesForm
          matchId={match.id}
          stage={match.stage}
          isAdmin={isAdmin}
          homeTeam={homeTeam}
          awayTeam={awayTeam}
          existingGames={match.games.map((g) => ({
            gameNumber: g.gameNumber,
            teamAPlayer1Id: g.teamAPlayer1Id,
            teamAPlayer2Id: g.teamAPlayer2Id,
            teamBPlayer1Id: g.teamBPlayer1Id,
            teamBPlayer2Id: g.teamBPlayer2Id,
            winner: g.winner,
            scoreA: g.scoreA,
            scoreB: g.scoreB,
            notes: g.notes,
          }))}
          completed={match.completed}
          winnerTeamId={match.winnerTeamId}
          homeScore={match.homeScore}
          awayScore={match.awayScore}
        />
      )}
    </div>
  );
}
