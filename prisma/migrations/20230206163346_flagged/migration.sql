/*
  Warnings:

  - You are about to drop the `AddedFlaggedWords` table. If the table is not empty, all the data it contains will be lost.
  - You are about to drop the `RemovedFlaggedWords` table. If the table is not empty, all the data it contains will be lost.

*/
-- DropTable
DROP TABLE `AddedFlaggedWords`;

-- DropTable
DROP TABLE `RemovedFlaggedWords`;

-- CreateTable
CREATE TABLE `FlaggedWords` (
    `id` INTEGER NOT NULL AUTO_INCREMENT,
    `word` VARCHAR(191) NOT NULL,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updatedAt` DATETIME(3) NOT NULL,

    UNIQUE INDEX `FlaggedWords_word_key`(`word`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;
