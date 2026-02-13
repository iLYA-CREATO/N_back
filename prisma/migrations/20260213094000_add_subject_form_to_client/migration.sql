-- Add subjectForm column to Client table
ALTER TABLE "public"."Client" ADD COLUMN "subjectForm" TEXT;

ALTER TABLE "public"."Client" OWNER TO "postgres";
