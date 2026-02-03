-- CreateTable
CREATE TABLE "workspaces" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "user_id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "slug" TEXT NOT NULL,
    "description" TEXT,
    "logo" TEXT,
    "favicon" TEXT,
    "settings" TEXT NOT NULL DEFAULT '{}',
    "is_published" BOOLEAN NOT NULL DEFAULT false,
    "created_at" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" DATETIME NOT NULL,
    CONSTRAINT "workspaces_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "workspace_pages" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "workspace_id" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "slug" TEXT NOT NULL,
    "description" TEXT,
    "content" TEXT NOT NULL DEFAULT '[]',
    "html_content" TEXT,
    "css_content" TEXT,
    "status" TEXT NOT NULL DEFAULT 'DRAFT',
    "is_home_page" BOOLEAN NOT NULL DEFAULT false,
    "seo_title" TEXT,
    "seo_keywords" TEXT,
    "sort_order" INTEGER NOT NULL DEFAULT 0,
    "published_at" DATETIME,
    "created_at" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" DATETIME NOT NULL,
    CONSTRAINT "workspace_pages_workspace_id_fkey" FOREIGN KEY ("workspace_id") REFERENCES "workspaces" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "workspace_posts" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "workspace_id" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "slug" TEXT NOT NULL,
    "excerpt" TEXT,
    "content" TEXT NOT NULL DEFAULT '',
    "featured_image" TEXT,
    "status" TEXT NOT NULL DEFAULT 'DRAFT',
    "published_at" DATETIME,
    "wp_post_id" TEXT,
    "wp_synced_at" DATETIME,
    "wp_connection_id" TEXT,
    "seo_title" TEXT,
    "seo_description" TEXT,
    "seo_keywords" TEXT,
    "tags" TEXT NOT NULL DEFAULT '[]',
    "categories" TEXT NOT NULL DEFAULT '[]',
    "created_at" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" DATETIME NOT NULL,
    CONSTRAINT "workspace_posts_workspace_id_fkey" FOREIGN KEY ("workspace_id") REFERENCES "workspaces" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "workspace_menus" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "workspace_id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "location" TEXT NOT NULL,
    "items" TEXT NOT NULL DEFAULT '[]',
    "is_active" BOOLEAN NOT NULL DEFAULT true,
    "created_at" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" DATETIME NOT NULL,
    CONSTRAINT "workspace_menus_workspace_id_fkey" FOREIGN KEY ("workspace_id") REFERENCES "workspaces" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateIndex
CREATE UNIQUE INDEX "workspaces_user_id_key" ON "workspaces"("user_id");

-- CreateIndex
CREATE UNIQUE INDEX "workspaces_slug_key" ON "workspaces"("slug");

-- CreateIndex
CREATE INDEX "workspace_pages_workspace_id_status_idx" ON "workspace_pages"("workspace_id", "status");

-- CreateIndex
CREATE UNIQUE INDEX "workspace_pages_workspace_id_slug_key" ON "workspace_pages"("workspace_id", "slug");

-- CreateIndex
CREATE INDEX "workspace_posts_workspace_id_status_idx" ON "workspace_posts"("workspace_id", "status");

-- CreateIndex
CREATE UNIQUE INDEX "workspace_posts_workspace_id_slug_key" ON "workspace_posts"("workspace_id", "slug");

-- CreateIndex
CREATE INDEX "workspace_menus_workspace_id_idx" ON "workspace_menus"("workspace_id");

-- CreateIndex
CREATE UNIQUE INDEX "workspace_menus_workspace_id_location_key" ON "workspace_menus"("workspace_id", "location");
