-- Asset library: every generated, rendered or imported file (images, video,
-- GIF, SVG, HTML, React components, JSON...), filed by folder, tagged and
-- annotated so it can be found and reused instead of produced again.
-- Idempotent, so it is safe on a database `prisma db push` already updated.

CREATE TABLE IF NOT EXISTS "library_assets" (
    "id" TEXT NOT NULL,
    "user_id" TEXT NOT NULL,
    "media_type" TEXT NOT NULL,
    "kind" TEXT NOT NULL,
    "folder" TEXT NOT NULL,
    "title" TEXT,
    "tags" TEXT[] NOT NULL DEFAULT ARRAY[]::TEXT[],
    "notes" TEXT,
    "url" TEXT NOT NULL,
    "storage_key" TEXT NOT NULL,
    "mime_type" TEXT,
    "extension" TEXT,
    "size_bytes" INTEGER,
    "content_hash" TEXT,
    "width" INTEGER,
    "height" INTEGER,
    "duration_ms" INTEGER,
    "source" TEXT,
    "prompt" TEXT,
    "scene" TEXT,
    "parent_id" TEXT,
    "metadata" JSONB,
    "usage_count" INTEGER NOT NULL DEFAULT 0,
    "last_used_at" TIMESTAMP(3),
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,
    CONSTRAINT "library_assets_pkey" PRIMARY KEY ("id"),
    CONSTRAINT "library_assets_user_id_fkey" FOREIGN KEY ("user_id")
        REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE
);

CREATE UNIQUE INDEX IF NOT EXISTS "library_assets_user_id_storage_key_key"
    ON "library_assets"("user_id", "storage_key");
CREATE INDEX IF NOT EXISTS "library_assets_user_id_folder_idx" ON "library_assets"("user_id", "folder");
CREATE INDEX IF NOT EXISTS "library_assets_user_id_media_type_idx" ON "library_assets"("user_id", "media_type");
CREATE INDEX IF NOT EXISTS "library_assets_user_id_kind_idx" ON "library_assets"("user_id", "kind");
CREATE INDEX IF NOT EXISTS "library_assets_user_id_content_hash_idx" ON "library_assets"("user_id", "content_hash");
CREATE INDEX IF NOT EXISTS "library_assets_user_id_created_at_idx" ON "library_assets"("user_id", "created_at");
CREATE INDEX IF NOT EXISTS "library_assets_tags_idx" ON "library_assets" USING GIN ("tags");
