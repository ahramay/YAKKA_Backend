/*
  Warnings:

  - A unique constraint covering the columns `[userId,blockedUserId]` on the table `BlockedUser` will be added. If there are existing duplicate values, this will fail.

*/
-- CreateIndex
CREATE UNIQUE INDEX `BlockedUser_userId_blockedUserId_key` ON `BlockedUser`(`userId`, `blockedUserId`);
