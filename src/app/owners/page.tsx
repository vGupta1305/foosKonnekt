import { getOwners } from "@/lib/actions/owners";
import { OwnerTable } from "@/components/owners/owner-table";
import { verifySession } from "@/lib/auth";

export const dynamic = "force-dynamic";

export default async function OwnersPage() {
  const [owners, session] = await Promise.all([getOwners(), verifySession()]);

  return (
    <div className="mx-auto w-full max-w-5xl flex-1 px-4 py-8 sm:px-6">
      <div className="mb-6 flex flex-col gap-1">
        <h1 className="text-2xl font-semibold tracking-tight">Team Owners</h1>
        <p className="text-sm text-muted-foreground">
          Five fixed team owner slots. Set each owner&apos;s name, an optional
          team name, and starting auction budget before the auction begins.
        </p>
      </div>
      <OwnerTable
        isAdmin={session?.role === "ADMIN"}
        owners={owners.map((o) => ({
          id: o.id,
          name: o.name,
          teamNameDraft: o.teamName,
          startingBudget: o.startingBudget,
          remainingBudget: o.remainingBudget,
          createdTeamName: o.team?.name ?? null,
        }))}
      />
    </div>
  );
}
