/*
  Warnings:

  - You are about to drop the column `image` on the `AdminUser` table. All the data in the column will be lost.
  - You are about to drop the column `name` on the `AdminUser` table. All the data in the column will be lost.
  - Added the required column `firstName` to the `AdminUser` table without a default value. This is not possible if the table is not empty.
  - Added the required column `lastName` to the `AdminUser` table without a default value. This is not possible if the table is not empty.
  - Made the column `email` on table `AdminUser` required. This step will fail if there are existing NULL values in that column.

*/
-- AlterTable
ALTER TABLE `AdminUser` DROP COLUMN `image`,
    DROP COLUMN `name`,
    ADD COLUMN `firstName` VARCHAR(191) NOT NULL,
    ADD COLUMN `lastName` VARCHAR(191) NOT NULL,
    MODIFY `email` VARCHAR(191) NOT NULL;
