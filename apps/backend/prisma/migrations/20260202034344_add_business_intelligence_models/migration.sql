-- CreateTable
CREATE TABLE "business_products" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "profile_id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "slug" TEXT,
    "description" TEXT,
    "short_description" TEXT,
    "category" TEXT,
    "sub_category" TEXT,
    "price_type" TEXT NOT NULL DEFAULT 'FIXED',
    "price" REAL,
    "price_min" REAL,
    "price_max" REAL,
    "currency" TEXT NOT NULL DEFAULT 'USD',
    "pricing_model" TEXT,
    "features" TEXT NOT NULL DEFAULT '[]',
    "benefits" TEXT NOT NULL DEFAULT '[]',
    "specifications" TEXT NOT NULL DEFAULT '{}',
    "images" TEXT NOT NULL DEFAULT '[]',
    "target_market" TEXT,
    "ideal_customer" TEXT,
    "use_cases" TEXT NOT NULL DEFAULT '[]',
    "competitors" TEXT NOT NULL DEFAULT '[]',
    "differentiators" TEXT NOT NULL DEFAULT '[]',
    "keywords" TEXT NOT NULL DEFAULT '[]',
    "hashtags" TEXT NOT NULL DEFAULT '[]',
    "is_active" BOOLEAN NOT NULL DEFAULT true,
    "is_featured" BOOLEAN NOT NULL DEFAULT false,
    "sort_order" INTEGER NOT NULL DEFAULT 0,
    "created_at" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" DATETIME NOT NULL,
    CONSTRAINT "business_products_profile_id_fkey" FOREIGN KEY ("profile_id") REFERENCES "user_profiles" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "business_services" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "profile_id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "slug" TEXT,
    "description" TEXT,
    "short_description" TEXT,
    "category" TEXT,
    "price_type" TEXT NOT NULL DEFAULT 'CUSTOM',
    "price" REAL,
    "price_min" REAL,
    "price_max" REAL,
    "currency" TEXT NOT NULL DEFAULT 'USD',
    "billing_frequency" TEXT,
    "deliverables" TEXT NOT NULL DEFAULT '[]',
    "process" TEXT NOT NULL DEFAULT '[]',
    "duration" TEXT,
    "target_market" TEXT,
    "ideal_client" TEXT,
    "industries" TEXT NOT NULL DEFAULT '[]',
    "competitors" TEXT NOT NULL DEFAULT '[]',
    "differentiators" TEXT NOT NULL DEFAULT '[]',
    "keywords" TEXT NOT NULL DEFAULT '[]',
    "hashtags" TEXT NOT NULL DEFAULT '[]',
    "is_active" BOOLEAN NOT NULL DEFAULT true,
    "is_featured" BOOLEAN NOT NULL DEFAULT false,
    "sort_order" INTEGER NOT NULL DEFAULT 0,
    "created_at" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" DATETIME NOT NULL,
    CONSTRAINT "business_services_profile_id_fkey" FOREIGN KEY ("profile_id") REFERENCES "user_profiles" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "business_competitors" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "profile_id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "website" TEXT,
    "description" TEXT,
    "facebook_url" TEXT,
    "instagram_url" TEXT,
    "twitter_url" TEXT,
    "linkedin_url" TEXT,
    "youtube_url" TEXT,
    "tiktok_url" TEXT,
    "market_position" TEXT,
    "market_share" TEXT,
    "target_audience" TEXT,
    "pricing_strategy" TEXT,
    "strengths" TEXT NOT NULL DEFAULT '[]',
    "weaknesses" TEXT NOT NULL DEFAULT '[]',
    "opportunities" TEXT NOT NULL DEFAULT '[]',
    "threats" TEXT NOT NULL DEFAULT '[]',
    "key_products" TEXT NOT NULL DEFAULT '[]',
    "key_services" TEXT NOT NULL DEFAULT '[]',
    "content_strategy" TEXT,
    "ad_platforms" TEXT NOT NULL DEFAULT '[]',
    "ad_strategies" TEXT NOT NULL DEFAULT '[]',
    "ad_examples" TEXT NOT NULL DEFAULT '[]',
    "content_themes" TEXT NOT NULL DEFAULT '[]',
    "posting_frequency" TEXT,
    "social_followers" TEXT NOT NULL DEFAULT '{}',
    "engagement_rate" REAL,
    "notes" TEXT,
    "is_active" BOOLEAN NOT NULL DEFAULT true,
    "last_analyzed_at" DATETIME,
    "created_at" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" DATETIME NOT NULL,
    CONSTRAINT "business_competitors_profile_id_fkey" FOREIGN KEY ("profile_id") REFERENCES "user_profiles" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "target_audiences" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "profile_id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "description" TEXT,
    "is_primary" BOOLEAN NOT NULL DEFAULT false,
    "age_min" INTEGER,
    "age_max" INTEGER,
    "gender" TEXT,
    "income_level" TEXT,
    "education_level" TEXT,
    "occupation" TEXT,
    "job_titles" TEXT NOT NULL DEFAULT '[]',
    "industries" TEXT NOT NULL DEFAULT '[]',
    "company_size" TEXT,
    "locations" TEXT NOT NULL DEFAULT '[]',
    "languages" TEXT NOT NULL DEFAULT '[]',
    "interests" TEXT NOT NULL DEFAULT '[]',
    "hobbies" TEXT NOT NULL DEFAULT '[]',
    "values" TEXT NOT NULL DEFAULT '[]',
    "lifestyle" TEXT,
    "personality" TEXT,
    "buying_behavior" TEXT,
    "decision_factors" TEXT NOT NULL DEFAULT '[]',
    "purchase_frequency" TEXT,
    "preferred_channels" TEXT NOT NULL DEFAULT '[]',
    "device_usage" TEXT NOT NULL DEFAULT '[]',
    "pain_points" TEXT NOT NULL DEFAULT '[]',
    "goals" TEXT NOT NULL DEFAULT '[]',
    "challenges" TEXT NOT NULL DEFAULT '[]',
    "objections" TEXT NOT NULL DEFAULT '[]',
    "content_preferences" TEXT NOT NULL DEFAULT '[]',
    "social_platforms" TEXT NOT NULL DEFAULT '[]',
    "best_posting_times" TEXT NOT NULL DEFAULT '{}',
    "messaging_tone" TEXT,
    "key_messages" TEXT NOT NULL DEFAULT '[]',
    "avoid_topics" TEXT NOT NULL DEFAULT '[]',
    "is_active" BOOLEAN NOT NULL DEFAULT true,
    "sort_order" INTEGER NOT NULL DEFAULT 0,
    "created_at" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" DATETIME NOT NULL,
    CONSTRAINT "target_audiences_profile_id_fkey" FOREIGN KEY ("profile_id") REFERENCES "user_profiles" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- RedefineTables
