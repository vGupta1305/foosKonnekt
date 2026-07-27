import { getPlayerStats, getTeamStats } from "@/lib/actions/statistics";
import { StatsView } from "@/components/stats/stats-view";

export const dynamic = "force-dynamic";

export default async function StatsPage() {
  const [playerStats, teamStats] = await Promise.all([
    getPlayerStats(),
    getTeamStats(),
  ]);

  return (
    <div className="mx-auto w-full max-w-5xl flex-1 px-4 py-8 sm:px-6">
      <div className="mb-6 flex flex-col gap-1">
        <h1 className="text-2xl font-semibold tracking-tight">Statistics</h1>
        <p className="text-sm text-muted-foreground">
          Player and team performance across every game played so far.
        </p>
      </div>
      <StatsView playerStats={playerStats} teamStats={teamStats} />
    </div>
  );
}
