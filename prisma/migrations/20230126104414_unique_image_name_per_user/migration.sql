/*
  Warnings:

  - A unique constraint covering the columns `[userId,imageName]` on the table `UserImage` will be added. If there are existing duplicate values, this will fail.

*/
-- DropIndex
DROP INDEX `UserImage_imageName_key` ON `UserImage`;

-- CreateIndex
CREATE UNIQUE INDEX `UserImage_userId_imageName_key` ON `UserImage`(`userId`, `imageName`);
