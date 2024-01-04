/*
  Warnings:

  - You are about to drop the column `parentId` on the `Interest` table. All the data in the column will be lost.

*/
-- DropForeignKey
ALTER TABLE `Interest` DROP FOREIGN KEY `Interest_parentId_fkey`;

-- AlterTable
ALTER TABLE `Interest` DROP COLUMN `parentId`,
    ADD COLUMN `interestCategoryId` VARCHAR(191) NULL;

-- CreateTable
CREATE TABLE `InterestCategory` (
    `id` VARCHAR(191) NOT NULL,
    `name` VARCHAR(191) NOT NULL,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updatedAt` DATETIME(3) NOT NULL,

    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- AddForeignKey
ALTER TABLE `Interest` ADD CONSTRAINT `Interest_interestCategoryId_fkey` FOREIGN KEY (`interestCategoryId`) REFERENCES `InterestCategory`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;
