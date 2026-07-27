-- CreateEnum
CREATE TYPE "PlayerPosition" AS ENUM ('ATTACKER', 'DEFENDER', 'ALL_ROUNDER');

-- CreateEnum
CREATE TYPE "Role" AS ENUM ('ADMIN', 'READ_ONLY');

-- AlterTable
ALTER TABLE "Player" ADD COLUMN     "position" "PlayerPosition";

-- CreateTable
CREATE TABLE "User" (
    "id" TEXT NOT NULL,
    "username" TEXT NOT NULL,
    "passwordHash" TEXT NOT NULL,
    "role" "Role" NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "User_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "User_username_key" ON "User"("username");
