-- CreateTable
CREATE TABLE "ClientEquipment" (
    "id" SERIAL NOT NULL,
    "clientId" INTEGER NOT NULL,
    "equipmentId" INTEGER NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "ClientEquipment_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "ClientEquipment_clientId_equipmentId_key" ON "ClientEquipment"("clientId", "equipmentId");

-- AddForeignKey
ALTER TABLE "ClientEquipment" ADD CONSTRAINT "ClientEquipment_clientId_fkey" FOREIGN KEY ("clientId") REFERENCES "Client"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ClientEquipment" ADD CONSTRAINT "ClientEquipment_equipmentId_fkey" FOREIGN KEY ("equipmentId") REFERENCES "Equipment"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- Migrate existing data from Equipment.clientId to ClientEquipment
INSERT INTO "ClientEquipment" ("clientId", "equipmentId", "createdAt", "updatedAt")
SELECT "clientId", "id", CURRENT_TIMESTAMP, CURRENT_TIMESTAMP
FROM "Equipment"
WHERE "clientId" IS NOT NULL;

-- DropForeignKey
ALTER TABLE "Equipment" DROP CONSTRAINT "Equipment_clientId_fkey";

-- AlterTable
ALTER TABLE "Equipment" DROP COLUMN "clientId";