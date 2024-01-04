/*
  Warnings:

  - Made the column `gender` on table `UserProfile` required. This step will fail if there are existing NULL values in that column.
  - Made the column `bio` on table `UserProfile` required. This step will fail if there are existing NULL values in that column.

*/
-- AlterTable
ALTER TABLE `UserProfile` MODIFY `gender` VARCHAR(191) NOT NULL DEFAULT 'Prefer not to say',
    MODIFY `bio` VARCHAR(150) NOT NULL;

-- CreateTable
CREATE TABLE `UserReview` (
    `id` INTEGER NOT NULL AUTO_INCREMENT,
    `userId` INTEGER NOT NULL,
    `revierId` INTEGER NULL,
    `rating` INTEGER NOT NULL,
    `comment` VARCHAR(191) NULL,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updatedAt` DATETIME(3) NOT NULL,

    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- AddForeignKey
ALTER TABLE `UserReview` ADD CONSTRAINT `UserReview_userId_fkey` FOREIGN KEY (`userId`) REFERENCES `User`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `UserReview` ADD CONSTRAINT `UserReview_revierId_fkey` FOREIGN KEY (`revierId`) REFERENCES `User`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;
