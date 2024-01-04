-- AlterTable
ALTER TABLE `UserImage` ADD COLUMN `source` ENUM('YAKKA', 'FACEBOOK') NOT NULL DEFAULT 'YAKKA';

-- AlterTable
ALTER TABLE `UserProfile` ADD COLUMN `coverPhoto` TEXT NULL;
