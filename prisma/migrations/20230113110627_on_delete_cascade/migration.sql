-- DropForeignKey
ALTER TABLE `Notification` DROP FOREIGN KEY `Notification_senderId_fkey`;

-- AddForeignKey
ALTER TABLE `Notification` ADD CONSTRAINT `Notification_senderId_fkey` FOREIGN KEY (`senderId`) REFERENCES `User`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;
