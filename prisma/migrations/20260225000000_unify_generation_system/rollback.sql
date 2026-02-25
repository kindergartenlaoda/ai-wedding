-- Rollback Migration: Unify Generation System & Fix Image Storage
-- Date: 2026-02-25
-- Description: Rollback script to restore single_generations table and JSON image storage

-- Step 1: Recreate single_generations table
CREATE TABLE "single_generations" (
  "id" TEXT NOT NULL PRIMARY KEY,
  "user_id" TEXT NOT NULL,
  "prompt" TEXT NOT NULL,
  "original_image" TEXT NOT NULL,
  "result_image" TEXT NOT NULL,
  "settings" JSONB NOT NULL DEFAULT '{}',
  "credits_used" INTEGER NOT NULL DEFAULT 15,
  "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

  CONSTRAINT "single_generations_user_id_fkey"
    FOREIGN KEY ("user_id")
    REFERENCES "users"("id")
    ON DELETE CASCADE
    ON UPDATE CASCADE
);

CREATE INDEX "single_generations_user_id_idx" ON "single_generations"("user_id");
CREATE INDEX "single_generations_created_at_idx" ON "single_generations"("created_at");

-- Step 2: Restore data from generations to single_generations
INSERT INTO "single_generations" (
  "id",
  "user_id",
  "prompt",
  "original_image",
  "result_image",
  "settings",
  "credits_used",
  "created_at"
)
SELECT
  g."id",
  g."user_id",
  COALESCE(g."prompt", '') as "prompt",
  COALESCE(g."original_image", '') as "original_image",
  COALESCE(
    (SELECT gi."image_url" FROM "generated_images" gi
     WHERE gi."generation_id" = g."id"
     ORDER BY gi."image_index" LIMIT 1),
    ''
  ) as "result_image",
  COALESCE(g."settings", '{}'::jsonb) as "settings",
  g."credits_used",
  g."created_at"
FROM "generations" g
WHERE g."generation_type" = 'single';

-- Step 3: Restore preview_images and high_res_images JSON arrays
-- Aggregate generated_images back into JSON arrays
UPDATE "generations" g
SET "preview_images" = COALESCE(
  (
    SELECT jsonb_agg(gi."image_url" ORDER BY gi."image_index")
    FROM "generated_images" gi
    WHERE gi."generation_id" = g."id"
      AND gi."image_type" = 'preview'
  ),
  '[]'::jsonb
)
WHERE g."generation_type" = 'batch';

UPDATE "generations" g
SET "high_res_images" = COALESCE(
  (
    SELECT jsonb_agg(gi."image_url" ORDER BY gi."image_index")
    FROM "generated_images" gi
    WHERE gi."generation_id" = g."id"
      AND gi."image_type" = 'high_res'
  ),
  '[]'::jsonb
)
WHERE g."generation_type" = 'batch';

-- Step 4: Delete single generation records from generations table
DELETE FROM "generations" WHERE "generation_type" = 'single';

-- Step 5: Drop generated_images table
DROP TABLE IF EXISTS "generated_images";

-- Step 6: Remove new columns from generations
ALTER TABLE "generations"
  DROP COLUMN IF EXISTS "generation_type",
  DROP COLUMN IF EXISTS "prompt",
  DROP COLUMN IF EXISTS "original_image",
  DROP COLUMN IF EXISTS "settings";

-- Step 7: Make projectId NOT NULL again
ALTER TABLE "generations"
  ALTER COLUMN "project_id" SET NOT NULL;

-- Step 8: Drop new enums
DROP TYPE IF EXISTS "ImageType";
DROP TYPE IF EXISTS "GenerationType";

-- Step 9: Drop indexes
DROP INDEX IF EXISTS "generations_generation_type_idx";
