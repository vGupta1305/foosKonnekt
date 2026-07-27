"use server";

import { revalidatePath } from "next/cache";
import { prisma } from "@/lib/prisma";
import type { ActionResult } from "@/lib/actions/players";
import {
  gameEntrySchema,
  matchEntrySchema,
  validateTeamParticipation,
  PLAYOFF_GAMES_TO_WIN,
} from "@/lib/validations/match";
import { ActionError, runSerializable } from "@/lib/serializable-transaction";
import { requireAdmin } from "@/lib/auth";

export async function getMatch(id: string) {
  return prisma.match.findUnique({
    where: { id },
    include: {
      homeTeam: { include: { players: true } },
      awayTeam: { include: { players: true } },
      games: { orderBy: { gameNumber: "asc" } },
    },
  });
}

export async function saveMatchGames(
  matchId: string,
  input: unknown,
): Promise<ActionResult> {
  const authError = await requireAdmin();
  if (authError) return authError;

  const parsed = matchEntrySchema.safeParse(input);
  if (!parsed.success) {
    return { ok: false, error: parsed.error.issues[0]?.message ?? "Invalid input" };
  }
  const { games } = parsed.data;

  const match = await prisma.match.findUnique({
    where: { id: matchId },
    include: {
      homeTeam: { include: { players: true } },
      awayTeam: { include: { players: true } },
    },
  });
  if (!match) return { ok: false, error: "Match not found" };
  if (match.stage !== "LEAGUE") {
    return {
      ok: false,
      error: "Playoff series games are recorded one at a time, not as a fixed set of 3",
    };
  }

  const homePlayerIds = new Set(match.homeTeam.players.map((p) => p.id));
  const awayPlayerIds = new Set(match.awayTeam.players.map((p) => p.id));

  for (const g of games) {
    if (!homePlayerIds.has(g.teamAPlayer1Id) || !homePlayerIds.has(g.teamAPlayer2Id)) {
      return { ok: false, error: `Team A players must belong to ${match.homeTeam.name}` };
    }
    if (!awayPlayerIds.has(g.teamBPlayer1Id) || !awayPlayerIds.has(g.teamBPlayer2Id)) {
      return { ok: false, error: `Team B players must belong to ${match.awayTeam.name}` };
    }
  }

  if (match.stage === "LEAGUE") {
    const homePairs: [string, string][] = games.map((g) => [
      g.teamAPlayer1Id,
      g.teamAPlayer2Id,
    ]);
    const awayPairs: [string, string][] = games.map((g) => [
      g.teamBPlayer1Id,
      g.teamBPlayer2Id,
    ]);

    const homeCheck = validateTeamParticipation(homePairs);
    if (!homeCheck.valid) {
      return { ok: false, error: `${match.homeTeam.name}: ${homeCheck.error}` };
    }
    const awayCheck = validateTeamParticipation(awayPairs);
    if (!awayCheck.valid) {
      return { ok: false, error: `${match.awayTeam.name}: ${awayCheck.error}` };
    }
  }

  const homeScore = games.filter((g) => g.winner === "TEAM_A").length;
  const awayScore = games.filter((g) => g.winner === "TEAM_B").length;
  const winnerTeamId =
    homeScore > awayScore ? match.homeTeamId : match.awayTeamId;

  // Games are deleted and recreated on every save (simplest way to support
  // editing), but that shouldn't blow away the original timestamp for games
  // whose content didn't actually change.
  const existingGames = await prisma.game.findMany({ where: { matchId } });
  const existingByNumber = new Map(existingGames.map((g) => [g.gameNumber, g]));
  const now = new Date();

  const gamesData = games.map((g, index) => {
    const gameNumber = index + 1;
    const existing = existingByNumber.get(gameNumber);
    const unchanged =
      existing != null &&
      existing.teamAPlayer1Id === g.teamAPlayer1Id &&
      existing.teamAPlayer2Id === g.teamAPlayer2Id &&
      existing.teamBPlayer1Id === g.teamBPlayer1Id &&
      existing.teamBPlayer2Id === g.teamBPlayer2Id &&
      existing.winner === g.winner &&
      existing.scoreA === g.scoreA &&
      existing.scoreB === g.scoreB &&
      (existing.notes ?? "") === (g.notes ?? "");

    return {
      matchId,
      gameNumber,
      teamAPlayer1Id: g.teamAPlayer1Id,
      teamAPlayer2Id: g.teamAPlayer2Id,
      teamBPlayer1Id: g.teamBPlayer1Id,
      teamBPlayer2Id: g.teamBPlayer2Id,
      winner: g.winner,
      scoreA: g.scoreA,
      scoreB: g.scoreB,
      notes: g.notes || null,
      playedAt: unchanged ? existing.playedAt : now,
    };
  });

  await prisma.$transaction([
    prisma.game.deleteMany({ where: { matchId } }),
    prisma.game.createMany({ data: gamesData }),
    prisma.match.update({
      where: { id: matchId },
      data: { homeScore, awayScore, completed: true, winnerTeamId },
    }),
  ]);

  revalidatePath("/fixtures");
  revalidatePath(`/matches/${matchId}`);
  revalidatePath("/standings");
  revalidatePath("/playoffs");
  return { ok: true, data: undefined };
}

