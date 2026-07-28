-- Tiers B/C/D are removed; those players fall back into the general
-- randomized auction pool (tier = NULL), same as any other non-lottery player.
UPDATE "Player" SET "tier" = NULL WHERE "tier" IN ('B', 'C', 'D');

-- Postgres can't drop enum values in place, so recreate the type with just A.
CREATE TYPE "PlayerTier_new" AS ENUM ('A');
ALTER TABLE "Player" ALTER COLUMN "tier" TYPE "PlayerTier_new" USING ("tier"::text::"PlayerTier_new");
DROP TYPE "PlayerTier";
ALTER TYPE "PlayerTier_new" RENAME TO "PlayerTier";
