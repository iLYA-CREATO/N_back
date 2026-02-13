-- DropForeignKey
ALTER TABLE "EquipmentItem" DROP CONSTRAINT "EquipmentItem_equipmentId_fkey";
ALTER TABLE "EquipmentItem" DROP CONSTRAINT "EquipmentItem_clientId_fkey";
ALTER TABLE "EquipmentItem" DROP CONSTRAINT "EquipmentItem_bidId_fkey";
ALTER TABLE "EquipmentItem" DROP CONSTRAINT "EquipmentItem_supplierId_fkey";
ALTER TABLE "EquipmentItem" DROP CONSTRAINT "EquipmentItem_warehouseId_fkey";

-- DropTable
DROP TABLE "EquipmentItem";