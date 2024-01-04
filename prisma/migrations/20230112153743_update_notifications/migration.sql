/*
  Warnings:

  - Added the required column `clause` to the `Notification` table without a default value. This is not possible if the table is not empty.
  - Added the required column `prepositionName` to the `Notification` table without a default value. This is not possible if the table is not empty.

*/
-- AlterTable
ALTER TABLE `Notification` ADD COLUMN `clause` VARCHAR(191) NOT NULL,
    ADD COLUMN `postpositionName` VARCHAR(191) NULL,
    ADD COLUMN `prepositionName` VARCHAR(191) NOT NULL;
