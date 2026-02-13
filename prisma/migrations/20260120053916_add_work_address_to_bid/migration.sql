-- AlterTable
ALTER TABLE "Bid" ADD COLUMN     "workAddress" TEXT;

-- AlterTable
ALTER TABLE "Role" ADD COLUMN     "permissions" JSONB;
