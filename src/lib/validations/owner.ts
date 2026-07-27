import { z } from "zod";

export const OWNER_COUNT = 5;

export const ownerFormSchema = z.object({
  name: z.string().trim().min(1, "Name is required").max(100),
  teamName: z
    .string()
    .trim()
    .max(100)
    .optional()
    .or(z.literal(""))
    .transform((v) => (v ? v : undefined)),
  startingBudget: z.coerce.number().int().min(1, "Budget must be positive"),
});

export type OwnerFormValues = z.input<typeof ownerFormSchema>;
