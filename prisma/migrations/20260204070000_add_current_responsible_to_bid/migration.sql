-- AddColumn
ALTER TABLE "Bid" ADD COLUMN     "currentResponsibleUserId" INTEGER;

-- AddForeignKey
ALTER TABLE "Bid" ADD CONSTRAINT "Bid_currentResponsibleUserId_fkey" FOREIGN KEY ("currentResponsibleUserId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;
