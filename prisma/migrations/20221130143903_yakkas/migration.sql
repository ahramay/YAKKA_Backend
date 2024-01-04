-- CreateTable
CREATE TABLE `Yakka` (
    `id` INTEGER NOT NULL AUTO_INCREMENT,
    `organiserId` INTEGER NOT NULL,
    `inviteeId` INTEGER NOT NULL,
    `coordinates` VARCHAR(191) NOT NULL,
    `locationName` VARCHAR(191) NOT NULL,
    `status` ENUM('PENDING', 'ACCEPTED', 'DECLINED') NOT NULL DEFAULT 'PENDING',
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updatedAt` DATETIME(3) NOT NULL,

    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- AddForeignKey
ALTER TABLE `Yakka` ADD CONSTRAINT `Yakka_organiserId_fkey` FOREIGN KEY (`organiserId`) REFERENCES `User`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `Yakka` ADD CONSTRAINT `Yakka_inviteeId_fkey` FOREIGN KEY (`inviteeId`) REFERENCES `User`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;
