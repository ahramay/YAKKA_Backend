-- AlterTable
ALTER TABLE `Group` ADD COLUMN `date` DATETIME(3) NULL,
    ADD COLUMN `endTime` DATETIME(3) NULL,
    ADD COLUMN `startTime` DATETIME(3) NULL;

-- CreateTable
CREATE TABLE `GroupParticipant` (
    `id` INTEGER NOT NULL AUTO_INCREMENT,
    `groupId` INTEGER NOT NULL,
    `userId` INTEGER NOT NULL,
    `role` ENUM('ADMIN', 'MEMBER', 'INVITEE') NOT NULL DEFAULT 'INVITEE',
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updatedAt` DATETIME(3) NOT NULL,

    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- AddForeignKey
ALTER TABLE `GroupParticipant` ADD CONSTRAINT `GroupParticipant_groupId_fkey` FOREIGN KEY (`groupId`) REFERENCES `Group`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `GroupParticipant` ADD CONSTRAINT `GroupParticipant_userId_fkey` FOREIGN KEY (`userId`) REFERENCES `User`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;
