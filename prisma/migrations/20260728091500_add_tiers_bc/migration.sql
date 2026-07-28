-- Reintroduce Tier B (10 players) and Tier C (5 players); Tier A stays
-- lottery-only. Existing untiered players are left as-is (tier = NULL) —
-- an admin assigns each one to B or C manually from the Players page.
ALTER TYPE "PlayerTier" ADD VALUE 'B';
ALTER TYPE "PlayerTier" ADD VALUE 'C';
