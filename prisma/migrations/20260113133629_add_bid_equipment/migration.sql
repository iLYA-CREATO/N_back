-- CreateTable
CREATE TABLE "BidEquipment" (
    "id" SERIAL NOT NULL,
    "bidId" INTEGER NOT NULL,
    "equipmentId" INTEGER NOT NULL,
    "imei" TEXT,
    "quantity" INTEGER NOT NULL DEFAULT 1,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "BidEquipment_pkey" PRIMARY KEY ("id")
);

-- AddForeignKey
ALTER TABLE "BidEquipment" ADD CONSTRAINT "BidEquipment_bidId_fkey" FOREIGN KEY ("bidId") REFERENCES "Bid"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "BidEquipment" ADD CONSTRAINT "BidEquipment_equipmentId_fkey" FOREIGN KEY ("equipmentId") REFERENCES "Equipment"("id") ON DELETE CASCADE ON UPDATE CASCADE;
