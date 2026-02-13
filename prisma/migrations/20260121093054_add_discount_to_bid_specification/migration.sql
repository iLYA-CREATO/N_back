-- AlterTable
ALTER TABLE "Bid" ADD COLUMN     "assignedAt" TIMESTAMP(3),
ADD COLUMN     "plannedDurationHours" INTEGER,
ADD COLUMN     "plannedReactionTimeMinutes" INTEGER,
ADD COLUMN     "plannedResolutionDate" TIMESTAMP(3),
ADD COLUMN     "spentTimeHours" DECIMAL(10,2);
