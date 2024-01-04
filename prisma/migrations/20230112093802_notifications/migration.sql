/*
  Warnings:

  - You are about to drop the column `dataKeyIv` on the `Chat` table. All the data in the column will be lost.

*/
-- AlterTable
ALTER TABLE `Chat` DROP COLUMN `dataKeyIv`;

-- CreateTable
CREATE TABLE `Notification` (
    `id` INTEGER NOT NULL AUTO_INCREMENT,
    `userId` INTEGER NOT NULL,
    `prepositionName` VARCHAR(191) NOT NULL,
    `clause` VARCHAR(191) NOT NULL,
    `postpositionName` VARCHAR(191) NULL,
    `type` ENUM('YAKKA_INVITE', 'YAKKA_INVITE_RESPONSE', 'YAKKA_UPDATED', 'YAKKA_CANCELLED', 'YAKKA_REVIEWED', 'FRIEND_REQUEST', 'ACCEPTED_FRIEND_REQUEST', 'MISC') NOT NULL,
    `reviewId` INTEGER NULL,
    `friendRequestId` INTEGER NULL,
    `yakakInviteId` INTEGER NULL,
    `isRead` BOOLEAN NOT NULL DEFAULT false,
    `isDeleted` BOOLEAN NOT NULL DEFAULT false,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updatedAt` DATETIME(3) NOT NULL,

    INDEX `Notification_userId_fkey`(`userId`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- AddForeignKey
ALTER TABLE `Notification` ADD CONSTRAINT `Notification_userId_fkey` FOREIGN KEY (`userId`) REFERENCES `User`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `Notification` ADD CONSTRAINT `Notification_reviewId_fkey` FOREIGN KEY (`reviewId`) REFERENCES `YakkaReview`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `Notification` ADD CONSTRAINT `Notification_friendRequestId_fkey` FOREIGN KEY (`friendRequestId`) REFERENCES `Friends`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `Notification` ADD CONSTRAINT `Notification_yakakInviteId_fkey` FOREIGN KEY (`yakakInviteId`) REFERENCES `Yakka`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;
