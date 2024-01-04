-- DropIndex
DROP INDEX `UserImage_userId_imageName_key` ON `UserImage`;

-- AlterTable
ALTER TABLE `UserImage` MODIFY `imageName` TEXT NOT NULL;
