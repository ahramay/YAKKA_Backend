/*
  Warnings:

  - You are about to drop the column `description` on the `UserProfile` table. All the data in the column will be lost.

*/
-- AlterTable
ALTER TABLE `User` ADD COLUMN `imageVerified` BOOLEAN NOT NULL DEFAULT false;

-- AlterTable
ALTER TABLE `UserProfile` DROP COLUMN `description`,
    ADD COLUMN `bio` VARCHAR(191) NULL,
    MODIFY `locationName` VARCHAR(191) NULL;

-- CreateTable
CREATE TABLE `Gesture` (
    `id` INTEGER NOT NULL AUTO_INCREMENT,
    `description` VARCHAR(191) NULL,
    `imageName` VARCHAR(191) NOT NULL,

    UNIQUE INDEX `Gesture_imageName_key`(`imageName`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `UserVerificationImage` (
    `id` INTEGER NOT NULL AUTO_INCREMENT,
    `userId` INTEGER NOT NULL,
    `gestureId` INTEGER NOT NULL,
    `imageName` VARCHAR(191) NOT NULL,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updatedAt` DATETIME(3) NOT NULL,

    UNIQUE INDEX `UserVerificationImage_userId_key`(`userId`),
    UNIQUE INDEX `UserVerificationImage_imageName_key`(`imageName`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- AddForeignKey
ALTER TABLE `UserVerificationImage` ADD CONSTRAINT `UserVerificationImage_userId_fkey` FOREIGN KEY (`userId`) REFERENCES `User`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `UserVerificationImage` ADD CONSTRAINT `UserVerificationImage_gestureId_fkey` FOREIGN KEY (`gestureId`) REFERENCES `Gesture`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;
