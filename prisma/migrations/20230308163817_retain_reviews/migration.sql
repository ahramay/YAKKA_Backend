-- DropForeignKey
ALTER TABLE `YakkaReview` DROP FOREIGN KEY `YakkaReview_authorId_fkey`;

-- DropForeignKey
ALTER TABLE `YakkaReview` DROP FOREIGN KEY `YakkaReview_receiverId_fkey`;

-- AlterTable
ALTER TABLE `YakkaReview` MODIFY `authorId` INTEGER NULL,
    MODIFY `receiverId` INTEGER NULL;

-- AddForeignKey
ALTER TABLE `YakkaReview` ADD CONSTRAINT `YakkaReview_authorId_fkey` FOREIGN KEY (`authorId`) REFERENCES `User`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `YakkaReview` ADD CONSTRAINT `YakkaReview_receiverId_fkey` FOREIGN KEY (`receiverId`) REFERENCES `User`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;
