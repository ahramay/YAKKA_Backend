/*
  Warnings:

  - You are about to drop the column `feeUrl` on the `Group` table. All the data in the column will be lost.

*/
-- AlterTable
ALTER TABLE `Group` DROP COLUMN `feeUrl`,
    ADD COLUMN `paymentAmount` INTEGER NULL,
    ADD COLUMN `paymentUrl` VARCHAR(191) NULL;
