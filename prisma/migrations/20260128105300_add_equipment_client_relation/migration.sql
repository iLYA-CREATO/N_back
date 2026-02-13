-- AlterTable
ALTER TABLE "Equipment" ADD COLUMN     "clientId" INTEGER;

-- AlterTable
ALTER TABLE "ClientObject" ADD COLUMN     "equipmentId" INTEGER;

-- AlterTable
ALTER TABLE "ClientObject" DROP COLUMN "equipment";

-- AddForeignKey
ALTER TABLE "Equipment" ADD CONSTRAINT "Equipment_clientId_fkey" FOREIGN KEY ("clientId") REFERENCES "Client"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ClientObject" ADD CONSTRAINT "ClientObject_equipmentId_fkey" FOREIGN KEY ("equipmentId") REFERENCES "Equipment"("id") ON DELETE SET NULL ON UPDATE CASCADE;