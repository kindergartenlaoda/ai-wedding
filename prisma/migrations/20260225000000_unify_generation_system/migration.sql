-- Migration: Unify Generation System & Fix Image Storage
-- Date: 2026-02-25
-- Description:
--   1. Add generation_type enum and field to generations table
--   2. Make projectId nullable in generations table
--   3. Add single-generation fields (prompt, original_image, settings) to generations
--   4. Create generated_images table for independent image storage
--   5. Migrate data from single_generations to generations
--   6. Migrate data from JSON arrays (preview_images, high_res_images) to generated_images
--   7. Drop single_generations table

-- Step 1: Create new enums
CREATE TYPE "GenerationType" AS ENUM ('batch', 'single');
CREATE TYPE "ImageType" AS ENUM ('preview', 'high_res');

-- Step 2: Add new columns to generations table
ALTER TABLE "generations"
  ADD COLUMN "generation_type" "GenerationType" DEFAULT 'batch',
  ADD COLUMN "prompt" TEXT,
  ADD COLUMN "original_image" TEXT,
  ADD COLUMN "settings" JSONB;

-- Step 3: Make projectId nullable
ALTER TABLE "generations"
  ALTER COLUMN "project_id" DROP NOT NULL;

-- Step 4: Create generated_images table
CREATE TABLE "generated_images" (
  "id" TEXT NOT NULL PRIMARY KEY,
  "generation_id" TEXT NOT NULL,
  "image_url" TEXT NOT NULL,
  "image_type" "ImageType" NOT NULL DEFAULT 'preview',
  "image_index" INTEGER NOT NULL DEFAULT 0,
  "metadata" JSONB,
  "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

  CONSTRAINT "generated_images_generation_id_fkey"
    FOREIGN KEY ("generation_id")
    REFERENCES "generations"("id")
    ON DELETE CASCADE
    ON UPDATE CASCADE
);

-- Step 5: Create indexes for generated_images
CREATE INDEX "generated_images_generation_id_idx" ON "generated_images"("generation_id");
CREATE INDEX "generated_images_image_type_idx" ON "generated_images"("image_type");
CREATE INDEX "generations_generation_type_idx" ON "generations"("generation_type");

-- Step 6: Migrate data from single_generations to generations
-- This creates new generation records with type='single'
INSERT INTO "generations" (
  "id",
  "project_id",
  "user_id",
  "template_id",
  "domain",
  "generation_type",
  "status",
  "prompt",
  "original_image",
  "settings",
  "preview_images",
  "high_res_images",
  "credits_used",
  "is_shared_to_gallery",
  "completed_at",
  "created_at",
  "updated_at"
)
SELECT
  sg."id",
  NULL as "project_id",  -- single generations don't have projects
  sg."user_id",
  NULL as "template_id",  -- single generations may not have templates
  'wedding' as "domain",  -- default domain
  'single'::"GenerationType" as "generation_type",
  'completed' as "status",  -- single generations are always completed
  sg."prompt",
  sg."original_image",
  sg."settings",
  '[]'::jsonb as "preview_images",
  '[]'::jsonb as "high_res_images",
  sg."credits_used",
  false as "is_shared_to_gallery",
  sg."created_at" as "completed_at",
  sg."created_at",
  sg."created_at" as "updated_at"
FROM "single_generations" sg
WHERE NOT EXISTS (
  SELECT 1 FROM "generations" g WHERE g."id" = sg."id"
);

-- Step 7: Migrate single generation result images to generated_images table
-- Each single generation has one result image
INSERT INTO "generated_images" (
  "id",
  "generation_id",
  "image_url",
  "image_type",
  "image_index",
  "created_at"
)
SELECT
  gen_random_uuid()::text as "id",
  sg."id" as "generation_id",
  sg."result_image" as "image_url",
  'preview'::"ImageType" as "image_type",
  0 as "image_index",
  sg."created_at"
FROM "single_generations" sg;

-- Step 8: Migrate preview_images from JSON arrays to generated_images table
-- This extracts each image URL from the JSON array and creates a row
INSERT INTO "generated_images" (
  "id",
  "generation_id",
  "image_url",
  "image_type",
  "image_index",
  "created_at"
)
SELECT
  gen_random_uuid()::text as "id",
  g."id" as "generation_id",
  jsonb_array_elements_text(g."preview_images") as "image_url",
  'preview'::"ImageType" as "image_type",
  (row_number() OVER (PARTITION BY g."id" ORDER BY ordinality) - 1)::integer as "image_index",
  g."created_at"
FROM "generations" g
CROSS JOIN LATERAL jsonb_array_elements_text(g."preview_images") WITH ORDINALITY
WHERE g."preview_images" != '[]'::jsonb
  AND g."generation_type" = 'batch';

-- Step 9: Migrate high_res_images from JSON arrays to generated_images table
INSERT INTO "generated_images" (
  "id",
  "generation_id",
  "image_url",
  "image_type",
  "image_index",
  "created_at"
)
SELECT
  gen_random_uuid()::text as "id",
  g."id" as "generation_id",
  jsonb_array_elements_text(g."high_res_images") as "image_url",
  'high_res'::"ImageType" as "image_type",
  (row_number() OVER (PARTITION BY g."id" ORDER BY ordinality) - 1)::integer as "image_index",
  g."created_at"
FROM "generations" g
CROSS JOIN LATERAL jsonb_array_elements_text(g."high_res_images") WITH ORDINALITY
WHERE g."high_res_images" != '[]'::jsonb
  AND g."generation_type" = 'batch';

-- Step 10: Drop single_generations table
-- All data has been migrated to generations and generated_images
DROP TABLE IF EXISTS "single_generations";

-- Step 11: Add comments for documentation
COMMENT ON TABLE "generated_images" IS 'Independent image storage table. Each generated image is a separate row with metadata.';
COMMENT ON COLUMN "generations"."generation_type" IS 'Type of generation: batch (multi-image with project) or single (single image without project)';
COMMENT ON COLUMN "generations"."project_id" IS 'Optional project reference. NULL for single generations.';
COMMENT ON COLUMN "generations"."prompt" IS 'Prompt used for single generation. NULL for batch generations.';
COMMENT ON COLUMN "generations"."original_image" IS 'Original image URL for single generation. NULL for batch generations.';
COMMENT ON COLUMN "generations"."preview_images" IS 'DEPRECATED: Use generated_images table instead. Kept for backward compatibility during migration.';
COMMENT ON COLUMN "generations"."high_res_images" IS 'DEPRECATED: Use generated_images table instead. Kept for backward compatibility during migration.';
