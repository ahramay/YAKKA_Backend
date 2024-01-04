/*
  Warnings:

  - A unique constraint covering the columns `[userId,hashtagId]` on the table `UserHashtag` will be added. If there are existing duplicate values, this will fail.

*/
-- CreateIndex
CREATE UNIQUE INDEX `UserHashtag_userId_hashtagId_key` ON `UserHashtag`(`userId`, `hashtagId`);
