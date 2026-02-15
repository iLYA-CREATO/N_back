-- Add bidEquipmentId column to Contract table
ALTER TABLE "Contract" ADD COLUMN "bidEquipmentId" INTEGER;

-- Create unique index for bidEquipmentId (matching Prisma schema)
CREATE UNIQUE INDEX "Contract_bidEquipmentId_key" ON "Contract"("bidEquipmentId");

-- Add foreign key constraint
ALTER TABLE "Contract" ADD CONSTRAINT "Contract_bidEquipmentId_fkey" 
FOREIGN KEY ("bidEquipmentId") REFERENCES "BidEquipment"("id") ON DELETE SET NULL ON UPDATE CASCADE;
