/*
  Warnings:

  - A unique constraint covering the columns `[name,interestCategoryId]` on the table `Interest` will be added. If there are existing duplicate values, this will fail.
  - A unique constraint covering the columns `[name]` on the table `InterestCategory` will be added. If there are existing duplicate values, this will fail.

*/
-- CreateIndex
CREATE UNIQUE INDEX `Interest_name_interestCategoryId_key` ON `Interest`(`name`, `interestCategoryId`);

-- CreateIndex
CREATE UNIQUE INDEX `InterestCategory_name_key` ON `InterestCategory`(`name`);
