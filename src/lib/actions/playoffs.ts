"use server";

import { revalidatePath } from "next/cache";
import { prisma } from "@/lib/prisma";
import { getStandings } from "@/lib/actions/standings";
import type { ActionResult } from "@/lib/actions/players";
import { requireAdmin } from "@/lib/auth";

export async function getPlayoffData() {
  const standings = await getStandings();
  const qualifier = await prisma.match.findFirst({
    where: { stage: "QUALIFIER" },
    include: {
      homeTeam: true,
      awayTeam: true,
      games: true,
    },
  });
  const grandFinal = await prisma.match.findFirst({
    where: { stage: "GRAND_FINAL" },
    include: {
      homeTeam: true,
      awayTeam: true,
      games: true,
    },
  });

  const pendingLeagueMatches = await prisma.match.count({
    where: { stage: "LEAGUE", completed: false },
  });

  const champion =
    grandFinal?.completed && grandFinal.winnerTeamId
      ? [grandFinal.homeTeam, grandFinal.awayTeam].find(
          (t) => t.id === grandFinal.winnerTeamId,
        )
      : null;

  return {
    standings,
    qualifier,
    grandFinal,
    leagueComplete: pendingLeagueMatches === 0 && standings.length > 0,
    champion,
  };
}

export async function generateQualifier(): Promise<ActionResult<{ matchId: string }>> {
  const authError = await requireAdmin();
  if (authError) return authError;

  const existing = await prisma.match.findFirst({ where: { stage: "QUALIFIER" } });
  if (existing) return { ok: false, error: "Qualifier has already been generated" };

  const pendingLeagueMatches = await prisma.match.count({
    where: { stage: "LEAGUE", completed: false },
  });
  if (pendingLeagueMatches > 0) {
    return { ok: false, error: "All league matches must be completed first" };
  }

  const standings = await getStandings();
  if (standings.length < 3) {
    return { ok: false, error: "Need at least 3 teams in the standings" };
  }

  const match = await prisma.match.create({
    data: {
      stage: "QUALIFIER",
      homeTeamId: standings[1].teamId,
      awayTeamId: standings[2].teamId,
      order: 0,
    },
  });

  revalidatePath("/playoffs");
  return { ok: true, data: { matchId: match.id } };
}

export async function generateGrandFinal(): Promise<ActionResult<{ matchId: string }>> {
  const authError = await requireAdmin();
  if (authError) return authError;

  const existing = await prisma.match.findFirst({ where: { stage: "GRAND_FINAL" } });
  if (existing) return { ok: false, error: "Grand Final has already been generated" };

  const qualifier = await prisma.match.findFirst({ where: { stage: "QUALIFIER" } });
  if (!qualifier || !qualifier.completed || !qualifier.winnerTeamId) {
    return { ok: false, error: "The qualifier must be completed first" };
  }

  const standings = await getStandings();
  if (standings.length < 1) {
    return { ok: false, error: "Standings are not available" };
  }

  const match = await prisma.match.create({
    data: {
      stage: "GRAND_FINAL",
      homeTeamId: standings[0].teamId,
      awayTeamId: qualifier.winnerTeamId,
      order: 0,
    },
  });

  revalidatePath("/playoffs");
  return { ok: true, data: { matchId: match.id } };
}
