-- CreateTable
CREATE TABLE "ClientAttribute" (
    "id" SERIAL NOT NULL,
    "name" TEXT NOT NULL,
    "type" TEXT NOT NULL,
    "options" JSONB,
    "isEnabled" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "ClientAttribute_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ClientAttributeValue" (
    "id" SERIAL NOT NULL,
    "clientId" INTEGER NOT NULL,
    "attributeId" INTEGER NOT NULL,
    "value" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "ClientAttributeValue_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "ClientAttributeValue_clientId_attributeId_key" ON "ClientAttributeValue"("clientId", "attributeId");

-- AddForeignKey
ALTER TABLE "ClientAttributeValue" ADD CONSTRAINT "ClientAttributeValue_clientId_fkey" FOREIGN KEY ("clientId") REFERENCES "Client"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ClientAttributeValue" ADD CONSTRAINT "ClientAttributeValue_attributeId_fkey" FOREIGN KEY ("attributeId") REFERENCES "ClientAttribute"("id") ON DELETE CASCADE ON UPDATE CASCADE;
