-- Back to a single allocated tier (A) + one randomized auction pool.
-- Tier B/C players fall back into the general pool (tier = NULL).
UPDATE "Player" SET "tier" = NULL WHERE "tier" IN ('B', 'C');

-- Postgres can't drop enum values in place, so recreate the type with just A.
CREATE TYPE "PlayerTier_new" AS ENUM ('A');
ALTER TABLE "Player" ALTER COLUMN "tier" TYPE "PlayerTier_new" USING ("tier"::text::"PlayerTier_new");
DROP TYPE "PlayerTier";
ALTER TYPE "PlayerTier_new" RENAME TO "PlayerTier";
