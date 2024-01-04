/*
  Warnings:

  - A unique constraint covering the columns `[authorId,receiverId,yakkaId]` on the table `YakkaReview` will be added. If there are existing duplicate values, this will fail.

*/
-- CreateIndex
CREATE UNIQUE INDEX `YakkaReview_authorId_receiverId_yakkaId_key` ON `YakkaReview`(`authorId`, `receiverId`, `yakkaId`);
