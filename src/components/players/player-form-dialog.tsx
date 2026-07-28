"use client";

import { useEffect, useState } from "react";
import { Controller, useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { createPlayer, updatePlayer } from "@/lib/actions/players";
import {
  PLAYER_POSITIONS,
  PLAYER_TIERS,
  type PlayerFormValues,
  playerFormSchema,
} from "@/lib/validations/player";

const POSITION_LABELS: Record<(typeof PLAYER_POSITIONS)[number], string> = {
  ATTACKER: "Attacker",
  DEFENDER: "Defender",
  ALL_ROUNDER: "All-Rounder",
};

export type PlayerRow = {
  id: string;
  name: string;
  tier: string | null;
  position: string | null;
  auctionPrice: number | null;
  teamName: string | null;
};

export function PlayerFormDialog({
  open,
  onOpenChange,
  player,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  player?: PlayerRow | null;
}) {
  const isEdit = Boolean(player);
  const [submitting, setSubmitting] = useState(false);

  const form = useForm<PlayerFormValues>({
    resolver: zodResolver(playerFormSchema),
    defaultValues: {
      name: "",
      tier: "",
      position: "",
    },
  });

  useEffect(() => {
    if (open) {
      form.reset({
        name: player?.name ?? "",
        tier: (player?.tier as PlayerFormValues["tier"]) ?? "",
        position: (player?.position as PlayerFormValues["position"]) ?? "",
      });
    }
  }, [open, player, form]);

  async function onSubmit(values: PlayerFormValues) {
    setSubmitting(true);
    const result = isEdit
      ? await updatePlayer(player!.id, values)
      : await createPlayer(values);
    setSubmitting(false);

    if (!result.ok) {
      toast.error(result.error);
      return;
    }

    toast.success(isEdit ? "Player updated" : "Player added");
    onOpenChange(false);
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>{isEdit ? "Edit player" : "Add player"}</DialogTitle>
          <DialogDescription>
            {isEdit
              ? "Update this player's details."
              : "Add a new player to the pool."}
          </DialogDescription>
        </DialogHeader>

        <form
          className="flex flex-col gap-4"
          onSubmit={form.handleSubmit(onSubmit)}
        >
          <div className="flex flex-col gap-1.5">
            <Label htmlFor="name">Name</Label>
            <Input id="name" {...form.register("name")} />
            {form.formState.errors.name && (
              <p className="text-xs text-destructive">
                {form.formState.errors.name.message}
              </p>
            )}
          </div>

          <div className="flex flex-col gap-1.5">
            <Label>Tier (optional)</Label>
            <Controller
              control={form.control}
              name="tier"
              render={({ field }) => (
                <Select
                  value={field.value ?? ""}
                  onValueChange={(v) => field.onChange(v)}
                >
                  <SelectTrigger className="w-full">
                    <SelectValue placeholder="No tier assigned" />
                  </SelectTrigger>
                  <SelectContent>
                    {PLAYER_TIERS.map((tier) => (
                      <SelectItem key={tier} value={tier}>
                        Tier {tier} (lottery)
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              )}
            />
            {form.formState.errors.tier && (
              <p className="text-xs text-destructive">
                {form.formState.errors.tier.message}
              </p>
            )}
          </div>

          <div className="flex flex-col gap-1.5">
            <Label>Position (optional)</Label>
            <Controller
              control={form.control}
              name="position"
              render={({ field }) => (
                <Select
                  value={field.value ?? ""}
                  onValueChange={(v) => field.onChange(v)}
                >
                  <SelectTrigger className="w-full">
                    <SelectValue placeholder="No position assigned" />
                  </SelectTrigger>
                  <SelectContent>
                    {PLAYER_POSITIONS.map((position) => (
                      <SelectItem key={position} value={position}>
                        {POSITION_LABELS[position]}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              )}
            />
          </div>

          <DialogFooter>
            <Button
              type="button"
              variant="outline"
              onClick={() => onOpenChange(false)}
            >
              Cancel
            </Button>
            <Button type="submit" disabled={submitting}>
              {submitting ? "Saving..." : isEdit ? "Save changes" : "Add player"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
