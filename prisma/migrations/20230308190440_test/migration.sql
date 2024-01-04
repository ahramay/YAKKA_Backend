-- DropForeignKey
ALTER TABLE `Notification` DROP FOREIGN KEY `Notification_reviewId_fkey`;

-- DropForeignKey
ALTER TABLE `YakkaReview` DROP FOREIGN KEY `YakkaReview_yakkaId_fkey`;

-- AlterTable
ALTER TABLE `YakkaReview` MODIFY `yakkaId` INTEGER NULL;

-- AddForeignKey
ALTER TABLE `Notification` ADD CONSTRAINT `Notification_reviewId_fkey` FOREIGN KEY (`reviewId`) REFERENCES `YakkaReview`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `YakkaReview` ADD CONSTRAINT `YakkaReview_yakkaId_fkey` FOREIGN KEY (`yakkaId`) REFERENCES `Yakka`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;
