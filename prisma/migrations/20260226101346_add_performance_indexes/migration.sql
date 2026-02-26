-- Add composite indexes for performance optimization

-- Projects: user_id + created_at for sorted user project lists
CREATE INDEX IF NOT EXISTS "projects_user_id_created_at_idx" ON "projects"("user_id", "created_at" DESC);

-- Generations: user_id + created_at for sorted user generation lists
CREATE INDEX IF NOT EXISTS "generations_user_id_created_at_idx" ON "generations"("user_id", "created_at" DESC);

-- Generations: user_id + generation_type + created_at for filtered lists
CREATE INDEX IF NOT EXISTS "generations_user_id_type_created_at_idx" ON "generations"("user_id", "generation_type", "created_at" DESC);

-- Generations: project_id + created_at for latest generation per project
CREATE INDEX IF NOT EXISTS "generations_project_id_created_at_idx" ON "generations"("project_id", "created_at" DESC);

-- Generated Images: generation_id + image_index for ordered image retrieval
CREATE INDEX IF NOT EXISTS "generated_images_generation_id_image_index_idx" ON "generated_images"("generation_id", "image_index");

-- Generated Images: unique constraint to prevent duplicate writes
ALTER TABLE "generated_images" ADD CONSTRAINT "generated_images_generation_id_image_type_image_index_key" UNIQUE ("generation_id", "image_type", "image_index");

-- Model Configs: type + status + source for active config lookup
CREATE INDEX IF NOT EXISTS "model_configs_type_status_source_idx" ON "model_configs"("type", "status", "source");

-- Templates: is_active + domain + sort_order for template listing
CREATE INDEX IF NOT EXISTS "templates_is_active_domain_sort_order_idx" ON "templates"("is_active", "domain", "sort_order");
