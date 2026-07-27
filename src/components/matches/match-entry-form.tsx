"use client";

import { useState } from "react";
import { toast } from "sonner";

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
import { saveMatchGames } from "@/lib/actions/matches";
import { GAME_WINNING_SCORE, validateTeamParticipation } from "@/lib/validations/match";

type TeamInfo = { id: string; name: string; players: { id: string; name: string }[] };

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

export function MatchEntryForm({
  matchId,
  stage,
  homeTeam,
  awayTeam,
  existingGames,
  isAdmin,
}: {
  matchId: string;
  stage: string;
  homeTeam: TeamInfo;
  awayTeam: TeamInfo;
  isAdmin: boolean;
  existingGames: {
    teamAPlayer1Id: string;
    teamAPlayer2Id: string;
    teamBPlayer1Id: string;
    teamBPlayer2Id: string;
    winner: "TEAM_A" | "TEAM_B" | null;
    scoreA: number;
    scoreB: number;
    notes: string | null;
  }[];
}) {
  const [games, setGames] = useState<GameState[]>(() =>
    Array.from({ length: 3 }, (_, i) => {
      const existing = existingGames[i];
      if (!existing) return { ...emptyGame };
      return {
        teamAPlayer1Id: existing.teamAPlayer1Id,
        teamAPlayer2Id: existing.teamAPlayer2Id,
        teamBPlayer1Id: existing.teamBPlayer1Id,
        teamBPlayer2Id: existing.teamBPlayer2Id,
        scoreA: String(existing.scoreA ?? ""),
        scoreB: String(existing.scoreB ?? ""),
        notes: existing.notes ?? "",
      };
    }),
  );
  const [submitting, setSubmitting] = useState(false);

  function updateGame(index: number, patch: Partial<GameState>) {
    setGames((prev) =>
      prev.map((g, i) => (i === index ? { ...g, ...patch } : g)),
    );
  }

  async function handleSubmit() {
    const winners: ("TEAM_A" | "TEAM_B")[] = [];
    for (const g of games) {
      if (!g.teamAPlayer1Id || !g.teamAPlayer2Id || !g.teamBPlayer1Id || !g.teamBPlayer2Id) {
        toast.error("Fill in all players for every game");
        return;
      }
      const winner = deriveWinner(g.scoreA, g.scoreB);
      if (!winner) {
        toast.error(
          `Every game needs exactly one side reaching ${GAME_WINNING_SCORE} goals`,
        );
        return;
      }
      winners.push(winner);
    }

    if (stage === "LEAGUE") {
      const homePairs = games.map(
        (g) => [g.teamAPlayer1Id, g.teamAPlayer2Id] as [string, string],
      );
      const awayPairs = games.map(
        (g) => [g.teamBPlayer1Id, g.teamBPlayer2Id] as [string, string],
      );

      const homeCheck = validateTeamParticipation(homePairs);
      if (!homeCheck.valid) {
        toast.error(`${homeTeam.name}: ${homeCheck.error}`);
        return;
      }
      const awayCheck = validateTeamParticipation(awayPairs);
      if (!awayCheck.valid) {
        toast.error(`${awayTeam.name}: ${awayCheck.error}`);
        return;
      }
    }

    setSubmitting(true);
    const result = await saveMatchGames(matchId, {
      games: games.map((g, index) => ({
        teamAPlayer1Id: g.teamAPlayer1Id,
        teamAPlayer2Id: g.teamAPlayer2Id,
        teamBPlayer1Id: g.teamBPlayer1Id,
        teamBPlayer2Id: g.teamBPlayer2Id,
        winner: winners[index],
        scoreA: g.scoreA === "" ? 0 : Number(g.scoreA),
        scoreB: g.scoreB === "" ? 0 : Number(g.scoreB),
        notes: g.notes,
      })),
    });
    setSubmitting(false);

    if (!result.ok) {
      toast.error(result.error);
      return;
    }
    toast.success("Match saved");
  }

  return (
    <div className="flex flex-col gap-6">
      {games.map((game, index) => (
        <Card key={index}>
          <CardHeader>
            <CardTitle className="text-base">Game {index + 1}</CardTitle>
          </CardHeader>
          <CardContent className="flex flex-col gap-4">
            <div className="grid gap-4 sm:grid-cols-2">
              <div className="flex flex-col gap-2 rounded-lg border p-3">
                <p className="text-sm font-medium">{homeTeam.name} pair</p>
                <PlayerSelect
                  players={homeTeam.players}
                  value={game.teamAPlayer1Id}
                  onChange={(v) => updateGame(index, { teamAPlayer1Id: v })}
                  placeholder="Player 1"
                  disabled={!isAdmin}
                />
                <PlayerSelect
                  players={homeTeam.players}
                  value={game.teamAPlayer2Id}
                  onChange={(v) => updateGame(index, { teamAPlayer2Id: v })}
                  placeholder="Player 2"
                  disabled={!isAdmin}
                />
              </div>
              <div className="flex flex-col gap-2 rounded-lg border p-3">
                <p className="text-sm font-medium">{awayTeam.name} pair</p>
                <PlayerSelect
                  players={awayTeam.players}
                  value={game.teamBPlayer1Id}
                  onChange={(v) => updateGame(index, { teamBPlayer1Id: v })}
                  placeholder="Player 1"
                  disabled={!isAdmin}
                />
                <PlayerSelect
                  players={awayTeam.players}
                  value={game.teamBPlayer2Id}
                  onChange={(v) => updateGame(index, { teamBPlayer2Id: v })}
                  placeholder="Player 2"
                  disabled={!isAdmin}
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
                  onChange={(e) => updateGame(index, { scoreA: e.target.value })}
                  disabled={!isAdmin}
                />
              </div>
              <div className="flex flex-col gap-1.5">
                <Label>{awayTeam.name} goals</Label>
                <Input
                  type="number"
                  min={0}
                  max={GAME_WINNING_SCORE}
                  value={game.scoreB}
                  onChange={(e) => updateGame(index, { scoreB: e.target.value })}
                  disabled={!isAdmin}
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
                onChange={(e) => updateGame(index, { notes: e.target.value })}
                rows={2}
                disabled={!isAdmin}
              />
            </div>
          </CardContent>
        </Card>
      ))}

      {isAdmin && (
        <Button onClick={handleSubmit} disabled={submitting} className="self-end">
          {submitting ? "Saving..." : "Save match"}
        </Button>
      )}
    </div>
  );
}

function PlayerSelect({
  players,
  value,
  onChange,
  placeholder,
  disabled,
}: {
  players: { id: string; name: string }[];
  value: string;
  onChange: (value: string) => void;
  placeholder: string;
  disabled?: boolean;
}) {
  return (
    <Select value={value} onValueChange={onChange} disabled={disabled}>
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
