-- DropForeignKey
ALTER TABLE `BlockedUser` DROP FOREIGN KEY `BlockedUser_blockedUserId_fkey`;

-- DropForeignKey
ALTER TABLE `BlockedUser` DROP FOREIGN KEY `BlockedUser_userId_fkey`;

-- DropForeignKey
ALTER TABLE `UserImage` DROP FOREIGN KEY `UserImage_userId_fkey`;

-- AddForeignKey
ALTER TABLE `BlockedUser` ADD CONSTRAINT `BlockedUser_blockedUserId_fkey` FOREIGN KEY (`blockedUserId`) REFERENCES `User`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `BlockedUser` ADD CONSTRAINT `BlockedUser_userId_fkey` FOREIGN KEY (`userId`) REFERENCES `User`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `UserImage` ADD CONSTRAINT `UserImage_userId_fkey` FOREIGN KEY (`userId`) REFERENCES `User`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;
