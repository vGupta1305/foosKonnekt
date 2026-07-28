"use server";

import { revalidatePath } from "next/cache";
import { prisma } from "@/lib/prisma";
import { ensureTeams } from "@/lib/actions/teams";
import { MAX_PLAYERS_PER_TIER } from "@/lib/validations/player";
import type { ActionResult } from "@/lib/actions/players";
import { requireAdmin } from "@/lib/auth";

export async function getLotteryData() {
  const teams = await ensureTeams();
  const tierAPlayers = await prisma.player.findMany({
    where: { tier: "A" },
    include: { team: { select: { id: true, name: true } } },
    orderBy: { createdAt: "asc" },
  });

  const lotteryComplete =
    tierAPlayers.length === MAX_PLAYERS_PER_TIER &&
    tierAPlayers.every((p) => p.teamId != null);

  return { teams, tierAPlayers, lotteryComplete };
}

function shuffle<T>(items: T[]): T[] {
  const arr = [...items];
  for (let i = arr.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [arr[i], arr[j]] = [arr[j], arr[i]];
  }
  return arr;
}

export async function runLottery(): Promise<ActionResult<{ assignments: { playerName: string; teamName: string }[] }>> {
  const authError = await requireAdmin();
  if (authError) return authError;

  const teams = await ensureTeams();
  if (teams.length !== MAX_PLAYERS_PER_TIER) {
    return { ok: false, error: `Need exactly ${MAX_PLAYERS_PER_TIER} teams to run the lottery` };
  }

  const tierAPlayers = await prisma.player.findMany({ where: { tier: "A" } });
  if (tierAPlayers.length !== MAX_PLAYERS_PER_TIER) {
    return {
      ok: false,
      error: `Allocated must have exactly ${MAX_PLAYERS_PER_TIER} players (currently ${tierAPlayers.length})`,
    };
  }
  if (tierAPlayers.some((p) => p.teamId)) {
    return { ok: false, error: "The lottery has already been run" };
  }

  const shuffledPlayers = shuffle(tierAPlayers);
  const shuffledTeams = shuffle(teams);

  await prisma.$transaction(
    shuffledPlayers.map((player, index) =>
      prisma.player.update({
        where: { id: player.id },
        data: { teamId: shuffledTeams[index].id, auctionPrice: 0 },
      }),
    ),
  );

  revalidatePath("/lottery");
  revalidatePath("/auction");
  revalidatePath("/players");
  revalidatePath("/owners");

  return {
    ok: true,
    data: {
      assignments: shuffledPlayers.map((player, index) => ({
        playerName: player.name,
        teamName: shuffledTeams[index].name,
      })),
    },
  };
}
