-- AlterTable
ALTER TABLE "templates" ADD COLUMN "prompt_descriptions" JSONB NOT NULL DEFAULT '[]';
