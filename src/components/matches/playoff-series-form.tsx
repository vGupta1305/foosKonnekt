"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { addPlayoffGame } from "@/lib/actions/matches";
import { GAME_WINNING_SCORE, PLAYOFF_GAMES_TO_WIN } from "@/lib/validations/match";

type TeamInfo = { id: string; name: string; players: { id: string; name: string }[] };

type ExistingGame = {
  gameNumber: number;
  teamAPlayer1Id: string;
  teamAPlayer2Id: string;
  teamBPlayer1Id: string;
  teamBPlayer2Id: string;
  winner: "TEAM_A" | "TEAM_B" | null;
  scoreA: number;
  scoreB: number;
  notes: string | null;
};

type GameState = {
  teamAPlayer1Id: string;
  teamAPlayer2Id: string;
  teamBPlayer1Id: string;
  teamBPlayer2Id: string;
  scoreA: string;
  scoreB: string;
  notes: string;
};

function deriveWinner(scoreA: string, scoreB: string): "TEAM_A" | "TEAM_B" | null {
  const a = Number(scoreA);
  const b = Number(scoreB);
  if (a === GAME_WINNING_SCORE && b !== GAME_WINNING_SCORE) return "TEAM_A";
  if (b === GAME_WINNING_SCORE && a !== GAME_WINNING_SCORE) return "TEAM_B";
  return null;
}

const emptyGame: GameState = {
  teamAPlayer1Id: "",
  teamAPlayer2Id: "",
  teamBPlayer1Id: "",
  teamBPlayer2Id: "",
  scoreA: "",
  scoreB: "",
  notes: "",
};

