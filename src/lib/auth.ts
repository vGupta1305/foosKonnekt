import "server-only";

import { cache } from "react";
import { getSession, type SessionPayload } from "@/lib/session";

export const verifySession = cache(async (): Promise<SessionPayload | null> => {
  return getSession();
});

/**
 * Call as the first line of any mutating Server Action. Returns null when
 * the caller is an authenticated admin; otherwise an ActionResult-shaped
 * rejection the action can return immediately. Never trust the UI alone —
 * read-only controls are hidden client-side, but every mutation re-checks
 * here since Server Actions are reachable directly, matcher gaps aside.
 */
export async function requireAdmin(): Promise<{ ok: false; error: string } | null> {
  const session = await verifySession();
  if (!session) return { ok: false, error: "You must be signed in to do this." };
  if (session.role !== "ADMIN") {
    return { ok: false, error: "Read-only accounts can't make changes." };
  }
  return null;
}
