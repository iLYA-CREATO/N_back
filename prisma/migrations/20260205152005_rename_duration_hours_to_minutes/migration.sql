/*
  Warnings:

  - You are about to drop the column `plannedDurationHours` on the `Bid` table. All the data in the column will be lost.
  - You are about to drop the column `plannedDurationHours` on the `BidType` table. All the data in the column will be lost.

*/
-- AlterTable
ALTER TABLE "Bid" DROP COLUMN "plannedDurationHours",
ADD COLUMN     "plannedDurationMinutes" DECIMAL(5,2);

-- AlterTable
ALTER TABLE "BidType" DROP COLUMN "plannedDurationHours",
ADD COLUMN     "plannedDurationMinutes" DECIMAL(5,2);
