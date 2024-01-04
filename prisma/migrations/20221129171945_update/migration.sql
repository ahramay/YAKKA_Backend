/*
  Warnings:

  - You are about to drop the column `hashtagId` on the `User` table. All the data in the column will be lost.
  - A unique constraint covering the columns `[userId,id]` on the table `UserImage` will be added. If there are existing duplicate values, this will fail.

*/
-- DropForeignKey
ALTER TABLE `User` DROP FOREIGN KEY `User_hashtagId_fkey`;

-- AlterTable
ALTER TABLE `User` DROP COLUMN `hashtagId`;

-- CreateIndex
CREATE UNIQUE INDEX `UserImage_userId_id_key` ON `UserImage`(`userId`, `id`);