/**
 * Appends a single game to a QUALIFIER/GRAND_FINAL series and marks the
 * match complete once either side reaches the best-of-N win threshold.
 * Read-then-write on the games count, so this runs Serializable to avoid
 * two concurrent submissions both thinking they're recording the same
 * gameNumber (or both thinking the series isn't over yet).
 */
export async function addPlayoffGame(
  matchId: string,
  input: unknown,
): Promise<ActionResult> {
  const authError = await requireAdmin();
  if (authError) return authError;

  const parsed = gameEntrySchema.safeParse(input);
  if (!parsed.success) {
    return { ok: false, error: parsed.error.issues[0]?.message ?? "Invalid input" };
  }
  const g = parsed.data;

  try {
    await runSerializable(async (tx) => {
      const match = await tx.match.findUnique({
        where: { id: matchId },
        include: {
          homeTeam: { include: { players: true } },
          awayTeam: { include: { players: true } },
          games: true,
        },
      });
      if (!match) throw new ActionError("Match not found");
      if (match.stage !== "QUALIFIER" && match.stage !== "GRAND_FINAL") {
        throw new ActionError("Only playoff matches accept games one at a time");
      }
      if (match.completed) {
        throw new ActionError("This series is already complete");
      }

      const homePlayerIds = new Set(match.homeTeam.players.map((p) => p.id));
      const awayPlayerIds = new Set(match.awayTeam.players.map((p) => p.id));
      if (!homePlayerIds.has(g.teamAPlayer1Id) || !homePlayerIds.has(g.teamAPlayer2Id)) {
        throw new ActionError(`Team A players must belong to ${match.homeTeam.name}`);
      }
      if (!awayPlayerIds.has(g.teamBPlayer1Id) || !awayPlayerIds.has(g.teamBPlayer2Id)) {
        throw new ActionError(`Team B players must belong to ${match.awayTeam.name}`);
      }

      const gamesToWin = PLAYOFF_GAMES_TO_WIN[match.stage];
      const gameNumber = match.games.length + 1;

      await tx.game.create({
        data: {
          matchId,
          gameNumber,
          teamAPlayer1Id: g.teamAPlayer1Id,
          teamAPlayer2Id: g.teamAPlayer2Id,
          teamBPlayer1Id: g.teamBPlayer1Id,
          teamBPlayer2Id: g.teamBPlayer2Id,
          winner: g.winner,
          scoreA: g.scoreA,
          scoreB: g.scoreB,
          notes: g.notes || null,
          playedAt: new Date(),
        },
      });

      const priorHomeWins = match.games.filter((x) => x.winner === "TEAM_A").length;
      const priorAwayWins = match.games.filter((x) => x.winner === "TEAM_B").length;
      const homeWins = priorHomeWins + (g.winner === "TEAM_A" ? 1 : 0);
      const awayWins = priorAwayWins + (g.winner === "TEAM_B" ? 1 : 0);

      const completed = homeWins >= gamesToWin || awayWins >= gamesToWin;
      const winnerTeamId = homeWins >= gamesToWin
        ? match.homeTeamId
        : awayWins >= gamesToWin
          ? match.awayTeamId
          : null;

      await tx.match.update({
        where: { id: matchId },
        data: { homeScore: homeWins, awayScore: awayWins, completed, winnerTeamId },
      });
    });
  } catch (error) {
    if (error instanceof ActionError) return { ok: false, error: error.message };
    throw error;
  }

  revalidatePath("/fixtures");
  revalidatePath(`/matches/${matchId}`);
  revalidatePath("/playoffs");
  revalidatePath("/stats");
  return { ok: true, data: undefined };
}
