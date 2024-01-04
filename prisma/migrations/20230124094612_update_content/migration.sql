-- CreateTable
CREATE TABLE `ContentGroupIcons` (
    `id` INTEGER NOT NULL AUTO_INCREMENT,
    `name` VARCHAR(191) NOT NULL,
    `contentGroupId` INTEGER NOT NULL,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updatedAt` DATETIME(3) NOT NULL,

    UNIQUE INDEX `ContentGroupIcons_name_contentGroupId_key`(`name`, `contentGroupId`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- AddForeignKey
ALTER TABLE `ContentGroupIcons` ADD CONSTRAINT `ContentGroupIcons_contentGroupId_fkey` FOREIGN KEY (`contentGroupId`) REFERENCES `ContentGroup`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;
