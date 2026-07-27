"use client";

import { useEffect, useState } from "react";
import { useForm } from "react-hook-form";
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
import { updateOwner } from "@/lib/actions/owners";
import { type OwnerFormValues, ownerFormSchema } from "@/lib/validations/owner";
import type { OwnerRow } from "@/components/owners/owner-table";

export function OwnerEditDialog({
  open,
  onOpenChange,
  owner,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  owner: OwnerRow | null;
}) {
  const [submitting, setSubmitting] = useState(false);

  const form = useForm<OwnerFormValues>({
    resolver: zodResolver(ownerFormSchema),
    defaultValues: { name: "", teamName: "", startingBudget: 100 },
  });

  useEffect(() => {
    if (open && owner) {
      form.reset({
        name: owner.name,
        teamName: owner.teamNameDraft ?? "",
        startingBudget: owner.startingBudget,
      });
    }
  }, [open, owner, form]);

  async function onSubmit(values: OwnerFormValues) {
    if (!owner) return;
    setSubmitting(true);
    const result = await updateOwner(owner.id, values);
    setSubmitting(false);

    if (!result.ok) {
      toast.error(result.error);
      return;
    }

    toast.success("Owner updated");
    onOpenChange(false);
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Edit owner</DialogTitle>
          <DialogDescription>
            Update this owner&apos;s name and starting auction budget.
          </DialogDescription>
        </DialogHeader>

        <form
          className="flex flex-col gap-4"
          onSubmit={form.handleSubmit(onSubmit)}
        >
          <div className="flex flex-col gap-1.5">
            <Label htmlFor="owner-name">Name</Label>
            <Input id="owner-name" {...form.register("name")} />
            {form.formState.errors.name && (
              <p className="text-xs text-destructive">
                {form.formState.errors.name.message}
              </p>
            )}
          </div>

          <div className="flex flex-col gap-1.5">
            <Label htmlFor="owner-team-name">Team name (optional)</Label>
            <Input
              id="owner-team-name"
              placeholder={owner ? `${owner.name}'s Team` : "Defaults to owner name"}
              {...form.register("teamName")}
            />
          </div>

          <div className="flex flex-col gap-1.5">
            <Label htmlFor="owner-budget">Starting budget</Label>
            <Input
              id="owner-budget"
              type="number"
              min={1}
              {...form.register("startingBudget")}
            />
            {form.formState.errors.startingBudget && (
              <p className="text-xs text-destructive">
                {form.formState.errors.startingBudget.message}
              </p>
            )}
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
              {submitting ? "Saving..." : "Save changes"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
