"use client";

import { useState } from "react";
import { Pencil } from "lucide-react";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { OwnerEditDialog } from "@/components/owners/owner-edit-dialog";

export type OwnerRow = {
  id: string;
  name: string;
  teamNameDraft: string | null;
  startingBudget: number;
  remainingBudget: number;
  createdTeamName: string | null;
};

export function OwnerTable({
  owners,
  isAdmin,
}: {
  owners: OwnerRow[];
  isAdmin: boolean;
}) {
  const [editingOwner, setEditingOwner] = useState<OwnerRow | null>(null);

  const budgets = new Set(owners.map((o) => o.startingBudget));
  const unequalBudgets = budgets.size > 1;

  return (
    <div className="flex flex-col gap-4">
      {unequalBudgets && (
        <div className="rounded-lg border border-accent/40 bg-accent/10 px-3 py-2 text-sm text-accent">
          Starting budgets are not equal across all owners. Equalize them
          before starting the auction.
        </div>
      )}

      <div className="rounded-xl border">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Owner</TableHead>
              <TableHead>Starting budget</TableHead>
              <TableHead>Remaining budget</TableHead>
              <TableHead>Team</TableHead>
              {isAdmin && <TableHead className="text-right">Actions</TableHead>}
            </TableRow>
          </TableHeader>
          <TableBody>
            {owners.map((owner) => (
              <TableRow key={owner.id}>
                <TableCell className="font-medium">{owner.name}</TableCell>
                <TableCell>{owner.startingBudget}</TableCell>
                <TableCell>{owner.remainingBudget}</TableCell>
                <TableCell>
                  {owner.createdTeamName ? (
                    <Badge variant="secondary">{owner.createdTeamName}</Badge>
                  ) : owner.teamNameDraft ? (
                    <span className="text-muted-foreground">
                      {owner.teamNameDraft} (not created yet)
                    </span>
                  ) : (
                    "—"
                  )}
                </TableCell>
                {isAdmin && (
                  <TableCell className="text-right">
                    <Button
                      size="icon-sm"
                      variant="ghost"
                      onClick={() => setEditingOwner(owner)}
                    >
                      <Pencil />
                    </Button>
                  </TableCell>
                )}
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </div>

      {isAdmin && (
        <OwnerEditDialog
          open={Boolean(editingOwner)}
          onOpenChange={(open) => !open && setEditingOwner(null)}
          owner={editingOwner}
        />
      )}
    </div>
  );
}
