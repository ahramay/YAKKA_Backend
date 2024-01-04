/*
  Warnings:

  - You are about to drop the column `phoneVerificationCode` on the `User` table. All the data in the column will be lost.
  - You are about to drop the column `phoneVerificationCodeExpiry` on the `User` table. All the data in the column will be lost.

*/
-- AlterTable
ALTER TABLE `User` DROP COLUMN `phoneVerificationCode`,
    DROP COLUMN `phoneVerificationCodeExpiry`;
