/*
  Warnings:

  - You are about to drop the column `icon` on the `Content` table. All the data in the column will be lost.

*/
-- AlterTable
ALTER TABLE `Content` DROP COLUMN `icon`,
    ADD COLUMN `iconId` INTEGER NULL;

-- AddForeignKey
ALTER TABLE `Content` ADD CONSTRAINT `Content_iconId_fkey` FOREIGN KEY (`iconId`) REFERENCES `ContentGroupIcons`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;
