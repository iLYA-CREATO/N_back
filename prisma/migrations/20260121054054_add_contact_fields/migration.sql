/*
  Warnings:

  - You are about to drop the column `secondaryStatus` on the `Bid` table. All the data in the column will be lost.
  - You are about to drop the column `secondaryStatuses` on the `BidType` table. All the data in the column will be lost.

*/
-- AlterTable
ALTER TABLE "Bid" DROP COLUMN "secondaryStatus";

-- AlterTable
ALTER TABLE "BidType" DROP COLUMN "secondaryStatuses";
