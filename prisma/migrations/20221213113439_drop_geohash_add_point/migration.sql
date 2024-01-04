/*
  Warnings:

  - You are about to drop the column `geohash` on the `UserLocation` table. All the data in the column will be lost.
  - Added the required column `point` to the `UserLocation` table without a default value. This is not possible if the table is not empty.

*/
-- DropIndex
DROP INDEX `geohash` ON `UserLocation`;

-- AlterTable
ALTER TABLE `UserLocation` DROP COLUMN `geohash`,
    ADD COLUMN `point` point NOT NULL, ADD SPATIAL `point_index` (`point`);
