-- Add description column to Equipment table
ALTER TABLE "public"."Equipment" ADD COLUMN "description" TEXT;

ALTER TABLE "public"."Equipment" OWNER TO "postgres";
