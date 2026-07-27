import Link from "next/link";
import { Trophy } from "lucide-react";

import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { Button } from "@/components/ui/button";
import { ChampionConfetti } from "@/components/champion-confetti";

type DashboardData = {
  tournamentName: string;
  totalPlayers: number;
  totalTeams: number;
  leagueTotal: number;
  leagueCompleted: number;
  remainingMatches: number;
  standings: {
    teamId: string;
    teamName: string;
    leaguePoints: number;
  }[];
  upcomingMatch: {
    id: string;
    homeTeamName: string;
    awayTeamName: string;
    stage: string;
  } | null;
  championName: string | null;
};

export function DashboardView({ data }: { data: DashboardData }) {
  const leagueProgressPct =
    data.leagueTotal > 0 ? Math.round((data.leagueCompleted / data.leagueTotal) * 100) : 0;

  return (
    <div className="flex flex-col gap-6">
      <div>
        <p className="text-sm font-medium uppercase tracking-widest text-accent">
          {data.tournamentName}
        </p>
        <h1 className="text-3xl font-semibold tracking-tight">Dashboard</h1>
      </div>

      {data.championName && (
        <>
          <ChampionConfetti championName={data.championName} />
          <Card className="border-accent/60 bg-accent/10">
            <CardContent className="flex flex-col items-center gap-2 py-8 text-center">
              <Trophy className="size-10 text-accent" />
              <p className="text-sm uppercase tracking-widest text-accent">
                Tournament Champion
              </p>
              <p className="text-3xl font-semibold">{data.championName}</p>
            </CardContent>
          </Card>
        </>
      )}

      <div className="grid grid-cols-2 gap-4 sm:grid-cols-4">
        <StatCard label="Total players" value={data.totalPlayers} />
        <StatCard label="Total teams" value={data.totalTeams} />
        <StatCard label="Remaining matches" value={data.remainingMatches} />
        <StatCard label="League progress" value={`${leagueProgressPct}%`} />
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">League progress</CardTitle>
        </CardHeader>
        <CardContent className="flex flex-col gap-2">
          <Progress value={leagueProgressPct} />
          <p className="text-sm text-muted-foreground">
            {data.leagueCompleted} / {data.leagueTotal} league matches completed
          </p>
        </CardContent>
      </Card>

      <div className="grid gap-6 sm:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Current standings</CardTitle>
          </CardHeader>
          <CardContent className="flex flex-col gap-2">
            {data.standings.length === 0 && (
              <p className="text-sm text-muted-foreground">
                Standings will appear once matches are played.
              </p>
            )}
            {data.standings.map((row, index) => (
              <div key={row.teamId} className="flex items-center justify-between text-sm">
                <span>
                  {index + 1}. {row.teamName}
                </span>
                <span className="text-muted-foreground">{row.leaguePoints} pts</span>
              </div>
            ))}
            <Button asChild size="sm" variant="ghost" className="self-start">
              <Link href="/standings">View full standings</Link>
            </Button>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="text-base">Upcoming match</CardTitle>
          </CardHeader>
          <CardContent className="flex flex-col gap-2">
            {data.upcomingMatch ? (
              <>
                <div className="flex items-center gap-2">
                  <Badge variant="outline">{data.upcomingMatch.stage}</Badge>
                </div>
                <p className="font-medium">
                  {data.upcomingMatch.homeTeamName} vs {data.upcomingMatch.awayTeamName}
                </p>
                <Button asChild size="sm" variant="ghost" className="self-start">
                  <Link href={`/matches/${data.upcomingMatch.id}`}>Enter results</Link>
                </Button>
              </>
            ) : (
              <p className="text-sm text-muted-foreground">
                No matches scheduled yet.
              </p>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}

function StatCard({ label, value }: { label: string; value: string | number }) {
  return (
    <Card>
      <CardContent className="flex flex-col gap-1 py-4">
        <p className="text-2xl font-semibold">{value}</p>
        <p className="text-xs text-muted-foreground">{label}</p>
      </CardContent>
    </Card>
  );
}
