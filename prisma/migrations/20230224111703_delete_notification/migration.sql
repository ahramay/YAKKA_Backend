-- DropForeignKey
ALTER TABLE `Notification` DROP FOREIGN KEY `Notification_yakkaId_fkey`;

-- AddForeignKey
ALTER TABLE `Notification` ADD CONSTRAINT `Notification_yakkaId_fkey` FOREIGN KEY (`yakkaId`) REFERENCES `Yakka`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;
