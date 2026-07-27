"use server";

import { revalidatePath } from "next/cache";
import { prisma } from "@/lib/prisma";
import { requireAdmin } from "@/lib/auth";
import { OWNER_COUNT, ownerFormSchema } from "@/lib/validations/owner";
import type { ActionResult } from "@/lib/actions/players";

const DEFAULT_STARTING_BUDGET = 100;

export async function getOwners() {
  const existing = await prisma.owner.findMany({
    include: { team: { select: { id: true, name: true } } },
    orderBy: { createdAt: "asc" },
  });

  if (existing.length >= OWNER_COUNT) return existing;

  const toCreate = OWNER_COUNT - existing.length;
  await prisma.owner.createMany({
    data: Array.from({ length: toCreate }, (_, i) => ({
      name: `Owner ${existing.length + i + 1}`,
      startingBudget: DEFAULT_STARTING_BUDGET,
      remainingBudget: DEFAULT_STARTING_BUDGET,
    })),
  });

  return prisma.owner.findMany({
    include: { team: { select: { id: true, name: true } } },
    orderBy: { createdAt: "asc" },
  });
}

export async function updateOwner(
  id: string,
  input: unknown,
): Promise<ActionResult> {
  const authError = await requireAdmin();
  if (authError) return authError;

  const parsed = ownerFormSchema.safeParse(input);
  if (!parsed.success) {
    return { ok: false, error: parsed.error.issues[0]?.message ?? "Invalid input" };
  }

  const owner = await prisma.owner.findUnique({
    where: { id },
    include: { team: { include: { players: true } } },
  });
  if (!owner) return { ok: false, error: "Owner not found" };

  // Free lottery picks don't touch the budget, so only lock budget edits once
  // the owner has actually spent something (not just "has a player").
  const hasSpentBudget = owner.remainingBudget !== owner.startingBudget;
  if (hasSpentBudget && parsed.data.startingBudget !== owner.startingBudget) {
    return {
      ok: false,
      error: "Cannot change budget after this owner has spent part of it in the auction",
    };
  }

  await prisma.owner.update({
    where: { id },
    data: {
      name: parsed.data.name,
      teamName: parsed.data.teamName ?? null,
      startingBudget: parsed.data.startingBudget,
      remainingBudget: hasSpentBudget
        ? owner.remainingBudget
        : parsed.data.startingBudget,
    },
  });

  if (owner.team) {
    await prisma.team.update({
      where: { id: owner.team.id },
      data: { name: parsed.data.teamName?.trim() || `${parsed.data.name}'s Team` },
    });
  }

  revalidatePath("/owners");
  revalidatePath("/auction");
  revalidatePath("/fixtures");
  return { ok: true, data: undefined };
}
