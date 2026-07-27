"use server";

import { revalidatePath } from "next/cache";
import { prisma } from "@/lib/prisma";
import type { ActionResult } from "@/lib/actions/players";
import { requireAdmin } from "@/lib/auth";

function revalidateAll() {
  for (const path of [
    "/",
    "/players",
    "/owners",
    "/auction",
    "/fixtures",
    "/standings",
    "/playoffs",
    "/stats",
    "/admin",
  ]) {
    revalidatePath(path);
  }
}

export async function getAllMatches() {
  return prisma.match.findMany({
    include: {
      homeTeam: { select: { name: true } },
      awayTeam: { select: { name: true } },
      games: true,
    },
    orderBy: [{ stage: "asc" }, { order: "asc" }],
  });
}

export async function resetTournament(): Promise<ActionResult> {
  const authError = await requireAdmin();
  if (authError) return authError;

  await prisma.$transaction(async (tx) => {
    await tx.game.deleteMany();
    await tx.match.deleteMany();
    await tx.team.deleteMany();
    await tx.player.updateMany({
      data: { teamId: null, auctionPrice: null, auctionOrder: 0 },
    });
    const owners = await tx.owner.findMany();
    for (const owner of owners) {
      await tx.owner.update({
        where: { id: owner.id },
        data: { remainingBudget: owner.startingBudget },
      });
    }
  });

  revalidateAll();
  return { ok: true, data: undefined };
}

export async function undoMatch(matchId: string): Promise<ActionResult> {
  const authError = await requireAdmin();
  if (authError) return authError;

  await prisma.$transaction([
    prisma.game.deleteMany({ where: { matchId } }),
    prisma.match.update({
      where: { id: matchId },
      data: { homeScore: 0, awayScore: 0, completed: false, winnerTeamId: null },
    }),
  ]);

  revalidateAll();
  return { ok: true, data: undefined };
}

export async function deleteMatch(matchId: string): Promise<ActionResult> {
  const authError = await requireAdmin();
  if (authError) return authError;

  await prisma.match.delete({ where: { id: matchId } });
  revalidateAll();
  return { ok: true, data: undefined };
}

export async function exportTournamentData() {
  const [owners, teams, players, matches, games] = await Promise.all([
    prisma.owner.findMany(),
    prisma.team.findMany(),
    prisma.player.findMany(),
    prisma.match.findMany(),
    prisma.game.findMany(),
  ]);

  return { owners, teams, players, matches, games, exportedAt: new Date().toISOString() };
}

const ISO_DATE_RE = /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}(\.\d+)?Z$/;

function reviveDates<T extends Record<string, unknown>>(record: T): T {
  const revived: Record<string, unknown> = { ...record };
  for (const [key, value] of Object.entries(revived)) {
    if (typeof value === "string" && ISO_DATE_RE.test(value)) {
      revived[key] = new Date(value);
    }
  }
  return revived as T;
}

export async function importTournamentData(data: unknown): Promise<ActionResult> {
  const authError = await requireAdmin();
  if (authError) return authError;

  const payload = data as {
    owners?: Record<string, unknown>[];
    teams?: Record<string, unknown>[];
    players?: Record<string, unknown>[];
    matches?: Record<string, unknown>[];
    games?: Record<string, unknown>[];
  };

  if (!payload || typeof payload !== "object") {
    return { ok: false, error: "Invalid tournament file" };
  }

  try {
    await prisma.$transaction(async (tx) => {
      await tx.game.deleteMany();
      await tx.match.deleteMany();
      await tx.player.deleteMany();
      await tx.team.deleteMany();
      await tx.owner.deleteMany();

      for (const owner of payload.owners ?? []) {
        await tx.owner.create({ data: reviveDates(owner) as never });
      }
      for (const team of payload.teams ?? []) {
        await tx.team.create({ data: reviveDates(team) as never });
      }
      for (const player of payload.players ?? []) {
        await tx.player.create({ data: reviveDates(player) as never });
      }
      for (const match of payload.matches ?? []) {
        await tx.match.create({ data: reviveDates(match) as never });
      }
      for (const game of payload.games ?? []) {
        await tx.game.create({ data: reviveDates(game) as never });
      }
    });
  } catch {
    return { ok: false, error: "Could not import this file. It may be corrupted or incompatible." };
  }

  revalidateAll();
  return { ok: true, data: undefined };
}
