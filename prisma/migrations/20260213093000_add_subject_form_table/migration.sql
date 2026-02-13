-- CreateSubjectFormTable
CREATE TABLE "public"."SubjectForm" (
    "id" SERIAL NOT NULL,
    "name" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    CONSTRAINT "SubjectForm_pkey" PRIMARY KEY ("id"),
    CONSTRAINT "SubjectForm_name_key" UNIQUE ("name")
);

ALTER TABLE "public"."SubjectForm" OWNER TO "postgres";
