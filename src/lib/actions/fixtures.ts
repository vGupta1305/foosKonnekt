"use server";

import { revalidatePath } from "next/cache";
import { prisma } from "@/lib/prisma";
import type { ActionResult } from "@/lib/actions/players";
import { MAX_PLAYERS } from "@/lib/validations/player";
import { requireAdmin } from "@/lib/auth";

const DAYS_BETWEEN_MATCHES = 1;

export async function getLeagueMatches() {
  return prisma.match.findMany({
    where: { stage: "LEAGUE" },
    include: {
      homeTeam: { select: { id: true, name: true } },
      awayTeam: { select: { id: true, name: true } },
      games: true,
    },
    orderBy: { order: "asc" },
  });
}

/**
 * Round-robin pairs via the circle method, grouped into rounds where every
 * team plays exactly once (so matches within a round never share a team).
 * Rounds are then flattened greedily, picking each round's next match to
 * avoid repeating a team from the immediately preceding match wherever a
 * non-repeating option exists. With an even team count this can't fully
 * eliminate repeats (e.g. 4 teams only allows 3 of the 5 adjacent gaps to be
 * repeat-free), but it's the best achievable ordering.
 */
function scheduleRoundRobin(teamIds: string[]): [string, string][] {
  const arr: (string | null)[] = [...teamIds];
  if (arr.length % 2 !== 0) arr.push(null);
  const n = arr.length;

  const rounds: [string, string][][] = [];
  let rotating = arr;
  for (let r = 0; r < n - 1; r++) {
    const roundPairs: [string, string][] = [];
    for (let i = 0; i < n / 2; i++) {
      const a = rotating[i];
      const b = rotating[n - 1 - i];
      if (a !== null && b !== null) roundPairs.push([a, b]);
    }
    rounds.push(roundPairs);

    const fixed = rotating[0];
    const rest = rotating.slice(1);
    rest.unshift(rest.pop() as string | null);
    rotating = [fixed, ...rest];
  }

  const sharesTeam = (a: [string, string], b: [string, string]) =>
    a[0] === b[0] || a[0] === b[1] || a[1] === b[0] || a[1] === b[1];

  const result: [string, string][] = [];
  let prevLast: [string, string] | null = null;
  for (const round of rounds) {
    const remaining = [...round];
    while (remaining.length > 0) {
      const last = result[result.length - 1] ?? prevLast;
      const pickIndex = last
        ? Math.max(
            remaining.findIndex((pair) => !sharesTeam(pair, last)),
            0,
          )
        : 0;
      result.push(remaining[pickIndex]);
      remaining.splice(pickIndex, 1);
    }
    prevLast = result[result.length - 1];
  }

  return result;
}

export async function generateFixtures(options?: {
  regenerate?: boolean;
}): Promise<ActionResult<{ created: number }>> {
  const authError = await requireAdmin();
  if (authError) return authError;

  const existing = await prisma.match.findMany({ where: { stage: "LEAGUE" } });

  if (existing.length > 0 && !options?.regenerate) {
    return { ok: false, error: "Fixtures have already been generated" };
  }

  // Auction must fully conclude before the league starts.
  const totalPlayers = await prisma.player.count();
  if (totalPlayers < MAX_PLAYERS) {
    return {
      ok: false,
      error: `All ${MAX_PLAYERS} players must be registered first (currently ${totalPlayers})`,
    };
  }
  const unsoldPlayers = await prisma.player.count({ where: { teamId: null } });
  if (unsoldPlayers > 0) {
    return {
      ok: false,
      error: `${unsoldPlayers} player(s) are still unsold — finish the auction before generating fixtures`,
    };
  }

  const teams = await prisma.team.findMany({ orderBy: { createdAt: "asc" } });
  if (teams.length < 2) {
    return { ok: false, error: "Need at least two teams to generate fixtures" };
  }

  if (existing.length > 0 && options?.regenerate) {
    // Qualifier/Grand Final are derived from league standings, so they go
    // stale the moment league results change underneath them — clear them too.
    await prisma.match.deleteMany({
      where: { stage: { in: ["LEAGUE", "QUALIFIER", "GRAND_FINAL"] } },
    });
  }

  const pairs = scheduleRoundRobin(teams.map((t) => t.id));

  // Store scheduledDate as UTC-midnight for today's calendar date so it's an
  // unambiguous "date", not a timezone-dependent instant — the client always
  // reads it back with UTC getters (see fixtures-view.tsx) to match.
  const today = new Date();
  const startDate = new Date(
    Date.UTC(today.getFullYear(), today.getMonth(), today.getDate()),
  );

  await prisma.match.createMany({
    data: pairs.map((pair, index) => {
      const scheduledDate = new Date(startDate);
      scheduledDate.setUTCDate(scheduledDate.getUTCDate() + index * DAYS_BETWEEN_MATCHES);
      return {
        stage: "LEAGUE" as const,
        homeTeamId: pair[0],
        awayTeamId: pair[1],
        order: index,
        scheduledDate,
      };
    }),
  });

  revalidatePath("/fixtures");
  revalidatePath("/standings");
  revalidatePath("/playoffs");
  return { ok: true, data: { created: pairs.length } };
}

export async function updateMatchDate(
  matchId: string,
  scheduledDate: string,
): Promise<ActionResult> {
  const authError = await requireAdmin();
  if (authError) return authError;

  // scheduledDate arrives as a plain "YYYY-MM-DD" from a <input type="date">.
  // `new Date("YYYY-MM-DD")` parses it as UTC midnight, which drifts to the
  // previous calendar day once displayed in any timezone behind UTC — parse
  // the parts explicitly instead so the calendar date is unambiguous.
  const match = /^(\d{4})-(\d{2})-(\d{2})$/.exec(scheduledDate);
  if (!match) {
    return { ok: false, error: "Invalid date" };
  }
  const [, year, month, day] = match;
  const parsed = new Date(Date.UTC(Number(year), Number(month) - 1, Number(day)));
  if (Number.isNaN(parsed.getTime())) {
    return { ok: false, error: "Invalid date" };
  }

  await prisma.match.update({
    where: { id: matchId },
    data: { scheduledDate: parsed },
  });

  revalidatePath("/fixtures");
  return { ok: true, data: undefined };
}
