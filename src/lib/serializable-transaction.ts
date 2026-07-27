import { Prisma } from "@/generated/prisma/client";
import { prisma } from "@/lib/prisma";

/** Throw inside runSerializable to abort with a user-facing message (never retried). */
export class ActionError extends Error {}

/**
 * Postgres serialization conflicts surface two different ways depending on
 * the code path: the classic Prisma engine wraps them as
 * PrismaClientKnownRequestError code P2034, but the driver-adapter path
 * (what this project uses under Prisma 7) throws a raw DriverAdapterError
 * whose `cause` carries the Postgres SQLSTATE (40001) directly — it is
 * NOT a PrismaClientKnownRequestError, so checking only for P2034 silently
 * never retries on that path. Check both shapes.
 */
function isSerializationFailure(error: unknown): boolean {
  if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === "P2034") {
    return true;
  }
  const cause = (error as { cause?: { originalCode?: string; kind?: string } } | undefined)
    ?.cause;
  if (cause?.originalCode === "40001" || cause?.kind === "TransactionWriteConflict") {
    return true;
  }
  return false;
}

/**
 * Runs `fn` in a Serializable transaction, retrying on Postgres serialization
 * failures. Use for mutations that read a count or a budget and then write
 * based on it, where two concurrent callers could otherwise both pass
 * validation before either commits.
 */
export async function runSerializable<T>(
  fn: (tx: Prisma.TransactionClient) => Promise<T>,
  retries = 3,
): Promise<T> {
  for (let attempt = 1; attempt <= retries; attempt++) {
    try {
      return await prisma.$transaction(fn, { isolationLevel: "Serializable" });
    } catch (error) {
      if (!isSerializationFailure(error) || attempt === retries) throw error;
    }
  }
  throw new Error("Unreachable");
}
