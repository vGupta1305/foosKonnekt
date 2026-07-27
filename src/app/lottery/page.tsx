import { getLotteryData } from "@/lib/actions/lottery";
import { LotteryView } from "@/components/lottery/lottery-view";
import { MAX_PLAYERS_PER_TIER } from "@/lib/validations/player";
import { verifySession } from "@/lib/auth";

export const dynamic = "force-dynamic";

export default async function LotteryPage() {
  const [{ teams, tierAPlayers, lotteryComplete }, session] = await Promise.all([
    getLotteryData(),
    verifySession(),
  ]);

  return (
    <div className="mx-auto w-full max-w-3xl flex-1 px-4 py-8 sm:px-6">
      <div className="mb-6 flex flex-col gap-1">
        <h1 className="text-2xl font-semibold tracking-tight">Tier A Lottery</h1>
        <p className="text-sm text-muted-foreground">
          Tier A players ({MAX_PLAYERS_PER_TIER} total) are drawn by lot and
          assigned one per team, free of charge. The remaining players are
          auctioned normally.
        </p>
      </div>
      <LotteryView
        isAdmin={session?.role === "ADMIN"}
        teams={teams.map((t) => ({ id: t.id, name: t.name }))}
        tierAPlayers={tierAPlayers.map((p) => ({
          id: p.id,
          name: p.name,
          teamName: p.team?.name ?? null,
        }))}
        lotteryComplete={lotteryComplete}
      />
    </div>
  );
}
