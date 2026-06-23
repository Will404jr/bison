/*
  Warnings:

  - You are about to drop the column `categoryId` on the `Service` table. All the data in the column will be lost.
  - You are about to drop the column `categoryId` on the `Teller` table. All the data in the column will be lost.
  - You are about to drop the `Category` table. If the table is not empty, all the data it contains will be lost.

*/
-- DropForeignKey
ALTER TABLE `Service` DROP FOREIGN KEY `Service_categoryId_fkey`;

-- DropForeignKey
ALTER TABLE `Teller` DROP FOREIGN KEY `Teller_categoryId_fkey`;

-- DropIndex
DROP INDEX `Service_categoryId_fkey` ON `Service`;

-- DropIndex
DROP INDEX `Teller_categoryId_fkey` ON `Teller`;

-- AlterTable
ALTER TABLE `Service` DROP COLUMN `categoryId`;

-- AlterTable
ALTER TABLE `Teller` DROP COLUMN `categoryId`,
    ADD COLUMN `serviceId` VARCHAR(191) NULL;

-- DropTable
DROP TABLE `Category`;

-- AddForeignKey
ALTER TABLE `Teller` ADD CONSTRAINT `Teller_serviceId_fkey` FOREIGN KEY (`serviceId`) REFERENCES `Service`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;
