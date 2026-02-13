-- Add missing columns to ClientEquipment table
ALTER TABLE "ClientEquipment" ADD COLUMN "bidId" INTEGER;
ALTER TABLE "ClientEquipment" ADD COLUMN "imei" TEXT;

-- Add foreign key for bidId
ALTER TABLE "ClientEquipment" ADD CONSTRAINT "ClientEquipment_bidId_fkey" FOREIGN KEY ("bidId") REFERENCES "Bid"("id") ON DELETE SET NULL ON UPDATE CASCADE;
