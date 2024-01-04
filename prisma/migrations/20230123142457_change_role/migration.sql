/*
  Warnings:

  - The values [SUPER_ADMIN] on the enum `AdminUser_accessLevel` will be removed. If these variants are still used in the database, this will fail.

*/
-- AlterTable
ALTER TABLE `AdminUser` MODIFY `accessLevel` ENUM('ADMIN', 'VERIFIER') NOT NULL DEFAULT 'ADMIN';
