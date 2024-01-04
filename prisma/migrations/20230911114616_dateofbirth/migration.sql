/*
  Warnings:

  - Made the column `dateOfBirth` on table `UserProfile` required. This step will fail if there are existing NULL values in that column.

*/
-- AlterTable
ALTER TABLE `UserProfile` MODIFY `dateOfBirth` DATE NOT NULL;
