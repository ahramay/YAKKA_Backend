/*
  Warnings:

  - Added the required column `endTime` to the `Yakka` table without a default value. This is not possible if the table is not empty.

*/
-- AlterTable
ALTER TABLE `Yakka` ADD COLUMN `endTime` DATETIME(3) NOT NULL;
