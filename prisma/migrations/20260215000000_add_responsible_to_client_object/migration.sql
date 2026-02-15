-- Add responsible field to ClientObject
ALTER TABLE "ClientObject" ADD COLUMN "responsibleId" INTEGER;

ALTER TABLE "ClientObject" ADD CONSTRAINT "ClientObject_responsibleId_fkey" 
    FOREIGN KEY ("responsibleId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

CREATE INDEX "ClientObject_responsibleId_idx" ON "ClientObject"("responsibleId");
