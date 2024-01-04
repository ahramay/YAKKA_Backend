/*
  Warnings:

  - The values [YAKKA_INVITE_RESPONSE] on the enum `Notification_type` will be removed. If these variants are still used in the database, this will fail.

*/
-- AlterTable
ALTER TABLE `Notification` MODIFY `type` ENUM('YAKKA_INVITE', 'YAKKA_ACCEPTED', 'YAKKA_DECLINED', 'YAKKA_UPDATED', 'YAKKA_CANCELLED', 'YAKKA_REVIEWED', 'FRIEND_REQUEST', 'ACCEPTED_FRIEND_REQUEST', 'MISC') NOT NULL;
