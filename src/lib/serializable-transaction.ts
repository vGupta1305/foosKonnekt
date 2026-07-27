import { Prisma } from "@/generated/prisma/client";
import { prisma } from "@/lib/prisma";

/** Throw inside runSerializable to abort with a user-facing message (never retried). */
export class ActionError extends Error {}

/**
 * Runs `fn` in a Serializable transaction, retrying on Postgres serialization
 * failures (Prisma error code P2034). Use for mutations that read a count or
 * a budget and then write based on it, where two concurrent callers could
 * otherwise both pass validation before either commits.
 */
export async function runSerializable<T>(
  fn: (tx: Prisma.TransactionClient) => Promise<T>,
  retries = 3,
): Promise<T> {
  for (let attempt = 1; attempt <= retries; attempt++) {
    try {
      return await prisma.$transaction(fn, { isolationLevel: "Serializable" });
    } catch (error) {
      const isSerializationFailure =
        error instanceof Prisma.PrismaClientKnownRequestError && error.code === "P2034";
      if (!isSerializationFailure || attempt === retries) throw error;
    }
  }
  throw new Error("Unreachable");
}
