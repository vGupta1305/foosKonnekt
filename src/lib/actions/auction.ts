"use server";

import { revalidatePath } from "next/cache";
import { prisma } from "@/lib/prisma";
import { ensureTeams } from "@/lib/actions/teams";
import type { ActionResult } from "@/lib/actions/players";
import { MAX_BID, MAX_PLAYERS_PER_TEAM, MIN_BID } from "@/lib/constants/auction";
import { ActionError, runSerializable } from "@/lib/serializable-transaction";
import { requireAdmin } from "@/lib/auth";
import type { Prisma } from "@/generated/prisma/client";

function shuffle<T>(items: T[]): T[] {
  const arr = [...items];
  for (let i = arr.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [arr[i], arr[j]] = [arr[j], arr[i]];
  }
  return arr;
}

function unsoldPoolWhere() {
  return { teamId: null, OR: [{ tier: null }, { tier: { not: "A" as const } }] };
}

/**
 * The first time the auction pool is touched, randomize the order the
 * remaining (non-allocated) players are presented in — persisted via
 * auctionOrder so it survives page reloads. Detected by "every unsold
 * non-A player still has the default auctionOrder of 0" — skip() only ever
 * increases a player's own auctionOrder, so a pool already in progress will
 * never look all-zero again.
 */
async function ensurePoolShuffled(tx: Prisma.TransactionClient) {
  const players = await tx.player.findMany({ where: unsoldPoolWhere() });
  if (players.length === 0) return;
  if (!players.every((p) => p.auctionOrder === 0)) return;

  const shuffled = shuffle(players);
  await Promise.all(
    shuffled.map((p, index) =>
      tx.player.update({ where: { id: p.id }, data: { auctionOrder: index + 1 } }),
    ),
  );
}

export async function getAuctionData() {
  const [teams, tierAPending] = await Promise.all([
    ensureTeams(),
    prisma.player.count({ where: { tier: "A", teamId: null } }),
  ]);

  await runSerializable(async (tx) => {
    await ensurePoolShuffled(tx);
  });

  // Allocated (Tier A) players are assigned by lottery, not bid on in the auction.
  // NOTE: `NOT: { tier: "A" }` would compile to `tier <> 'A'`, which excludes
  // NULL rows in Postgres — use an explicit OR so untiered players still show up.
  const unsoldPlayers = await prisma.player.findMany({
    where: unsoldPoolWhere(),
    orderBy: [{ auctionOrder: "asc" }, { createdAt: "asc" }],
  });

  return {
    teams,
    unsoldPlayers,
    lotteryComplete: tierAPending === 0,
  };
}

function revalidateAuction() {
  revalidatePath("/auction");
  revalidatePath("/players");
  revalidatePath("/owners");
}

export async function sellPlayer(
  playerId: string,
  teamId: string,
  price: number,
): Promise<ActionResult> {
  const authError = await requireAdmin();
  if (authError) return authError;

  if (!Number.isFinite(price) || price < MIN_BID || price > MAX_BID) {
    return { ok: false, error: `Bid must be between ${MIN_BID} and ${MAX_BID}` };
  }

  try {
    await runSerializable(async (tx) => {
      const player = await tx.player.findUnique({ where: { id: playerId } });
      if (!player) throw new ActionError("Player not found");
      if (player.teamId) throw new ActionError("Player is already sold");
      if (player.tier === "A") {
        throw new ActionError("Allocated players are assigned by lottery, not sold in the auction");
      }

      const team = await tx.team.findUnique({
        where: { id: teamId },
        include: { owner: true, players: true },
      });
      if (!team) throw new ActionError("Team not found");

      if (team.players.length >= MAX_PLAYERS_PER_TEAM) {
        throw new ActionError(
          `${team.name} already has the maximum of ${MAX_PLAYERS_PER_TEAM} players`,
        );
      }

      if (price > team.owner.remainingBudget) {
        throw new ActionError(`${team.owner.name} does not have enough budget`);
      }

      await tx.player.update({
        where: { id: playerId },
        data: { teamId: team.id, auctionPrice: price },
      });
      await tx.owner.update({
        where: { id: team.ownerId },
        data: { remainingBudget: team.owner.remainingBudget - price },
      });
    });
  } catch (error) {
    if (error instanceof ActionError) return { ok: false, error: error.message };
    throw error;
  }

  revalidateAuction();
  return { ok: true, data: undefined };
}

export async function reshufflePool(): Promise<ActionResult> {
  const authError = await requireAdmin();
  if (authError) return authError;

  await runSerializable(async (tx) => {
    const players = await tx.player.findMany({ where: unsoldPoolWhere() });
    const shuffled = shuffle(players);
    await Promise.all(
      shuffled.map((p, index) =>
        tx.player.update({ where: { id: p.id }, data: { auctionOrder: index + 1 } }),
      ),
    );
  });

  revalidatePath("/auction");
  return { ok: true, data: undefined };
}
