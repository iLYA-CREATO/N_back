-- AlterTable
ALTER TABLE "Bid" ADD COLUMN     "parentId" INTEGER;

-- AddForeignKey
ALTER TABLE "Bid" ADD CONSTRAINT "Bid_parentId_fkey" FOREIGN KEY ("parentId") REFERENCES "Bid"("id") ON DELETE SET NULL ON UPDATE CASCADE;
