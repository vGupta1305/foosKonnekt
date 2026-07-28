"use client";

import { useState } from "react";
import { toast } from "sonner";
import { Dices } from "lucide-react";

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
import { runLottery } from "@/lib/actions/lottery";
import { MAX_PLAYERS_PER_TIER } from "@/lib/validations/player";

type TierAPlayer = { id: string; name: string; teamName: string | null };

export function LotteryView({
  teams,
  tierAPlayers,
  lotteryComplete,
  isAdmin,
}: {
  teams: { id: string; name: string }[];
  tierAPlayers: TierAPlayer[];
  lotteryComplete: boolean;
  isAdmin: boolean;
}) {
  const [confirmOpen, setConfirmOpen] = useState(false);
  const [busy, setBusy] = useState(false);

  const readyCount = tierAPlayers.length === MAX_PLAYERS_PER_TIER.A;

  async function handleRunLottery() {
    setBusy(true);
    const result = await runLottery();
    setBusy(false);
    setConfirmOpen(false);

    if (!result.ok) {
      toast.error(result.error);
      return;
    }
    toast.success("Lottery complete");
  }

  return (
    <div className="flex flex-col gap-6">
      <Card>
        <CardHeader>
          <CardTitle className="text-base">
            Tier A players ({tierAPlayers.length} / {MAX_PLAYERS_PER_TIER.A})
          </CardTitle>
        </CardHeader>
        <CardContent className="flex flex-col gap-4">
          {!readyCount && (
            <p className="text-sm text-muted-foreground">
              Assign exactly {MAX_PLAYERS_PER_TIER.A} players to Tier A on the
              Players page before running the lottery.
            </p>
          )}

          <div className="rounded-xl border">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Player</TableHead>
                  <TableHead>Assigned team</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {tierAPlayers.length === 0 && (
                  <TableRow>
                    <TableCell colSpan={2} className="py-8 text-center text-muted-foreground">
                      No Tier A players yet.
                    </TableCell>
                  </TableRow>
                )}
                {tierAPlayers.map((p) => (
                  <TableRow key={p.id}>
                    <TableCell className="font-medium">{p.name}</TableCell>
                    <TableCell>
                      {p.teamName ? (
                        <Badge>{p.teamName}</Badge>
                      ) : (
                        <span className="text-muted-foreground">Not drawn yet</span>
                      )}
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>

          {isAdmin && (
            <Button
              onClick={() => setConfirmOpen(true)}
              disabled={!readyCount || lotteryComplete}
              className="self-start"
            >
              <Dices /> {lotteryComplete ? "Lottery complete" : "Run lottery"}
            </Button>
          )}
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">Teams</CardTitle>
        </CardHeader>
        <CardContent className="flex flex-col gap-2">
          {teams.map((t) => (
            <p key={t.id} className="text-sm">
              {t.name}
            </p>
          ))}
        </CardContent>
      </Card>

      <AlertDialog open={confirmOpen} onOpenChange={setConfirmOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Run the Tier A lottery?</AlertDialogTitle>
            <AlertDialogDescription>
              This randomly assigns each Tier A player to one team, free of
              charge. It cannot be undone except via Reset Tournament.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={handleRunLottery} disabled={busy}>
              Run lottery
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
