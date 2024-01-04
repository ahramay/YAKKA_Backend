/*
  Warnings:

  - You are about to drop the column `geoHash` on the `UserLocation` table. All the data in the column will be lost.
  - Added the required column `geohash` to the `UserLocation` table without a default value. This is not possible if the table is not empty.

*/
-- AlterTable
ALTER TABLE `UserLocation` DROP COLUMN `geoHash`,
    ADD COLUMN `geohash` VARCHAR(12) NOT NULL;

-- CreateIndex
CREATE INDEX `geohash` ON `UserLocation`(`geohash`);
