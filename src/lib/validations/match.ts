import { z } from "zod";

/**
 * Validates the 2-2-1-1 participation rule for one team's pairs across a
 * matchup's 3 games: exactly two players play 2 games and exactly two
 * players play 1 game.
 */
export function validateTeamParticipation(
  gamePairs: [string, string][],
): { valid: boolean; error?: string } {
  if (gamePairs.length !== 3) {
    return { valid: false, error: "A matchup must have exactly 3 games" };
  }

  for (const [a, b] of gamePairs) {
    if (!a || !b) {
      return { valid: false, error: "Every game must have both players selected" };
    }
    if (a === b) {
      return { valid: false, error: "A player cannot be paired with themselves" };
    }
  }

  const counts = new Map<string, number>();
  for (const [a, b] of gamePairs) {
    counts.set(a, (counts.get(a) ?? 0) + 1);
    counts.set(b, (counts.get(b) ?? 0) + 1);
  }

  if (counts.size !== 4) {
    return {
      valid: false,
      error: `Expected exactly 4 distinct players across the 3 games, found ${counts.size}`,
    };
  }

  const sorted = [...counts.values()].sort((a, b) => b - a);
  const isValidDistribution =
    sorted.length === 4 &&
    sorted[0] === 2 &&
    sorted[1] === 2 &&
    sorted[2] === 1 &&
    sorted[3] === 1;

  if (!isValidDistribution) {
    return {
      valid: false,
      error:
        "Participation must be exactly 2 players playing 2 games and 2 players playing 1 game each",
    };
  }

  return { valid: true };
}

export const GAME_WINNING_SCORE = 10;

export const gameEntrySchema = z
  .object({
    teamAPlayer1Id: z.string().min(1, "Select a player"),
    teamAPlayer2Id: z.string().min(1, "Select a player"),
    teamBPlayer1Id: z.string().min(1, "Select a player"),
    teamBPlayer2Id: z.string().min(1, "Select a player"),
    winner: z.enum(["TEAM_A", "TEAM_B"]),
    scoreA: z.coerce.number().int().min(0).max(GAME_WINNING_SCORE),
    scoreB: z.coerce.number().int().min(0).max(GAME_WINNING_SCORE),
    notes: z.string().optional(),
  })
  .refine((g) => g.teamAPlayer1Id !== g.teamAPlayer2Id, {
    message: "Team A players must be different",
    path: ["teamAPlayer2Id"],
  })
  .refine((g) => g.teamBPlayer1Id !== g.teamBPlayer2Id, {
    message: "Team B players must be different",
    path: ["teamBPlayer2Id"],
  })
  .refine((g) => g.scoreA === GAME_WINNING_SCORE || g.scoreB === GAME_WINNING_SCORE, {
    message: `Games are played to ${GAME_WINNING_SCORE} — one side must reach that score`,
    path: ["scoreA"],
  })
  .refine((g) => !(g.scoreA === GAME_WINNING_SCORE && g.scoreB === GAME_WINNING_SCORE), {
    message: "There must be exactly one winner — both sides can't score the winning goal count",
    path: ["scoreB"],
  })
  .refine(
    (g) =>
      g.winner === "TEAM_A"
        ? g.scoreA === GAME_WINNING_SCORE
        : g.scoreB === GAME_WINNING_SCORE,
    {
      message: "The selected winner must be the side that reached the winning score",
      path: ["winner"],
    },
  );

export const matchEntrySchema = z.object({
  games: z.array(gameEntrySchema).length(3),
});

export type GameEntry = z.infer<typeof gameEntrySchema>;
export type MatchEntry = z.infer<typeof matchEntrySchema>;

/**
 * Playoff series are best-of-N: the series ends as soon as one side wins
 * this many games, so a match doesn't always have a fixed number of games
 * (unlike LEAGUE, which is always exactly 3).
 */
export const PLAYOFF_GAMES_TO_WIN: Record<"QUALIFIER" | "GRAND_FINAL", number> = {
  QUALIFIER: 2,
  GRAND_FINAL: 3,
};

export const PLAYOFF_MAX_GAMES: Record<"QUALIFIER" | "GRAND_FINAL", number> = {
  QUALIFIER: 3,
  GRAND_FINAL: 5,
};
