/*
  Warnings:

  - You are about to drop the column `ad_examples` on the `business_competitors` table. All the data in the column will be lost.
  - You are about to drop the column `content_themes` on the `business_competitors` table. All the data in the column will be lost.
  - You are about to drop the column `key_products` on the `business_competitors` table. All the data in the column will be lost.
  - You are about to drop the column `key_services` on the `business_competitors` table. All the data in the column will be lost.

*/
-- RedefineTables
PRAGMA defer_foreign_keys=ON;
PRAGMA foreign_keys=OFF;
CREATE TABLE "new_business_competitors" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "profile_id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "website" TEXT,
    "description" TEXT,
    "industry" TEXT,
    "size" TEXT,
    "founded" TEXT,
    "headquarters" TEXT,
    "facebook_url" TEXT,
    "instagram_url" TEXT,
    "twitter_url" TEXT,
    "linkedin_url" TEXT,
    "youtube_url" TEXT,
    "tiktok_url" TEXT,
    "market_position" TEXT,
    "market_share" TEXT,
    "price_position" TEXT,
    "target_audience" TEXT,
    "pricing_strategy" TEXT,
    "strengths" TEXT NOT NULL DEFAULT '[]',
    "weaknesses" TEXT NOT NULL DEFAULT '[]',
    "opportunities" TEXT NOT NULL DEFAULT '[]',
    "threats" TEXT NOT NULL DEFAULT '[]',
    "products" TEXT NOT NULL DEFAULT '[]',
    "services" TEXT NOT NULL DEFAULT '[]',
    "unique_features" TEXT NOT NULL DEFAULT '[]',
    "content_strategy" TEXT,
    "ad_platforms" TEXT NOT NULL DEFAULT '[]',
    "ad_strategies" TEXT NOT NULL DEFAULT '[]',
    "ad_budget_estimate" TEXT,
    "top_performing_ads" TEXT,
    "content_types" TEXT NOT NULL DEFAULT '[]',
    "posting_frequency" TEXT,
    "engagement_level" TEXT,
    "social_followers" TEXT NOT NULL DEFAULT '{}',
    "engagement_rate" REAL,
    "threat_level" TEXT NOT NULL DEFAULT 'MEDIUM',
    "notes" TEXT,
    "is_active" BOOLEAN NOT NULL DEFAULT true,
    "last_analyzed_at" DATETIME,
    "created_at" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" DATETIME NOT NULL,
    CONSTRAINT "business_competitors_profile_id_fkey" FOREIGN KEY ("profile_id") REFERENCES "user_profiles" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);
