"use client";

import { useState } from "react";
import Link from "next/link";
import { toast } from "sonner";
import { Trophy } from "lucide-react";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { generateGrandFinal, generateQualifier } from "@/lib/actions/playoffs";
import { ChampionConfetti } from "@/components/champion-confetti";
import type { StandingRow } from "@/lib/actions/standings";

type PlayoffMatch = {
  id: string;
  homeTeamName: string;
  awayTeamName: string;
  completed: boolean;
  homeScore: number;
  awayScore: number;
};

export function PlayoffsView({
  standings,
  leagueComplete,
  qualifier,
  grandFinal,
  championName,
  isAdmin,
}: {
  standings: StandingRow[];
  leagueComplete: boolean;
  qualifier: PlayoffMatch | null;
  grandFinal: PlayoffMatch | null;
  championName: string | null;
  isAdmin: boolean;
}) {
  const [busy, setBusy] = useState(false);

  async function handleGenerateQualifier() {
    setBusy(true);
    const result = await generateQualifier();
    setBusy(false);
    if (!result.ok) {
      toast.error(result.error);
      return;
    }
    toast.success("Qualifier generated");
  }

  async function handleGenerateGrandFinal() {
    setBusy(true);
    const result = await generateGrandFinal();
    setBusy(false);
    if (!result.ok) {
      toast.error(result.error);
      return;
    }
    toast.success("Grand Final generated");
  }

  return (
    <div className="flex flex-col gap-6">
      {championName && (
        <>
          <ChampionConfetti championName={championName} />
          <Card className="border-accent/60 bg-accent/10">
            <CardContent className="flex flex-col items-center gap-2 py-8 text-center">
              <Trophy className="size-10 text-accent" />
              <p className="text-sm uppercase tracking-widest text-accent">
                Tournament Champion
              </p>
              <p className="text-3xl font-semibold">{championName}</p>
            </CardContent>
          </Card>
        </>
      )}

      <Card>
        <CardHeader>
          <CardTitle className="text-base">Top 3 (from league standings)</CardTitle>
        </CardHeader>
        <CardContent className="flex flex-col gap-2">
          {standings.slice(0, 3).map((row, index) => (
            <div key={row.teamId} className="flex items-center justify-between text-sm">
              <span>
                {index + 1}. {row.teamName}
              </span>
              <span className="text-muted-foreground">{row.leaguePoints} pts</span>
            </div>
          ))}
          {standings.length === 0 && (
            <p className="text-sm text-muted-foreground">No standings yet.</p>
          )}
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">Qualifier · 2nd vs 3rd</CardTitle>
        </CardHeader>
        <CardContent className="flex flex-col gap-3">
          {qualifier ? (
            <PlayoffMatchRow match={qualifier} isAdmin={isAdmin} />
          ) : (
            <>
              <p className="text-sm text-muted-foreground">
                {leagueComplete
                  ? isAdmin
                    ? "League is complete. Generate the qualifier to continue."
                    : "League is complete. Waiting for the admin to generate the qualifier."
                  : "All league matches must be completed first."}
              </p>
              {isAdmin && (
                <Button
                  onClick={handleGenerateQualifier}
                  disabled={busy || !leagueComplete}
                  className="self-start"
                >
                  Generate qualifier
                </Button>
              )}
            </>
          )}
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">Grand Final · 1st vs Qualifier winner</CardTitle>
        </CardHeader>
        <CardContent className="flex flex-col gap-3">
          {grandFinal ? (
            <PlayoffMatchRow match={grandFinal} isAdmin={isAdmin} />
          ) : (
            <>
              <p className="text-sm text-muted-foreground">
                {qualifier?.completed
                  ? isAdmin
                    ? "Qualifier is complete. Generate the Grand Final to continue."
                    : "Qualifier is complete. Waiting for the admin to generate the Grand Final."
                  : "The qualifier must be completed first."}
              </p>
              {isAdmin && (
                <Button
                  onClick={handleGenerateGrandFinal}
                  disabled={busy || !qualifier?.completed}
                  className="self-start"
                >
                  Generate Grand Final
                </Button>
              )}
            </>
          )}
        </CardContent>
      </Card>
    </div>
  );
}

function PlayoffMatchRow({ match, isAdmin }: { match: PlayoffMatch; isAdmin: boolean }) {
  return (
    <div className="flex items-center justify-between rounded-lg border p-3">
      <div>
        <p className="font-medium">
          {match.homeTeamName} vs {match.awayTeamName}
        </p>
        <p className="text-sm text-muted-foreground">
          {match.homeScore + match.awayScore > 0
            ? `${match.homeScore} - ${match.awayScore}${match.completed ? "" : " (in progress)"}`
            : "Not played yet"}
        </p>
      </div>
      <div className="flex items-center gap-2">
        {match.completed && <Badge variant="secondary">Completed</Badge>}
        <Button asChild size="sm" variant="ghost">
          <Link href={`/matches/${match.id}`}>{isAdmin ? "Enter results" : "View"}</Link>
        </Button>
      </div>
    </div>
  );
}
