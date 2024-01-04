-- CreateTable
CREATE TABLE `GroupHashtag` (
    `id` INTEGER NOT NULL AUTO_INCREMENT,
    `groupId` INTEGER NOT NULL,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updatedAt` DATETIME(3) NOT NULL,
    `hashtagId` INTEGER NOT NULL,

    INDEX `UserHashtag_hashtagId_fkey`(`hashtagId`),
    UNIQUE INDEX `GroupHashtag_groupId_hashtagId_key`(`groupId`, `hashtagId`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- AddForeignKey
ALTER TABLE `GroupHashtag` ADD CONSTRAINT `GroupHashtag_hashtagId_fkey` FOREIGN KEY (`hashtagId`) REFERENCES `Hashtag`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `GroupHashtag` ADD CONSTRAINT `GroupHashtag_groupId_fkey` FOREIGN KEY (`groupId`) REFERENCES `Group`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;
