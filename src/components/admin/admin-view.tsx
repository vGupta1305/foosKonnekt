"use client";

import { useRef, useState } from "react";
import Link from "next/link";
import { toast } from "sonner";
import { Download, RotateCcw, Shuffle, Trash2, Undo2, Upload } from "lucide-react";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import {
  deleteMatch,
  exportTournamentData,
  importTournamentData,
  resetTournament,
  undoMatch,
} from "@/lib/actions/admin";
import { generateFixtures } from "@/lib/actions/fixtures";

export type AdminMatchRow = {
  id: string;
  stage: string;
  homeTeamName: string;
  awayTeamName: string;
  completed: boolean;
  gamesPlayed: number;
};

export function AdminView({ matches }: { matches: AdminMatchRow[] }) {
  const [confirmAction, setConfirmAction] = useState<
    | { type: "reset" }
    | { type: "regenerate" }
    | { type: "undo"; matchId: string; label: string }
    | { type: "delete"; matchId: string; label: string }
    | null
  >(null);
  const [busy, setBusy] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  async function handleConfirm() {
    if (!confirmAction) return;
    setBusy(true);

    let result;
    if (confirmAction.type === "reset") {
      result = await resetTournament();
    } else if (confirmAction.type === "regenerate") {
      result = await generateFixtures({ regenerate: true });
    } else if (confirmAction.type === "undo") {
      result = await undoMatch(confirmAction.matchId);
    } else {
      result = await deleteMatch(confirmAction.matchId);
    }

    setBusy(false);
    setConfirmAction(null);

    if (!result.ok) {
      toast.error(result.error);
      return;
    }
    toast.success("Done");
  }

  async function handleExport() {
    const data = await exportTournamentData();
    const blob = new Blob([JSON.stringify(data, null, 2)], {
      type: "application/json",
    });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = `foosball-tournament-${Date.now()}.json`;
    link.click();
    URL.revokeObjectURL(url);
  }

  function handleImportClick() {
    fileInputRef.current?.click();
  }

  function handleFileChange(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = async () => {
      try {
        const parsed = JSON.parse(reader.result as string);
        const result = await importTournamentData(parsed);
        if (!result.ok) {
          toast.error(result.error);
        } else {
          toast.success("Tournament imported");
        }
      } catch {
        toast.error("Could not parse this file as JSON");
      }
    };
    reader.readAsText(file);
    e.target.value = "";
  }

  return (
    <div className="flex flex-col gap-6">
      <Card>
        <CardHeader>
          <CardTitle className="text-base">Tournament data</CardTitle>
        </CardHeader>
        <CardContent className="flex flex-wrap gap-2">
          <input
            ref={fileInputRef}
            type="file"
            accept="application/json"
            className="hidden"
            onChange={handleFileChange}
          />
          <Button variant="outline" size="sm" onClick={handleExport}>
            <Download /> Export tournament
          </Button>
          <Button variant="outline" size="sm" onClick={handleImportClick}>
            <Upload /> Import tournament
          </Button>
          <Button
            variant="outline"
            size="sm"
            onClick={() => setConfirmAction({ type: "regenerate" })}
          >
            <Shuffle /> Regenerate fixtures
          </Button>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">Matches</CardTitle>
        </CardHeader>
        <CardContent className="p-0">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Matchup</TableHead>
                <TableHead>Stage</TableHead>
                <TableHead>Status</TableHead>
                <TableHead className="text-right">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {matches.length === 0 && (
                <TableRow>
                  <TableCell colSpan={4} className="py-8 text-center text-muted-foreground">
                    No matches yet.
                  </TableCell>
                </TableRow>
              )}
              {matches.map((match) => (
                <TableRow key={match.id}>
                  <TableCell className="font-medium">
                    {match.homeTeamName} vs {match.awayTeamName}
                  </TableCell>
                  <TableCell>
                    <Badge variant="outline">{match.stage}</Badge>
                  </TableCell>
                  <TableCell>
                    {match.completed ? (
                      <Badge variant="secondary">Completed</Badge>
                    ) : (
                      <Badge variant="outline">Pending</Badge>
                    )}
                  </TableCell>
                  <TableCell className="text-right">
                    <div className="flex justify-end gap-1">
                      <Button asChild size="sm" variant="ghost">
                        <Link href={`/matches/${match.id}`}>Edit</Link>
                      </Button>
                      {match.completed && (
                        <Button
                          size="icon-sm"
                          variant="ghost"
                          onClick={() =>
                            setConfirmAction({
                              type: "undo",
                              matchId: match.id,
                              label: `${match.homeTeamName} vs ${match.awayTeamName}`,
                            })
                          }
                        >
                          <Undo2 />
                        </Button>
                      )}
                      <Button
                        size="icon-sm"
                        variant="ghost"
                        onClick={() =>
                          setConfirmAction({
                            type: "delete",
                            matchId: match.id,
                            label: `${match.homeTeamName} vs ${match.awayTeamName}`,
                          })
                        }
                      >
                        <Trash2 />
                      </Button>
                    </div>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      <Card className="border-destructive/40">
        <CardHeader>
          <CardTitle className="text-base text-destructive">Danger zone</CardTitle>
        </CardHeader>
        <CardContent>
          <Button
            variant="destructive"
            size="sm"
            onClick={() => setConfirmAction({ type: "reset" })}
          >
            <RotateCcw /> Reset tournament
          </Button>
          <p className="mt-2 text-xs text-muted-foreground">
            Clears all matches, games, and teams. Players and owners keep
            their names, but budgets and team assignments are reset.
          </p>
        </CardContent>
      </Card>

      <AlertDialog
        open={Boolean(confirmAction)}
        onOpenChange={(open) => !open && setConfirmAction(null)}
      >
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Are you sure?</AlertDialogTitle>
            <AlertDialogDescription>
              {confirmAction?.type === "reset" &&
                "This will wipe all matches, games, and teams, and reset owner budgets. This cannot be undone."}
              {confirmAction?.type === "regenerate" &&
                "This will delete all existing league fixtures and results, then regenerate the schedule."}
              {confirmAction?.type === "undo" &&
                `This will clear the results for ${confirmAction.label}.`}
              {confirmAction?.type === "delete" &&
                `This will permanently delete the match ${confirmAction.label}.`}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={handleConfirm} disabled={busy}>
              Confirm
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
