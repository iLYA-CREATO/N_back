/*
  Warnings:

  - You are about to alter the column `plannedDurationHours` on the `Bid` table. The data in that column could be lost. The data in that column will be cast from `Integer` to `Decimal(5,2)`.
  - You are about to alter the column `spentTimeHours` on the `Bid` table. The data in that column could be lost. The data in that column will be cast from `Decimal(10,2)` to `Decimal(5,2)`.

*/
-- AlterTable
ALTER TABLE "Bid" ALTER COLUMN "plannedDurationHours" SET DATA TYPE DECIMAL(5,2),
ALTER COLUMN "spentTimeHours" SET DATA TYPE DECIMAL(5,2);

-- AlterTable
ALTER TABLE "BidSpecification" ADD COLUMN     "discount" DECIMAL(5,2) NOT NULL DEFAULT 0;
