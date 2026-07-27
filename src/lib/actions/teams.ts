"use server";

import { prisma } from "@/lib/prisma";
import { getOwners } from "@/lib/actions/owners";

export async function ensureTeams() {
  await getOwners(); // seeds the 5 fixed owners if they don't exist yet

  const owners = await prisma.owner.findMany({
    include: { team: true },
    orderBy: { createdAt: "asc" },
  });

  await Promise.all(
    owners.map((owner) => {
      if (owner.team) return Promise.resolve();
      return prisma.team.create({
        data: {
          name: owner.teamName?.trim() || `${owner.name}'s Team`,
          ownerId: owner.id,
        },
      });
    }),
  );

  return prisma.team.findMany({
    include: { owner: true, players: true },
    orderBy: { createdAt: "asc" },
  });
}
