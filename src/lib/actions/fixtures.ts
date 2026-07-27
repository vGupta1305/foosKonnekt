"use server";

import { revalidatePath } from "next/cache";
import { prisma } from "@/lib/prisma";
import type { ActionResult } from "@/lib/actions/players";
import { MAX_PLAYERS } from "@/lib/validations/player";
import { requireAdmin } from "@/lib/auth";

export async function getLeagueMatches() {
  return prisma.match.findMany({
    where: { stage: "LEAGUE" },
    include: {
      homeTeam: { select: { id: true, name: true } },
      awayTeam: { select: { id: true, name: true } },
      games: true,
    },
    orderBy: { order: "asc" },
  });
}

export async function generateFixtures(options?: {
  regenerate?: boolean;
}): Promise<ActionResult<{ created: number }>> {
  const authError = await requireAdmin();
  if (authError) return authError;

  const existing = await prisma.match.findMany({ where: { stage: "LEAGUE" } });

  if (existing.length > 0 && !options?.regenerate) {
    return { ok: false, error: "Fixtures have already been generated" };
  }

  // Auction must fully conclude before the league starts.
  const totalPlayers = await prisma.player.count();
  if (totalPlayers < MAX_PLAYERS) {
    return {
      ok: false,
      error: `All ${MAX_PLAYERS} players must be registered first (currently ${totalPlayers})`,
    };
  }
  const unsoldPlayers = await prisma.player.count({ where: { teamId: null } });
  if (unsoldPlayers > 0) {
    return {
      ok: false,
      error: `${unsoldPlayers} player(s) are still unsold — finish the auction before generating fixtures`,
    };
  }

  const teams = await prisma.team.findMany({ orderBy: { createdAt: "asc" } });
  if (teams.length < 2) {
    return { ok: false, error: "Need at least two teams to generate fixtures" };
  }

  if (existing.length > 0 && options?.regenerate) {
    // Qualifier/Grand Final are derived from league standings, so they go
    // stale the moment league results change underneath them — clear them too.
    await prisma.match.deleteMany({
      where: { stage: { in: ["LEAGUE", "QUALIFIER", "GRAND_FINAL"] } },
    });
  }

  const pairs: { homeTeamId: string; awayTeamId: string }[] = [];
  for (let i = 0; i < teams.length; i++) {
    for (let j = i + 1; j < teams.length; j++) {
      pairs.push({ homeTeamId: teams[i].id, awayTeamId: teams[j].id });
    }
  }

  await prisma.match.createMany({
    data: pairs.map((pair, index) => ({
      stage: "LEAGUE" as const,
      homeTeamId: pair.homeTeamId,
      awayTeamId: pair.awayTeamId,
      order: index,
    })),
  });

  revalidatePath("/fixtures");
  revalidatePath("/standings");
  revalidatePath("/playoffs");
  return { ok: true, data: { created: pairs.length } };
}
