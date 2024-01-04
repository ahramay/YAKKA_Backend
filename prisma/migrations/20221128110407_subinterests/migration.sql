/*
  Warnings:

  - You are about to drop the column `subInterestId` on the `UserInterest` table. All the data in the column will be lost.
  - You are about to drop the `SubInterest` table. If the table is not empty, all the data it contains will be lost.

*/
-- DropForeignKey
ALTER TABLE `SubInterest` DROP FOREIGN KEY `SubInterest_interestId_fkey`;

-- DropForeignKey
ALTER TABLE `UserInterest` DROP FOREIGN KEY `UserInterest_subInterestId_fkey`;

-- AlterTable
ALTER TABLE `Interest` ADD COLUMN `parentId` INTEGER NULL;

-- AlterTable
ALTER TABLE `UserInterest` DROP COLUMN `subInterestId`;

-- DropTable
DROP TABLE `SubInterest`;

-- AddForeignKey
ALTER TABLE `Interest` ADD CONSTRAINT `Interest_parentId_fkey` FOREIGN KEY (`parentId`) REFERENCES `Interest`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;
