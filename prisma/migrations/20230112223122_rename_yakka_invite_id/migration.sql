/*
  Warnings:

  - You are about to drop the column `yakakInviteId` on the `Notification` table. All the data in the column will be lost.

*/
-- DropForeignKey
ALTER TABLE `Notification` DROP FOREIGN KEY `Notification_yakakInviteId_fkey`;

-- AlterTable
ALTER TABLE `Notification` DROP COLUMN `yakakInviteId`,
    ADD COLUMN `yakkaId` INTEGER NULL;

-- AddForeignKey
ALTER TABLE `Notification` ADD CONSTRAINT `Notification_yakkaId_fkey` FOREIGN KEY (`yakkaId`) REFERENCES `Yakka`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;
