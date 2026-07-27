"use client";

import { useMemo, useState } from "react";
import { toast } from "sonner";
import { Pencil, Plus, Search, Trash2 } from "lucide-react";

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
import { deletePlayer } from "@/lib/actions/players";
import { MAX_PLAYERS } from "@/lib/validations/player";
import {
  PlayerFormDialog,
  type PlayerRow,
} from "@/components/players/player-form-dialog";
import { PlayerCsvTools } from "@/components/players/player-csv-tools";

const POSITION_LABELS: Record<string, string> = {
  ATTACKER: "Attacker",
  DEFENDER: "Defender",
  ALL_ROUNDER: "All-Rounder",
};

export function PlayerTable({
  players,
  isAdmin,
}: {
  players: PlayerRow[];
  isAdmin: boolean;
}) {
  const [search, setSearch] = useState("");
  const [formOpen, setFormOpen] = useState(false);
  const [editingPlayer, setEditingPlayer] = useState<PlayerRow | null>(null);
  const [deletingPlayer, setDeletingPlayer] = useState<PlayerRow | null>(null);

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    if (!q) return players;
    return players.filter(
      (p) =>
        p.name.toLowerCase().includes(q) ||
        p.teamName?.toLowerCase().includes(q),
    );
  }, [players, search]);

  async function handleDeleteConfirm() {
    if (!deletingPlayer) return;
    const result = await deletePlayer(deletingPlayer.id);
    if (!result.ok) {
      toast.error(result.error);
    } else {
      toast.success("Player deleted");
    }
    setDeletingPlayer(null);
  }

  const atCap = players.length >= MAX_PLAYERS;

  return (
    <div className="flex flex-col gap-4">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div className="relative w-full sm:max-w-xs">
          <Search className="pointer-events-none absolute top-1/2 left-2.5 size-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            placeholder="Search players..."
            className="pl-8"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
        </div>
        {isAdmin && (
          <div className="flex items-center gap-2">
            <PlayerCsvTools players={players} />
            <Button
              size="sm"
              disabled={atCap}
              onClick={() => {
                setEditingPlayer(null);
                setFormOpen(true);
              }}
            >
              <Plus /> Add player
            </Button>
          </div>
        )}
      </div>

      <div className="flex items-center justify-between text-sm text-muted-foreground">
        <span>
          {players.length} / {MAX_PLAYERS} players
        </span>
        {atCap && (
          <Badge variant="outline" className="border-accent text-accent">
            Player cap reached
          </Badge>
        )}
      </div>

      <div className="rounded-xl border">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Name</TableHead>
              <TableHead>Tier</TableHead>
              <TableHead>Position</TableHead>
              <TableHead>Auction price</TableHead>
              <TableHead>Team</TableHead>
              {isAdmin && <TableHead className="text-right">Actions</TableHead>}
            </TableRow>
          </TableHeader>
          <TableBody>
            {filtered.length === 0 && (
              <TableRow>
                <TableCell
                  colSpan={isAdmin ? 6 : 5}
                  className="py-8 text-center text-muted-foreground"
                >
                  No players found.
                </TableCell>
              </TableRow>
            )}
            {filtered.map((player) => (
              <TableRow key={player.id}>
                <TableCell className="font-medium">{player.name}</TableCell>
                <TableCell>
                  {player.tier ? (
                    <Badge variant="outline">Tier {player.tier}</Badge>
                  ) : (
                    "—"
                  )}
                </TableCell>
                <TableCell>
                  {player.position ? POSITION_LABELS[player.position] : "—"}
                </TableCell>
                <TableCell>
                  {player.auctionPrice != null ? player.auctionPrice : "—"}
                </TableCell>
                <TableCell>
                  {player.teamName ? (
                    <Badge variant="secondary">{player.teamName}</Badge>
                  ) : (
                    "—"
                  )}
                </TableCell>
                {isAdmin && (
                  <TableCell className="text-right">
                    <div className="flex justify-end gap-1">
                      <Button
                        size="icon-sm"
                        variant="ghost"
                        onClick={() => {
                          setEditingPlayer(player);
                          setFormOpen(true);
                        }}
                      >
                        <Pencil />
                      </Button>
                      <Button
                        size="icon-sm"
                        variant="ghost"
                        onClick={() => setDeletingPlayer(player)}
                      >
                        <Trash2 />
                      </Button>
                    </div>
                  </TableCell>
                )}
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </div>

      {isAdmin && (
        <>
          <PlayerFormDialog
            open={formOpen}
            onOpenChange={setFormOpen}
            player={editingPlayer}
          />

          <AlertDialog
            open={Boolean(deletingPlayer)}
            onOpenChange={(open) => !open && setDeletingPlayer(null)}
          >
            <AlertDialogContent>
              <AlertDialogHeader>
                <AlertDialogTitle>Delete player?</AlertDialogTitle>
                <AlertDialogDescription>
                  This will permanently remove {deletingPlayer?.name} from the
                  player pool.
                </AlertDialogDescription>
              </AlertDialogHeader>
              <AlertDialogFooter>
                <AlertDialogCancel>Cancel</AlertDialogCancel>
                <AlertDialogAction onClick={handleDeleteConfirm}>
                  Delete
                </AlertDialogAction>
              </AlertDialogFooter>
            </AlertDialogContent>
          </AlertDialog>
        </>
      )}
    </div>
  );
}
