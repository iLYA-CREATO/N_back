-- CreateTable
CREATE TABLE "Contract" (
    "id" SERIAL NOT NULL,
    "bidId" INTEGER NOT NULL,
    "contractNumber" TEXT,
    "clientName" TEXT,
    "responsibleName" TEXT,
    "clientObject" TEXT,
    "equipmentName" TEXT,
    "imei" TEXT,
    "quantity" INTEGER NOT NULL DEFAULT 1,
    "contractEndDate" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Contract_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "Contract_bidId_key" ON "Contract"("bidId");

-- AddForeignKey
ALTER TABLE "Contract" ADD CONSTRAINT "Contract_bidId_fkey" FOREIGN KEY ("bidId") REFERENCES "Bid"("id") ON DELETE CASCADE ON UPDATE CASCADE;
