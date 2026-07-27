"use client";

import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import type { PlayerStatRow, TeamStatRow } from "@/lib/actions/statistics";

export function StatsView({
  playerStats,
  teamStats,
}: {
  playerStats: PlayerStatRow[];
  teamStats: TeamStatRow[];
}) {
  return (
    <Tabs defaultValue="players">
      <TabsList>
        <TabsTrigger value="players">Player stats</TabsTrigger>
        <TabsTrigger value="teams">Team stats</TabsTrigger>
      </TabsList>

      <TabsContent value="players">
        <div className="overflow-x-auto rounded-xl border">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Player</TableHead>
                <TableHead>Team</TableHead>
                <TableHead>Played</TableHead>
                <TableHead>Won</TableHead>
                <TableHead>Lost</TableHead>
                <TableHead>Win %</TableHead>
                <TableHead>Goals scored</TableHead>
                <TableHead>Goals conceded</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {playerStats.length === 0 && (
                <TableRow>
                  <TableCell colSpan={8} className="py-8 text-center text-muted-foreground">
                    No games played yet.
                  </TableCell>
                </TableRow>
              )}
              {playerStats.map((p) => (
                <TableRow key={p.playerId}>
                  <TableCell className="font-medium">{p.playerName}</TableCell>
                  <TableCell>{p.teamName ?? "—"}</TableCell>
                  <TableCell>{p.gamesPlayed}</TableCell>
                  <TableCell>{p.gamesWon}</TableCell>
                  <TableCell>{p.gamesLost}</TableCell>
                  <TableCell>{p.winPct}%</TableCell>
                  <TableCell>{p.goalsScored}</TableCell>
                  <TableCell>{p.goalsConceded}</TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>
      </TabsContent>

      <TabsContent value="teams">
        <div className="overflow-x-auto rounded-xl border">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Team</TableHead>
                <TableHead>League points</TableHead>
                <TableHead>Matches won</TableHead>
                <TableHead>Matches lost</TableHead>
                <TableHead>Games won</TableHead>
                <TableHead>Games lost</TableHead>
                <TableHead>Goals for</TableHead>
                <TableHead>Goals against</TableHead>
                <TableHead>Goal diff</TableHead>
                <TableHead>Win %</TableHead>
                <TableHead>Longest streak</TableHead>
                <TableHead>Avg goals</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {teamStats.length === 0 && (
                <TableRow>
                  <TableCell colSpan={11} className="py-8 text-center text-muted-foreground">
                    No teams yet.
                  </TableCell>
                </TableRow>
              )}
              {teamStats.map((t) => (
                <TableRow key={t.teamId}>
                  <TableCell className="font-medium">{t.teamName}</TableCell>
                  <TableCell>{t.leaguePoints}</TableCell>
                  <TableCell>{t.matchesWon}</TableCell>
                  <TableCell>{t.matchesLost}</TableCell>
                  <TableCell>{t.gamesWon}</TableCell>
                  <TableCell>{t.gamesLost}</TableCell>
                  <TableCell>{t.goalsFor}</TableCell>
                  <TableCell>{t.goalsAgainst}</TableCell>
                  <TableCell>{t.goalDifference}</TableCell>
                  <TableCell>{t.winningPct}%</TableCell>
                  <TableCell>{t.longestWinningStreak}</TableCell>
                  <TableCell>{t.averageGoals}</TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>
      </TabsContent>
    </Tabs>
  );
}