export function PlayoffSeriesForm({
  matchId,
  stage,
  homeTeam,
  awayTeam,
  existingGames,
  completed,
  winnerTeamId,
  homeScore,
  awayScore,
  isAdmin,
}: {
  matchId: string;
  stage: "QUALIFIER" | "GRAND_FINAL";
  homeTeam: TeamInfo;
  awayTeam: TeamInfo;
  existingGames: ExistingGame[];
  completed: boolean;
  winnerTeamId: string | null;
  homeScore: number;
  awayScore: number;
  isAdmin: boolean;
}) {
  const router = useRouter();
  const [game, setGame] = useState<GameState>({ ...emptyGame });
  const [submitting, setSubmitting] = useState(false);

  const gamesToWin = PLAYOFF_GAMES_TO_WIN[stage];
  const seriesLabel = stage === "QUALIFIER" ? "Best of 3" : "Best of 5";

  function updateGame(patch: Partial<GameState>) {
    setGame((prev) => ({ ...prev, ...patch }));
  }

  async function handleRecordGame() {
    if (
      !game.teamAPlayer1Id ||
      !game.teamAPlayer2Id ||
      !game.teamBPlayer1Id ||
      !game.teamBPlayer2Id
    ) {
      toast.error("Fill in all players for this game");
      return;
    }
    if (game.teamAPlayer1Id === game.teamAPlayer2Id) {
      toast.error(`${homeTeam.name} players must be different`);
      return;
    }
    if (game.teamBPlayer1Id === game.teamBPlayer2Id) {
      toast.error(`${awayTeam.name} players must be different`);
      return;
    }
    const winner = deriveWinner(game.scoreA, game.scoreB);
    if (!winner) {
      toast.error(`One side must reach exactly ${GAME_WINNING_SCORE} goals`);
      return;
    }

    setSubmitting(true);
    const result = await addPlayoffGame(matchId, {
      teamAPlayer1Id: game.teamAPlayer1Id,
      teamAPlayer2Id: game.teamAPlayer2Id,
      teamBPlayer1Id: game.teamBPlayer1Id,
      teamBPlayer2Id: game.teamBPlayer2Id,
      winner,
      scoreA: game.scoreA === "" ? 0 : Number(game.scoreA),
      scoreB: game.scoreB === "" ? 0 : Number(game.scoreB),
      notes: game.notes,
    });
    setSubmitting(false);

    if (!result.ok) {
      toast.error(result.error);
      return;
    }
    toast.success(`Game ${existingGames.length + 1} recorded`);
    setGame({ ...emptyGame });
    router.refresh();
  }

  const winnerName =
    winnerTeamId === homeTeam.id
      ? homeTeam.name
      : winnerTeamId === awayTeam.id
        ? awayTeam.name
        : null;

  return (
    <div className="flex flex-col gap-6">
      <Card>
        <CardHeader className="flex flex-row items-center justify-between">
          <CardTitle className="text-base">
            {seriesLabel} · first to {gamesToWin} games wins
          </CardTitle>
          <Badge variant={completed ? "secondary" : "outline"}>
            {homeTeam.name} {homeScore} - {awayScore} {awayTeam.name}
          </Badge>
        </CardHeader>
        <CardContent>
          {completed && winnerName ? (
            <p className="text-sm font-medium">Series complete — {winnerName} wins</p>
          ) : (
            <p className="text-sm text-muted-foreground">
              Series in progress — {existingGames.length} game
              {existingGames.length === 1 ? "" : "s"} played so far.
            </p>
          )}
        </CardContent>
      </Card>

      {existingGames.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Games played</CardTitle>
          </CardHeader>
          <CardContent className="flex flex-col gap-2">
            {existingGames.map((g) => (
              <div
                key={g.gameNumber}
                className="flex items-center justify-between rounded-lg border p-3 text-sm"
              >
                <span>Game {g.gameNumber}</span>
                <span className="text-muted-foreground">
                  {g.scoreA} - {g.scoreB}
                </span>
                <span className="font-medium">
                  {g.winner === "TEAM_A" ? homeTeam.name : awayTeam.name} won
                </span>
              </div>
            ))}
          </CardContent>
        </Card>
      )}

      {!completed && isAdmin && (
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Record game {existingGames.length + 1}</CardTitle>
          </CardHeader>
          <CardContent className="flex flex-col gap-4">
            <div className="grid gap-4 sm:grid-cols-2">
              <div className="flex flex-col gap-2 rounded-lg border p-3">
                <p className="text-sm font-medium">{homeTeam.name} pair</p>
                <PlayerSelect
                  players={homeTeam.players}
                  value={game.teamAPlayer1Id}
                  onChange={(v) => updateGame({ teamAPlayer1Id: v })}
                  placeholder="Player 1"
                />
                <PlayerSelect
                  players={homeTeam.players}
                  value={game.teamAPlayer2Id}
                  onChange={(v) => updateGame({ teamAPlayer2Id: v })}
                  placeholder="Player 2"
                />
              </div>
              <div className="flex flex-col gap-2 rounded-lg border p-3">
                <p className="text-sm font-medium">{awayTeam.name} pair</p>
                <PlayerSelect
                  players={awayTeam.players}
                  value={game.teamBPlayer1Id}
                  onChange={(v) => updateGame({ teamBPlayer1Id: v })}
                  placeholder="Player 1"
                />
                <PlayerSelect
                  players={awayTeam.players}
                  value={game.teamBPlayer2Id}
                  onChange={(v) => updateGame({ teamBPlayer2Id: v })}
                  placeholder="Player 2"
                />
              </div>
            </div>

            <div className="grid gap-4 sm:grid-cols-3">
              <div className="flex flex-col gap-1.5">
                <Label>{homeTeam.name} goals</Label>
                <Input
                  type="number"
                  min={0}
                  max={GAME_WINNING_SCORE}
                  value={game.scoreA}
                  onChange={(e) => updateGame({ scoreA: e.target.value })}
                />
              </div>
              <div className="flex flex-col gap-1.5">
                <Label>{awayTeam.name} goals</Label>
                <Input
                  type="number"
                  min={0}
                  max={GAME_WINNING_SCORE}
                  value={game.scoreB}
                  onChange={(e) => updateGame({ scoreB: e.target.value })}
                />
              </div>
              <div className="flex flex-col gap-1.5">
                <Label>Winner</Label>
                <div className="flex h-8 items-center text-sm">
                  {(() => {
                    const winner = deriveWinner(game.scoreA, game.scoreB);
                    if (winner === "TEAM_A") return <span className="font-medium">{homeTeam.name}</span>;
                    if (winner === "TEAM_B") return <span className="font-medium">{awayTeam.name}</span>;
                    return (
                      <span className="text-muted-foreground">
                        Awaiting a score of {GAME_WINNING_SCORE}
                      </span>
                    );
                  })()}
                </div>
              </div>
            </div>

            <div className="flex flex-col gap-1.5">
              <Label>Organizer notes (optional)</Label>
              <Textarea
                value={game.notes}
                onChange={(e) => updateGame({ notes: e.target.value })}
                rows={2}
              />
            </div>

            <Button onClick={handleRecordGame} disabled={submitting} className="self-end">
              {submitting ? "Recording..." : "Record game"}
            </Button>
          </CardContent>
        </Card>
      )}
    </div>
  );
}

function PlayerSelect({
  players,
  value,
  onChange,
  placeholder,
}: {
  players: { id: string; name: string }[];
  value: string;
  onChange: (value: string) => void;
  placeholder: string;
}) {
  return (
    <Select value={value} onValueChange={onChange}>
      <SelectTrigger className="w-full">
        <SelectValue placeholder={placeholder} />
      </SelectTrigger>
      <SelectContent>
        {players.map((p) => (
          <SelectItem key={p.id} value={p.id}>
            {p.name}
          </SelectItem>
        ))}
      </SelectContent>
    </Select>
  );
}
