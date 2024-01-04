/*
  Warnings:

  - You are about to drop the column `clause` on the `Notification` table. All the data in the column will be lost.
  - You are about to drop the column `isDeleted` on the `Notification` table. All the data in the column will be lost.
  - You are about to drop the column `postpositionName` on the `Notification` table. All the data in the column will be lost.
  - You are about to drop the column `prepositionName` on the `Notification` table. All the data in the column will be lost.

*/
-- AlterTable
ALTER TABLE `Notification` DROP COLUMN `clause`,
    DROP COLUMN `isDeleted`,
    DROP COLUMN `postpositionName`,
    DROP COLUMN `prepositionName`;