INSERT INTO "new_business_competitors" ("ad_platforms", "ad_strategies", "content_strategy", "created_at", "description", "engagement_rate", "facebook_url", "id", "instagram_url", "is_active", "last_analyzed_at", "linkedin_url", "market_position", "market_share", "name", "notes", "opportunities", "posting_frequency", "pricing_strategy", "profile_id", "social_followers", "strengths", "target_audience", "threats", "tiktok_url", "twitter_url", "updated_at", "weaknesses", "website", "youtube_url") SELECT "ad_platforms", "ad_strategies", "content_strategy", "created_at", "description", "engagement_rate", "facebook_url", "id", "instagram_url", "is_active", "last_analyzed_at", "linkedin_url", "market_position", "market_share", "name", "notes", "opportunities", "posting_frequency", "pricing_strategy", "profile_id", "social_followers", "strengths", "target_audience", "threats", "tiktok_url", "twitter_url", "updated_at", "weaknesses", "website", "youtube_url" FROM "business_competitors";
DROP TABLE "business_competitors";
ALTER TABLE "new_business_competitors" RENAME TO "business_competitors";
CREATE INDEX "business_competitors_profile_id_is_active_idx" ON "business_competitors"("profile_id", "is_active");
CREATE TABLE "new_business_services" (
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
    "pricing_unit" TEXT,
    "billing_frequency" TEXT,
    "deliverables" TEXT NOT NULL DEFAULT '[]',
    "process" TEXT NOT NULL DEFAULT '[]',
    "requirements" TEXT NOT NULL DEFAULT '[]',
    "benefits" TEXT NOT NULL DEFAULT '[]',
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
INSERT INTO "new_business_services" ("billing_frequency", "category", "competitors", "created_at", "currency", "deliverables", "description", "differentiators", "duration", "hashtags", "id", "ideal_client", "industries", "is_active", "is_featured", "keywords", "name", "price", "price_max", "price_min", "price_type", "process", "profile_id", "short_description", "slug", "sort_order", "target_market", "updated_at") SELECT "billing_frequency", "category", "competitors", "created_at", "currency", "deliverables", "description", "differentiators", "duration", "hashtags", "id", "ideal_client", "industries", "is_active", "is_featured", "keywords", "name", "price", "price_max", "price_min", "price_type", "process", "profile_id", "short_description", "slug", "sort_order", "target_market", "updated_at" FROM "business_services";
DROP TABLE "business_services";
ALTER TABLE "new_business_services" RENAME TO "business_services";
CREATE INDEX "business_services_profile_id_is_active_idx" ON "business_services"("profile_id", "is_active");
CREATE UNIQUE INDEX "business_services_profile_id_slug_key" ON "business_services"("profile_id", "slug");
CREATE TABLE "new_target_audiences" (
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
    "location" TEXT,
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
    "buying_frequency" TEXT,
    "avg_order_value" TEXT,
    "decision_factors" TEXT NOT NULL DEFAULT '[]',
    "purchase_frequency" TEXT,
    "preferred_channels" TEXT NOT NULL DEFAULT '[]',
    "device_usage" TEXT NOT NULL DEFAULT '[]',
    "pain_points" TEXT NOT NULL DEFAULT '[]',
    "goals" TEXT NOT NULL DEFAULT '[]',
    "challenges" TEXT NOT NULL DEFAULT '[]',
    "motivations" TEXT NOT NULL DEFAULT '[]',
    "objections" TEXT NOT NULL DEFAULT '[]',
    "content_preferences" TEXT NOT NULL DEFAULT '[]',
    "content_formats" TEXT NOT NULL DEFAULT '[]',
    "social_platforms" TEXT NOT NULL DEFAULT '[]',
    "best_posting_times" TEXT NOT NULL DEFAULT '{}',
    "communication_style" TEXT,
    "messaging_tone" TEXT,
    "key_messages" TEXT NOT NULL DEFAULT '[]',
    "avoid_topics" TEXT NOT NULL DEFAULT '[]',
    "notes" TEXT,
    "is_active" BOOLEAN NOT NULL DEFAULT true,
    "sort_order" INTEGER NOT NULL DEFAULT 0,
    "created_at" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" DATETIME NOT NULL,
    CONSTRAINT "target_audiences_profile_id_fkey" FOREIGN KEY ("profile_id") REFERENCES "user_profiles" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);
INSERT INTO "new_target_audiences" ("age_max", "age_min", "avoid_topics", "best_posting_times", "buying_behavior", "challenges", "company_size", "content_preferences", "created_at", "decision_factors", "description", "device_usage", "education_level", "gender", "goals", "hobbies", "id", "income_level", "industries", "interests", "is_active", "is_primary", "job_titles", "key_messages", "languages", "lifestyle", "locations", "messaging_tone", "name", "objections", "occupation", "pain_points", "personality", "preferred_channels", "profile_id", "purchase_frequency", "social_platforms", "sort_order", "updated_at", "values") SELECT "age_max", "age_min", "avoid_topics", "best_posting_times", "buying_behavior", "challenges", "company_size", "content_preferences", "created_at", "decision_factors", "description", "device_usage", "education_level", "gender", "goals", "hobbies", "id", "income_level", "industries", "interests", "is_active", "is_primary", "job_titles", "key_messages", "languages", "lifestyle", "locations", "messaging_tone", "name", "objections", "occupation", "pain_points", "personality", "preferred_channels", "profile_id", "purchase_frequency", "social_platforms", "sort_order", "updated_at", "values" FROM "target_audiences";
DROP TABLE "target_audiences";
ALTER TABLE "new_target_audiences" RENAME TO "target_audiences";
CREATE INDEX "target_audiences_profile_id_is_active_idx" ON "target_audiences"("profile_id", "is_active");
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
    "tone_attributes" TEXT NOT NULL DEFAULT '[]',
    "formality" TEXT,
    "communication_style" TEXT,
    "brand_personality" TEXT,
    "brand_archetype" TEXT,
    "personality_traits" TEXT NOT NULL DEFAULT '[]',
    "tagline" TEXT,
    "elevator_pitch" TEXT,
    "key_messages" TEXT NOT NULL DEFAULT '[]',
    "writing_style" TEXT,
    "content_themes" TEXT NOT NULL DEFAULT '[]',
    "topics_to_avoid" TEXT NOT NULL DEFAULT '[]',
    "brand_keywords" TEXT NOT NULL DEFAULT '[]',
    "phrase_examples" TEXT NOT NULL DEFAULT '[]',
    "brand_dos" TEXT NOT NULL DEFAULT '[]',
    "brand_donts" TEXT NOT NULL DEFAULT '[]',
    "primary_colors" TEXT,
    "secondary_colors" TEXT,
    "font_style" TEXT,
    "visual_style" TEXT,
    "unique_selling_points" TEXT NOT NULL DEFAULT '[]',
    "value_proposition" TEXT,
    "market_position" TEXT,
    "pricing_strategy" TEXT,
    "completeness" INTEGER NOT NULL DEFAULT 0,
    "created_at" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" DATETIME NOT NULL,
    CONSTRAINT "user_profiles_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);
INSERT INTO "new_user_profiles" ("annual_revenue", "brand_colors", "brand_keywords", "brand_voice", "business_model", "business_name", "city", "competitors", "completeness", "country", "created_at", "description", "employee_count", "founded_year", "id", "industry", "location", "logo_url", "market_position", "mission", "pricing_strategy", "products", "services", "social_links", "sub_industry", "target_audience", "timezone", "tone_preference", "unique_selling_points", "updated_at", "user_id", "value_proposition", "vision", "website") SELECT "annual_revenue", "brand_colors", "brand_keywords", "brand_voice", "business_model", "business_name", "city", "competitors", "completeness", "country", "created_at", "description", "employee_count", "founded_year", "id", "industry", "location", "logo_url", "market_position", "mission", "pricing_strategy", "products", "services", "social_links", "sub_industry", "target_audience", "timezone", "tone_preference", "unique_selling_points", "updated_at", "user_id", "value_proposition", "vision", "website" FROM "user_profiles";
DROP TABLE "user_profiles";
ALTER TABLE "new_user_profiles" RENAME TO "user_profiles";
CREATE UNIQUE INDEX "user_profiles_user_id_key" ON "user_profiles"("user_id");
PRAGMA foreign_keys=ON;
PRAGMA defer_foreign_keys=OFF;
