-- Add permissions column to Role table
ALTER TABLE "Role" ADD COLUMN "permissions" JSONB;