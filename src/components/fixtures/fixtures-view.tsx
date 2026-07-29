"use client";

import { useState } from "react";
import Link from "next/link";
import { toast } from "sonner";
import { Printer, Shuffle } from "lucide-react";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { generateFixtures, updateMatchDate } from "@/lib/actions/fixtures";
import { OWNER_COUNT } from "@/lib/validations/owner";

export type MatchRow = {
  id: string;
  homeTeamName: string;
  awayTeamName: string;
  completed: boolean;
  homeScore: number;
  awayScore: number;
  gamesPlayed: number;
  scheduledDate: string | null;
};

function toDateInputValue(iso: string | null) {
  if (!iso) return "";
  // scheduledDate is stored as UTC-midnight for its calendar date (see
  // generateFixtures/updateMatchDate) — read it back with UTC getters, not
  // local ones, or the date drifts by a day depending on the viewer's
  // timezone offset from UTC.
  const date = new Date(iso);
  const year = date.getUTCFullYear();
  const month = String(date.getUTCMonth() + 1).padStart(2, "0");
  const day = String(date.getUTCDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
}

function formatDate(iso: string | null) {
  if (!iso) return "TBD";
  return new Date(iso).toLocaleDateString(undefined, {
    timeZone: "UTC",
    weekday: "short",
    month: "short",
    day: "numeric",
  });
}

function MatchDateCell({
  matchId,
  scheduledDate,
}: {
  matchId: string;
  scheduledDate: string | null;
}) {
  const [value, setValue] = useState(toDateInputValue(scheduledDate));
  const [saving, setSaving] = useState(false);

  async function handleBlur() {
    if (!value || toDateInputValue(scheduledDate) === value) return;
    setSaving(true);
    const result = await updateMatchDate(matchId, value);
    setSaving(false);
    if (!result.ok) {
      toast.error(result.error);
      return;
    }
    toast.success("Date updated");
  }

  return (
    <Input
      type="date"
      value={value}
      disabled={saving}
      onChange={(e) => setValue(e.target.value)}
      onBlur={handleBlur}
      className="h-8 w-36"
    />
  );
}

export function FixturesView({
  matches,
  isAdmin,
}: {
  matches: MatchRow[];
  isAdmin: boolean;
}) {
  const [generating, setGenerating] = useState(false);

  async function handleGenerate() {
    setGenerating(true);
    const result = await generateFixtures();
    setGenerating(false);

    if (!result.ok) {
      toast.error(result.error);
      return;
    }
    toast.success(`Generated ${result.data.created} fixtures`);
  }

  if (matches.length === 0) {
    return (
      <div className="flex flex-col items-center gap-4 rounded-xl border border-dashed p-10 text-center">
        <p className="text-sm text-muted-foreground">
          No fixtures yet.{" "}
          {isAdmin
            ? `Generate the round-robin schedule once all ${OWNER_COUNT} teams are finalized from the auction.`
            : "Waiting for the admin to generate the round-robin schedule."}
        </p>
        {isAdmin && (
          <Button onClick={handleGenerate} disabled={generating}>
            <Shuffle /> {generating ? "Generating..." : "Generate fixtures"}
          </Button>
        )}
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-3">
      <Button
        variant="outline"
        size="sm"
        className="no-print self-end"
        onClick={() => window.print()}
      >
        <Printer /> Print fixtures
      </Button>
      <div className="rounded-xl border">
        <Table>
        <TableHeader>
          <TableRow>
            <TableHead>Matchup</TableHead>
            <TableHead>Date</TableHead>
            <TableHead>Games played</TableHead>
            <TableHead>Score</TableHead>
            <TableHead>Status</TableHead>
            <TableHead className="text-right">Action</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {matches.map((match) => (
            <TableRow key={match.id}>
              <TableCell className="font-medium">
                {match.homeTeamName} vs {match.awayTeamName}
              </TableCell>
              <TableCell>
                {isAdmin ? (
                  <MatchDateCell matchId={match.id} scheduledDate={match.scheduledDate} />
                ) : (
                  formatDate(match.scheduledDate)
                )}
              </TableCell>
              <TableCell>{match.gamesPlayed} / 3</TableCell>
              <TableCell>
                {match.homeScore} - {match.awayScore}
              </TableCell>
              <TableCell>
                {match.completed ? (
                  <Badge variant="secondary">Completed</Badge>
                ) : (
                  <Badge variant="outline">Pending</Badge>
                )}
              </TableCell>
              <TableCell className="text-right">
                <Button asChild size="sm" variant="ghost">
                  <Link href={`/matches/${match.id}`}>
                    {isAdmin ? "Enter results" : "View"}
                  </Link>
                </Button>
              </TableCell>
            </TableRow>
          ))}
        </TableBody>
        </Table>
      </div>
    </div>
  );
}
