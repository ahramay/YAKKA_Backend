/*
  Warnings:

  - You are about to drop the `UserReview` table. If the table is not empty, all the data it contains will be lost.

*/
-- DropForeignKey
ALTER TABLE `UserReview` DROP FOREIGN KEY `UserReview_revierId_fkey`;

-- DropForeignKey
ALTER TABLE `UserReview` DROP FOREIGN KEY `UserReview_userId_fkey`;

-- DropTable
DROP TABLE `UserReview`;

-- CreateTable
CREATE TABLE `YakkaReview` (
    `id` INTEGER NOT NULL AUTO_INCREMENT,
    `authorId` INTEGER NOT NULL,
    `receiverId` INTEGER NOT NULL,
    `yakkaId` INTEGER NOT NULL,
    `rating` INTEGER NOT NULL,
    `comment` VARCHAR(191) NULL,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updatedAt` DATETIME(3) NOT NULL,

    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- AddForeignKey
ALTER TABLE `YakkaReview` ADD CONSTRAINT `YakkaReview_authorId_fkey` FOREIGN KEY (`authorId`) REFERENCES `User`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `YakkaReview` ADD CONSTRAINT `YakkaReview_receiverId_fkey` FOREIGN KEY (`receiverId`) REFERENCES `User`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `YakkaReview` ADD CONSTRAINT `YakkaReview_yakkaId_fkey` FOREIGN KEY (`yakkaId`) REFERENCES `Yakka`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;
