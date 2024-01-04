/*
  Warnings:

  - You are about to alter the column `gender` on the `UserProfile` table. The data in that column could be lost. The data in that column will be cast from `VarChar(191)` to `Enum(EnumId(2))`.

*/
-- AlterTable
ALTER TABLE `UserProfile` MODIFY `gender` ENUM('Man', 'Woman', 'Nonbinary', 'Other') NOT NULL;
