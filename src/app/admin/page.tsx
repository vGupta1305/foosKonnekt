import { getAllMatches } from "@/lib/actions/admin";
import { AdminView } from "@/components/admin/admin-view";

export const dynamic = "force-dynamic";

export default async function AdminPage() {
  const matches = await getAllMatches();

  return (
    <div className="mx-auto w-full max-w-4xl flex-1 px-4 py-8 sm:px-6">
      <div className="mb-6 flex flex-col gap-1">
        <h1 className="text-2xl font-semibold tracking-tight">Admin</h1>
        <p className="text-sm text-muted-foreground">
          Manage matches, fixtures, and tournament data. Destructive actions
          require confirmation.
        </p>
      </div>
      <AdminView
        matches={matches.map((m) => ({
          id: m.id,
          stage: m.stage,
          homeTeamName: m.homeTeam.name,
          awayTeamName: m.awayTeam.name,
          completed: m.completed,
          gamesPlayed: m.games.length,
        }))}
      />
    </div>
  );
}
