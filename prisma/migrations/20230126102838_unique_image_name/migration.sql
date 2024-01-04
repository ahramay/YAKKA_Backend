/*
  Warnings:

  - A unique constraint covering the columns `[imageName]` on the table `UserImage` will be added. If there are existing duplicate values, this will fail.

*/
-- AlterTable
ALTER TABLE `UserImage` MODIFY `imageName` VARCHAR(191) NOT NULL;

-- CreateIndex
CREATE UNIQUE INDEX `UserImage_imageName_key` ON `UserImage`(`imageName`);
