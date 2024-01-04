/*
  Warnings:

  - You are about to drop the column `locationCoords` on the `UserProfile` table. All the data in the column will be lost.
  - You are about to drop the column `locationName` on the `UserProfile` table. All the data in the column will be lost.

*/
-- AlterTable
ALTER TABLE `UserProfile` DROP COLUMN `locationCoords`,
    DROP COLUMN `locationName`;

-- CreateTable
CREATE TABLE `UserLocation` (
    `id` INTEGER NOT NULL AUTO_INCREMENT,
    `userId` INTEGER NOT NULL,
    `latitude` DOUBLE NOT NULL,
    `longitude` DOUBLE NOT NULL,
    `geoHash` VARCHAR(12) NOT NULL,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updatedAt` DATETIME(3) NOT NULL,

    UNIQUE INDEX `UserLocation_userId_key`(`userId`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- AddForeignKey
ALTER TABLE `UserLocation` ADD CONSTRAINT `UserLocation_userId_fkey` FOREIGN KEY (`userId`) REFERENCES `User`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;
