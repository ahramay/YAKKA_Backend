-- AlterTable
ALTER TABLE `Notification` MODIFY `type` ENUM('YAKKA_INVITE', 'YAKKA_ACCEPTED', 'YAKKA_DECLINED', 'YAKKA_UPDATED', 'YAKKA_CANCELLED', 'YAKKA_REVIEWED', 'FRIEND_REQUEST', 'ACCEPTED_FRIEND_REQUEST', 'VERIFICATION_FAILED', 'VERIFICATION_REMINDER', 'MISC') NOT NULL;
