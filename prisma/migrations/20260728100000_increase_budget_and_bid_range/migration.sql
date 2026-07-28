-- Budget and bid range scale up 100x (100 -> 10000, min bid 10 -> 1000,
-- max bid 60 -> 6000). Bid range is enforced only in application code, so
-- nothing to migrate there. For owner budgets: reset startingBudget to the
-- new default and recompute remainingBudget from each owner's actual
-- historical spend (sum of their players' auctionPrice), rather than
-- scaling the old remainingBudget — that keeps the "remaining = starting -
-- spent" invariant correct even though already-sold prices stay on the old
-- (10-60) scale.
ALTER TABLE "Owner" ALTER COLUMN "startingBudget" SET DEFAULT 10000;
ALTER TABLE "Owner" ALTER COLUMN "remainingBudget" SET DEFAULT 10000;

UPDATE "Owner" o
SET "startingBudget" = 10000,
    "remainingBudget" = 10000 - COALESCE(spent.total, 0)
FROM (
  SELECT t."ownerId" AS owner_id, SUM(p."auctionPrice") AS total
  FROM "Team" t
  JOIN "Player" p ON p."teamId" = t.id
  WHERE p."auctionPrice" IS NOT NULL
  GROUP BY t."ownerId"
) AS spent
WHERE spent.owner_id = o.id;

UPDATE "Owner"
SET "startingBudget" = 10000,
    "remainingBudget" = 10000
WHERE id NOT IN (
  SELECT DISTINCT t."ownerId" FROM "Team" t
  JOIN "Player" p ON p."teamId" = t.id
  WHERE p."auctionPrice" IS NOT NULL
);
