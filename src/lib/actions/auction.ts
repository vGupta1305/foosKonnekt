"use server";

import { revalidatePath } from "next/cache";
import { prisma } from "@/lib/prisma";
import { ensureTeams } from "@/lib/actions/teams";
import type { ActionResult } from "@/lib/actions/players";
import { MAX_BID, MAX_PLAYERS_PER_TEAM, MIN_BID, TIER_AUCTION_ORDER } from "@/lib/constants/auction";
import { ActionError, runSerializable } from "@/lib/serializable-transaction";
import { requireAdmin } from "@/lib/auth";
import type { Prisma } from "@/generated/prisma/client";

type ActiveTier = (typeof TIER_AUCTION_ORDER)[number] | "UNTIERED";

function shuffle<T>(items: T[]): T[] {
  const arr = [...items];
  for (let i = arr.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [arr[i], arr[j]] = [arr[j], arr[i]];
  }
  return arr;
}

/**
 * Auction proceeds tier by tier (B, then C, then D; untiered players last as a
 * fallback bucket), never mixed. Returns the first tier that still has an
 * unsold player, or null once B/C/D (and any untiered players) are all sold.
 */
async function getCurrentAuctionTier(
  tx: Prisma.TransactionClient,
): Promise<ActiveTier | null> {
  for (const tier of TIER_AUCTION_ORDER) {
    const count = await tx.player.count({ where: { tier, teamId: null } });
    if (count > 0) return tier;
  }
  const untiered = await tx.player.count({ where: { tier: null, teamId: null } });
  if (untiered > 0) return "UNTIERED";
  return null;
}

/**
 * The first time a tier becomes active, randomize the order its players are
 * presented in (persisted via auctionOrder so it survives page reloads).
 * Detected by "every player in this tier still has the default auctionOrder
 * of 0" — skip() only ever increases a player's own auctionOrder, so a tier
 * that's already in progress will never look all-zero again.
 */
async function ensureTierShuffled(tx: Prisma.TransactionClient, tier: ActiveTier) {
  const where = tier === "UNTIERED" ? { tier: null, teamId: null } : { tier, teamId: null };
  const players = await tx.player.findMany({ where });
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
  const teams = await ensureTeams();
  const tierAPending = await prisma.player.count({ where: { tier: "A", teamId: null } });

  const currentTier = await runSerializable(async (tx) => {
    const tier = await getCurrentAuctionTier(tx);
    if (tier) await ensureTierShuffled(tx, tier);
    return tier;
  });

  const unsoldPlayers = currentTier
    ? await prisma.player.findMany({
        where:
          currentTier === "UNTIERED"
            ? { tier: null, teamId: null }
            : { tier: currentTier, teamId: null },
        orderBy: [{ auctionOrder: "asc" }, { createdAt: "asc" }],
      })
    : [];

  return {
    teams,
    unsoldPlayers,
    lotteryComplete: tierAPending === 0,
    currentTier,
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
        throw new ActionError("Tier A players are assigned by lottery, not sold in the auction");
      }

      const currentTier = await getCurrentAuctionTier(tx);
      const playerTier: ActiveTier = player.tier ?? "UNTIERED";
      if (currentTier !== playerTier) {
        throw new ActionError(
          currentTier
            ? `Tier ${currentTier === "UNTIERED" ? "(untiered)" : currentTier} is currently up for auction — this player isn't in that group yet`
            : "The auction has already ended",
        );
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

      if (player.tier && team.players.some((p) => p.tier === player.tier)) {
        throw new ActionError(`${team.name} already has a Tier ${player.tier} player`);
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

export async function skipPlayer(playerId: string): Promise<ActionResult> {
  const authError = await requireAdmin();
  if (authError) return authError;

  const max = await prisma.player.aggregate({ _max: { auctionOrder: true } });
  await prisma.player.update({
    where: { id: playerId },
    data: { auctionOrder: (max._max.auctionOrder ?? 0) + 1 },
  });

  revalidatePath("/auction");
  return { ok: true, data: undefined };
}
