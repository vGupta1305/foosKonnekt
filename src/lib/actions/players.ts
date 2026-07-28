"use server";

import { revalidatePath } from "next/cache";
import { prisma } from "@/lib/prisma";
import { requireAdmin } from "@/lib/auth";
import { ActionError, runSerializable } from "@/lib/serializable-transaction";
import {
  MAX_PLAYERS,
  MAX_PLAYERS_PER_TIER,
  PLAYER_TIERS,
  csvPlayerRowSchema,
  playerFormSchema,
} from "@/lib/validations/player";

export type ActionResult<T = undefined> =
  | { ok: true; data: T }
  | { ok: false; error: string };

export async function getPlayers() {
  return prisma.player.findMany({
    include: { team: { select: { id: true, name: true } } },
    orderBy: { createdAt: "asc" },
  });
}

export async function createPlayer(
  input: unknown,
): Promise<ActionResult<{ id: string }>> {
  const authError = await requireAdmin();
  if (authError) return authError;

  const parsed = playerFormSchema.safeParse(input);
  if (!parsed.success) {
    return { ok: false, error: parsed.error.issues[0]?.message ?? "Invalid input" };
  }

  try {
    const player = await runSerializable(async (tx) => {
      const count = await tx.player.count();
      if (count >= MAX_PLAYERS) {
        throw new ActionError(`Maximum of ${MAX_PLAYERS} players reached`);
      }

      if (parsed.data.tier) {
        const tierCount = await tx.player.count({ where: { tier: parsed.data.tier } });
        if (tierCount >= MAX_PLAYERS_PER_TIER) {
          throw new ActionError(
            `Allocated already has ${MAX_PLAYERS_PER_TIER} players`,
          );
        }
      }

      return tx.player.create({ data: parsed.data });
    });

    revalidatePath("/players");
    return { ok: true, data: { id: player.id } };
  } catch (error) {
    if (error instanceof ActionError) return { ok: false, error: error.message };
    throw error;
  }
}

export async function updatePlayer(
  id: string,
  input: unknown,
): Promise<ActionResult> {
  const authError = await requireAdmin();
  if (authError) return authError;

  const parsed = playerFormSchema.safeParse(input);
  if (!parsed.success) {
    return { ok: false, error: parsed.error.issues[0]?.message ?? "Invalid input" };
  }

  try {
    await runSerializable(async (tx) => {
      if (parsed.data.tier) {
        const tierCount = await tx.player.count({
          where: { tier: parsed.data.tier, id: { not: id } },
        });
        if (tierCount >= MAX_PLAYERS_PER_TIER) {
          throw new ActionError(
            `Allocated already has ${MAX_PLAYERS_PER_TIER} players`,
          );
        }
      }

      await tx.player.update({ where: { id }, data: parsed.data });
    });

    revalidatePath("/players");
    return { ok: true, data: undefined };
  } catch (error) {
    if (error instanceof ActionError) return { ok: false, error: error.message };
    throw error;
  }
}

export async function deletePlayer(id: string): Promise<ActionResult> {
  const authError = await requireAdmin();
  if (authError) return authError;

  const gamesPlayed = await prisma.game.count({
    where: {
      OR: [
        { teamAPlayer1Id: id },
        { teamAPlayer2Id: id },
        { teamBPlayer1Id: id },
        { teamBPlayer2Id: id },
      ],
    },
  });

  if (gamesPlayed > 0) {
    return {
      ok: false,
      error:
        "This player has already played in recorded games and can't be deleted. Undo or delete those matches first, or use Reset Tournament.",
    };
  }

  await prisma.player.delete({ where: { id } });
  revalidatePath("/players");
  revalidatePath("/owners");
  revalidatePath("/auction");
  return { ok: true, data: undefined };
}

export async function importPlayersCsv(
  rows: unknown[],
): Promise<ActionResult<{ imported: number; skipped: number }>> {
  const authError = await requireAdmin();
  if (authError) return authError;

  const parsedRows: {
    name: string;
    tier?: "A";
    position?: "ATTACKER" | "DEFENDER" | "ALL_ROUNDER";
  }[] = [];
  for (const row of rows) {
    const parsed = csvPlayerRowSchema.safeParse(row);
    if (parsed.success) parsedRows.push(parsed.data);
  }

  if (parsedRows.length === 0) {
    return { ok: false, error: "No valid rows found to import" };
  }

  try {
    const imported = await runSerializable(async (tx) => {
      const existingCount = await tx.player.count();
      const availableSlots = MAX_PLAYERS - existingCount;
      if (availableSlots <= 0) {
        throw new ActionError(`Maximum of ${MAX_PLAYERS} players reached`);
      }

      const existingTierCounts = new Map<string, number>();
      for (const tier of PLAYER_TIERS) {
        existingTierCounts.set(tier, await tx.player.count({ where: { tier: tier as never } }));
      }

      const toCreate: { name: string; tier?: string; position?: string }[] = [];
      for (const row of parsedRows) {
        if (row.tier) {
          const current = existingTierCounts.get(row.tier) ?? 0;
          if (current >= MAX_PLAYERS_PER_TIER) continue;
          existingTierCounts.set(row.tier, current + 1);
        }
        toCreate.push(row);
        if (toCreate.length >= availableSlots) break;
      }

      if (toCreate.length === 0) {
        throw new ActionError("No rows could be imported (player or tier cap reached)");
      }

      await tx.player.createMany({ data: toCreate as never });
      return toCreate.length;
    });

    revalidatePath("/players");
    return {
      ok: true,
      data: { imported, skipped: rows.length - imported },
    };
  } catch (error) {
    if (error instanceof ActionError) return { ok: false, error: error.message };
    throw error;
  }
}
