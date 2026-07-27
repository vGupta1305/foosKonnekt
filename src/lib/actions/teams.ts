"use server";

import { prisma } from "@/lib/prisma";
import { getOwners } from "@/lib/actions/owners";
import { runSerializable } from "@/lib/serializable-transaction";

export async function ensureTeams() {
  await getOwners(); // seeds the 5 fixed owners if they don't exist yet

  // Team.ownerId is unique, so two concurrent calls can't duplicate a team —
  // but without a transaction they can still race and throw a constraint
  // error instead of just seeing each other's insert. Serializable + retry
  // makes this a no-op the second time through instead of a crash.
  await runSerializable(async (tx) => {
    const owners = await tx.owner.findMany({
      include: { team: true },
      orderBy: { createdAt: "asc" },
    });

    for (const owner of owners) {
      if (owner.team) continue;
      await tx.team.create({
        data: {
          name: owner.teamName?.trim() || `${owner.name}'s Team`,
          ownerId: owner.id,
        },
      });
    }
  });

  return prisma.team.findMany({
    include: { owner: true, players: true },
    orderBy: { createdAt: "asc" },
  });
}
