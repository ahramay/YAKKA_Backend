/*
  Warnings:

  - A unique constraint covering the columns `[userId,sortOrder]` on the table `UserImage` will be added. If there are existing duplicate values, this will fail.

*/
-- AlterTable
ALTER TABLE `UserImage` ADD COLUMN `sortOrder` INTEGER NOT NULL DEFAULT 0;

-- CreateIndex
CREATE UNIQUE INDEX `UserImage_userId_sortOrder_key` ON `UserImage`(`userId`, `sortOrder`);
