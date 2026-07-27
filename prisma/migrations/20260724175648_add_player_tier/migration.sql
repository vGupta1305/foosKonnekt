-- CreateEnum
CREATE TYPE "PlayerTier" AS ENUM ('A', 'B', 'C', 'D');

-- AlterTable
ALTER TABLE "Player" ADD COLUMN     "tier" "PlayerTier";
