/*
  Warnings:

  - You are about to drop the column `imageVerified` on the `User` table. All the data in the column will be lost.

*/
-- AlterTable
ALTER TABLE `User` DROP COLUMN `imageVerified`,
    ADD COLUMN `isVerified` BOOLEAN NOT NULL DEFAULT false;
