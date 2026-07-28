import { z } from "zod";

export const MAX_PLAYERS = 16;
export const PLAYER_TIERS = ["A"] as const;
/** Tier A (allocated by lottery) must have exactly this many players. */
export const MAX_PLAYERS_PER_TIER = 4;
export const PLAYER_POSITIONS = ["ATTACKER", "DEFENDER", "ALL_ROUNDER"] as const;

const tierField = z
  .union([z.enum(PLAYER_TIERS), z.literal("")])
  .optional()
  .transform((v) => (v === "" || v === undefined ? undefined : v));

const positionField = z
  .union([z.enum(PLAYER_POSITIONS), z.literal("")])
  .optional()
  .transform((v) => (v === "" || v === undefined ? undefined : v));

export const playerFormSchema = z.object({
  name: z.string().trim().min(1, "Name is required").max(100),
  tier: tierField,
  position: positionField,
});

export type PlayerFormValues = z.input<typeof playerFormSchema>;
export type PlayerFormParsed = z.output<typeof playerFormSchema>;

export const csvPlayerRowSchema = z.object({
  name: z.string().trim().min(1),
  tier: tierField,
  position: positionField,
});
