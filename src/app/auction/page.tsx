import Link from "next/link";
import { getAuctionData } from "@/lib/actions/auction";
import { AuctionBoard } from "@/components/auction/auction-board";
import { MAX_BID, MIN_BID } from "@/lib/constants/auction";
import { verifySession } from "@/lib/auth";

export const dynamic = "force-dynamic";

export default async function AuctionPage() {
  const [{ teams, unsoldPlayers, lotteryComplete }, session] = await Promise.all([
    getAuctionData(),
    verifySession(),
  ]);

  return (
    <div className="mx-auto w-full max-w-6xl flex-1 px-4 py-8 sm:px-6">
      <div className="mb-6 flex flex-col gap-1">
        <h1 className="text-2xl font-semibold tracking-tight">Auction</h1>
        <p className="text-sm text-muted-foreground">
          The auctioned players come up in random order. Bids must be
          between {MIN_BID} and {MAX_BID}. Allocated players are drawn by
          lottery, not bid on here.
        </p>
      </div>
      {!lotteryComplete && (
        <div className="mb-6 flex items-center justify-between rounded-lg border border-accent/40 bg-accent/10 px-4 py-3 text-sm text-accent">
          <span>Run the allocation lottery before starting the bidding auction.</span>
          <Link href="/lottery" className="font-medium underline underline-offset-2">
            Go to lottery
          </Link>
        </div>
      )}
      <AuctionBoard
        isAdmin={session?.role === "ADMIN"}
        teams={teams.map((t) => ({
          id: t.id,
          name: t.name,
          ownerName: t.owner.name,
          remainingBudget: t.owner.remainingBudget,
          players: t.players.map((p) => ({
            id: p.id,
            name: p.name,
            auctionPrice: p.auctionPrice,
          })),
        }))}
        unsoldPlayers={unsoldPlayers.map((p) => ({
          id: p.id,
          name: p.name,
        }))}
      />
    </div>
  );
}
