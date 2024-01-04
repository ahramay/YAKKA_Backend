/*
  Warnings:

  - You are about to drop the `AdminAccount` table. If the table is not empty, all the data it contains will be lost.
  - You are about to drop the `AdminSession` table. If the table is not empty, all the data it contains will be lost.

*/
-- DropForeignKey
ALTER TABLE `AdminAccount` DROP FOREIGN KEY `AdminAccount_userId_fkey`;

-- DropForeignKey
ALTER TABLE `AdminSession` DROP FOREIGN KEY `AdminSession_userId_fkey`;

-- DropForeignKey
ALTER TABLE `Report` DROP FOREIGN KEY `Report_authorId_fkey`;

-- DropForeignKey
ALTER TABLE `Report` DROP FOREIGN KEY `Report_reportedId_fkey`;

-- AlterTable
ALTER TABLE `AdminUser` ADD COLUMN `lastLogin` DATETIME(3) NULL;

-- DropTable
DROP TABLE `AdminAccount`;

-- DropTable
DROP TABLE `AdminSession`;

-- AddForeignKey
ALTER TABLE `Report` ADD CONSTRAINT `Report_authorId_fkey` FOREIGN KEY (`authorId`) REFERENCES `User`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `Report` ADD CONSTRAINT `Report_reportedId_fkey` FOREIGN KEY (`reportedId`) REFERENCES `User`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;
