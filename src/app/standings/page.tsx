import { getStandings } from "@/lib/actions/standings";
import { StandingsTable } from "@/components/standings/standings-table";
import { StandingsChart } from "@/components/standings/standings-chart";
import { PrintButton } from "@/components/print-button";

export const dynamic = "force-dynamic";

export default async function StandingsPage() {
  const standings = await getStandings();

  return (
    <div className="mx-auto w-full max-w-5xl flex-1 px-4 py-8 sm:px-6">
      <div className="mb-6 flex flex-col gap-1">
        <h1 className="text-2xl font-semibold tracking-tight">Standings</h1>
        <p className="text-sm text-muted-foreground">
          Sorted by league points, head-to-head, game difference, goal
          difference, then goals scored.
        </p>
      </div>
      <div className="flex flex-col gap-6">
        <PrintButton label="Print standings" />
        <StandingsChart standings={standings} className="no-print" />
        <StandingsTable standings={standings} />
      </div>
    </div>
  );
}
