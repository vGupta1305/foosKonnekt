import { getPlayoffData } from "@/lib/actions/playoffs";
import { PlayoffsView } from "@/components/playoffs/playoffs-view";
import { verifySession } from "@/lib/auth";

export const dynamic = "force-dynamic";

export default async function PlayoffsPage() {
  const [data, session] = await Promise.all([getPlayoffData(), verifySession()]);

  return (
    <div className="mx-auto w-full max-w-3xl flex-1 px-4 py-8 sm:px-6">
      <div className="mb-6 flex flex-col gap-1">
        <h1 className="text-2xl font-semibold tracking-tight">Playoffs</h1>
        <p className="text-sm text-muted-foreground">
          Qualifier: 2nd vs 3rd place. Grand Final: 1st place vs the
          qualifier winner. No participation restrictions.
        </p>
      </div>
      <PlayoffsView
        isAdmin={session?.role === "ADMIN"}
        standings={data.standings}
        leagueComplete={data.leagueComplete}
        qualifier={
          data.qualifier
            ? {
                id: data.qualifier.id,
                homeTeamName: data.qualifier.homeTeam.name,
                awayTeamName: data.qualifier.awayTeam.name,
                completed: data.qualifier.completed,
                homeScore: data.qualifier.homeScore,
                awayScore: data.qualifier.awayScore,
              }
            : null
        }
        grandFinal={
          data.grandFinal
            ? {
                id: data.grandFinal.id,
                homeTeamName: data.grandFinal.homeTeam.name,
                awayTeamName: data.grandFinal.awayTeam.name,
                completed: data.grandFinal.completed,
                homeScore: data.grandFinal.homeScore,
                awayScore: data.grandFinal.awayScore,
              }
            : null
        }
        championName={data.champion?.name ?? null}
      />
    </div>
  );
}
