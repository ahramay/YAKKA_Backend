-- AlterTable
ALTER TABLE `Group` ADD COLUMN `feeUrl` VARCHAR(191) NULL DEFAULT '',
    ADD COLUMN `private` BOOLEAN NOT NULL DEFAULT false;

-- CreateTable
CREATE TABLE `GroupInterest` (
    `id` INTEGER NOT NULL AUTO_INCREMENT,
    `groupId` INTEGER NOT NULL,
    `interestId` INTEGER NOT NULL,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updatedAt` DATETIME(3) NOT NULL,

    INDEX `UserInterest_interestId_fkey`(`interestId`),
    UNIQUE INDEX `GroupInterest_groupId_interestId_key`(`groupId`, `interestId`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- AddForeignKey
ALTER TABLE `GroupInterest` ADD CONSTRAINT `GroupInterest_interestId_fkey` FOREIGN KEY (`interestId`) REFERENCES `Interest`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;
