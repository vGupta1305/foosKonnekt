/*
  Warnings:

  - You are about to drop the column `department` on the `Player` table. All the data in the column will be lost.
  - You are about to drop the column `rating` on the `Player` table. All the data in the column will be lost.

*/
-- AlterTable
ALTER TABLE "Player" DROP COLUMN "department",
DROP COLUMN "rating";
