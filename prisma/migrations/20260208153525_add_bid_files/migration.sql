-- AlterTable
ALTER TABLE "Comment" ALTER COLUMN "updatedAt" DROP DEFAULT;

-- CreateTable
CREATE TABLE "BidFile" (
    "id" SERIAL NOT NULL,
    "bidId" INTEGER NOT NULL,
    "filename" TEXT NOT NULL,
    "originalName" TEXT NOT NULL,
    "fileSize" INTEGER NOT NULL,
    "mimeType" TEXT,
    "uploadedBy" INTEGER NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "BidFile_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "BidFile_bidId_idx" ON "BidFile"("bidId");

-- AddForeignKey
ALTER TABLE "BidFile" ADD CONSTRAINT "BidFile_bidId_fkey" FOREIGN KEY ("bidId") REFERENCES "Bid"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "BidFile" ADD CONSTRAINT "BidFile_uploadedBy_fkey" FOREIGN KEY ("uploadedBy") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
