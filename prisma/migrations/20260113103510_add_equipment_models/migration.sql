-- CreateTable
CREATE TABLE "Warehouse" (
    "id" SERIAL NOT NULL,
    "name" TEXT NOT NULL,
    "address" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Warehouse_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "EquipmentItem" (
    "id" SERIAL NOT NULL,
    "equipmentId" INTEGER NOT NULL,
    "supplierId" INTEGER,
    "warehouseId" INTEGER,
    "clientId" INTEGER,
    "imei" TEXT,
    "purchasePrice" DECIMAL(10,2),
    "quantity" DECIMAL(10,2) NOT NULL DEFAULT 1,
    "bidId" INTEGER,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "EquipmentItem_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "Warehouse_name_key" ON "Warehouse"("name");

-- AddForeignKey
ALTER TABLE "EquipmentItem" ADD CONSTRAINT "EquipmentItem_equipmentId_fkey" FOREIGN KEY ("equipmentId") REFERENCES "Equipment"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "EquipmentItem" ADD CONSTRAINT "EquipmentItem_supplierId_fkey" FOREIGN KEY ("supplierId") REFERENCES "Supplier"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "EquipmentItem" ADD CONSTRAINT "EquipmentItem_warehouseId_fkey" FOREIGN KEY ("warehouseId") REFERENCES "Warehouse"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "EquipmentItem" ADD CONSTRAINT "EquipmentItem_clientId_fkey" FOREIGN KEY ("clientId") REFERENCES "Client"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "EquipmentItem" ADD CONSTRAINT "EquipmentItem_bidId_fkey" FOREIGN KEY ("bidId") REFERENCES "Bid"("id") ON DELETE SET NULL ON UPDATE CASCADE;
