import { getLeagueMatches } from "@/lib/actions/fixtures";
import { FixturesView } from "@/components/fixtures/fixtures-view";
import { verifySession } from "@/lib/auth";

export const dynamic = "force-dynamic";

export default async function FixturesPage() {
  const [matches, session] = await Promise.all([getLeagueMatches(), verifySession()]);

  return (
    <div className="mx-auto w-full max-w-4xl flex-1 px-4 py-8 sm:px-6">
      <div className="mb-6 flex flex-col gap-1">
        <h1 className="text-2xl font-semibold tracking-tight">Fixtures</h1>
        <p className="text-sm text-muted-foreground">
          Round-robin league schedule. Every team plays every other team once,
          across 3 games per matchup.
        </p>
      </div>
      <FixturesView
        isAdmin={session?.role === "ADMIN"}
        matches={matches.map((m) => ({
          id: m.id,
          homeTeamName: m.homeTeam.name,
          awayTeamName: m.awayTeam.name,
          completed: m.completed,
          homeScore: m.homeScore,
          awayScore: m.awayScore,
          gamesPlayed: m.games.length,
        }))}
      />
    </div>
  );
}
