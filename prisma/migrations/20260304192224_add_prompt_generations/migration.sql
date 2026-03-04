-- CreateTable
CREATE TABLE "prompt_generations" (
    "id" TEXT NOT NULL,
    "user_id" TEXT NOT NULL,
    "domain" TEXT NOT NULL DEFAULT 'wedding',
    "input_image_url" TEXT,
    "prompts" JSONB NOT NULL,
    "model_config_id" TEXT,
    "credits_used" INTEGER NOT NULL DEFAULT 5,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "prompt_generations_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "prompt_generations_user_id_idx" ON "prompt_generations"("user_id");

-- CreateIndex
CREATE INDEX "prompt_generations_domain_idx" ON "prompt_generations"("domain");

-- CreateIndex
CREATE INDEX "prompt_generations_created_at_idx" ON "prompt_generations"("created_at");

-- AddForeignKey
ALTER TABLE "prompt_generations" ADD CONSTRAINT "prompt_generations_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;
