import { getPlayers } from "@/lib/actions/players";
import { PlayerTable } from "@/components/players/player-table";
import { verifySession } from "@/lib/auth";

export const dynamic = "force-dynamic";

export default async function PlayersPage() {
  const [players, session] = await Promise.all([getPlayers(), verifySession()]);

  return (
    <div className="mx-auto w-full max-w-5xl flex-1 px-4 py-8 sm:px-6">
      <div className="mb-6 flex flex-col gap-1">
        <h1 className="text-2xl font-semibold tracking-tight">Players</h1>
        <p className="text-sm text-muted-foreground">
          Manage the player pool ahead of the auction. Maximum 16 players. 4
          are allocated by lottery; the rest are auctioned.
        </p>
      </div>
      <PlayerTable
        isAdmin={session?.role === "ADMIN"}
        players={players.map((p) => ({
          id: p.id,
          name: p.name,
          tier: p.tier,
          position: p.position,
          auctionPrice: p.auctionPrice,
          teamName: p.team?.name ?? null,
        }))}
      />
    </div>
  );
}