PRAGMA defer_foreign_keys=ON;
PRAGMA foreign_keys=OFF;
CREATE TABLE "new_user_profiles" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "user_id" TEXT NOT NULL,
    "business_name" TEXT,
    "industry" TEXT,
    "sub_industry" TEXT,
    "description" TEXT,
    "mission" TEXT,
    "vision" TEXT,
    "founded_year" INTEGER,
    "employee_count" TEXT,
    "annual_revenue" TEXT,
    "business_model" TEXT,
    "services" TEXT NOT NULL DEFAULT '[]',
    "products" TEXT NOT NULL DEFAULT '[]',
    "competitors" TEXT NOT NULL DEFAULT '[]',
    "target_audience" TEXT,
    "location" TEXT,
    "country" TEXT,
    "city" TEXT,
    "timezone" TEXT NOT NULL DEFAULT 'UTC',
    "website" TEXT,
    "social_links" TEXT NOT NULL DEFAULT '{}',
    "logo_url" TEXT,
    "brand_colors" TEXT,
    "brand_voice" TEXT,
    "tone_preference" TEXT NOT NULL DEFAULT 'professional',
    "brand_keywords" TEXT NOT NULL DEFAULT '[]',
    "unique_selling_points" TEXT NOT NULL DEFAULT '[]',
    "value_proposition" TEXT,
    "market_position" TEXT,
    "pricing_strategy" TEXT,
    "completeness" INTEGER NOT NULL DEFAULT 0,
    "created_at" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" DATETIME NOT NULL,
    CONSTRAINT "user_profiles_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);
INSERT INTO "new_user_profiles" ("brand_colors", "business_name", "competitors", "completeness", "created_at", "description", "id", "industry", "location", "logo_url", "products", "services", "target_audience", "timezone", "tone_preference", "updated_at", "user_id") SELECT "brand_colors", "business_name", "competitors", "completeness", "created_at", "description", "id", "industry", "location", "logo_url", "products", "services", "target_audience", "timezone", "tone_preference", "updated_at", "user_id" FROM "user_profiles";
DROP TABLE "user_profiles";
ALTER TABLE "new_user_profiles" RENAME TO "user_profiles";
CREATE UNIQUE INDEX "user_profiles_user_id_key" ON "user_profiles"("user_id");
PRAGMA foreign_keys=ON;
PRAGMA defer_foreign_keys=OFF;

-- CreateIndex
CREATE INDEX "business_products_profile_id_is_active_idx" ON "business_products"("profile_id", "is_active");

-- CreateIndex
CREATE UNIQUE INDEX "business_products_profile_id_slug_key" ON "business_products"("profile_id", "slug");

-- CreateIndex
CREATE INDEX "business_services_profile_id_is_active_idx" ON "business_services"("profile_id", "is_active");

-- CreateIndex
CREATE UNIQUE INDEX "business_services_profile_id_slug_key" ON "business_services"("profile_id", "slug");

-- CreateIndex
CREATE INDEX "business_competitors_profile_id_is_active_idx" ON "business_competitors"("profile_id", "is_active");

-- CreateIndex
CREATE INDEX "target_audiences_profile_id_is_active_idx" ON "target_audiences"("profile_id", "is_active");
