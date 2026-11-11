-- B2B partner platform: applications, their subscribers, and request logs.
-- Also adds observed (as opposed to AI-estimated) competitor ad data.

-- ============================================
-- PartnerApp
-- ============================================
CREATE TABLE "partner_apps" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "description" TEXT,
    "contact_email" TEXT,
    "app_key" TEXT NOT NULL,
    "app_secret_hash" TEXT NOT NULL,
    "app_secret_last4" TEXT NOT NULL,
    "secret_rotated_at" TIMESTAMP(3),
    "status" TEXT NOT NULL DEFAULT 'ACTIVE',
    "scopes" TEXT NOT NULL DEFAULT '[]',
    "allowed_platforms" TEXT NOT NULL DEFAULT '[]',
    "ip_allowlist" TEXT NOT NULL DEFAULT '[]',
    "rate_limit_per_min" INTEGER NOT NULL DEFAULT 120,
    "max_subscribers" INTEGER,
    "default_tier" TEXT NOT NULL DEFAULT 'STARTER',
    "default_credits" INTEGER NOT NULL DEFAULT 100,
    "auto_provision" BOOLEAN NOT NULL DEFAULT true,
    "webhook_url" TEXT,
    "webhook_secret" TEXT,
    "last_used_at" TIMESTAMP(3),
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "partner_apps_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "partner_apps_app_key_key" ON "partner_apps"("app_key");
CREATE INDEX "partner_apps_status_idx" ON "partner_apps"("status");

-- ============================================
-- PartnerAppUser
-- ============================================
CREATE TABLE "partner_app_users" (
    "id" TEXT NOT NULL,
    "app_id" TEXT NOT NULL,
    "app_uid" TEXT NOT NULL,
    "user_id" TEXT NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'ACTIVE',
    "external_ref" TEXT,
    "metadata" TEXT NOT NULL DEFAULT '{}',
    "last_seen_at" TIMESTAMP(3),
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "partner_app_users_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "partner_app_users_app_id_app_uid_key" ON "partner_app_users"("app_id", "app_uid");
CREATE INDEX "partner_app_users_app_id_status_idx" ON "partner_app_users"("app_id", "status");
CREATE INDEX "partner_app_users_user_id_idx" ON "partner_app_users"("user_id");

ALTER TABLE "partner_app_users"
    ADD CONSTRAINT "partner_app_users_app_id_fkey"
    FOREIGN KEY ("app_id") REFERENCES "partner_apps"("id") ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "partner_app_users"
    ADD CONSTRAINT "partner_app_users_user_id_fkey"
    FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- ============================================
-- PartnerApiLog
-- ============================================
CREATE TABLE "partner_api_logs" (
    "id" TEXT NOT NULL,
    "app_id" TEXT NOT NULL,
    "app_uid" TEXT,
    "user_id" TEXT,
    "method" TEXT NOT NULL,
    "path" TEXT NOT NULL,
    "status_code" INTEGER NOT NULL,
    "duration_ms" INTEGER NOT NULL,
    "ip_address" TEXT,
    "user_agent" TEXT,
    "error_message" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "partner_api_logs_pkey" PRIMARY KEY ("id")
);

CREATE INDEX "partner_api_logs_app_id_created_at_idx" ON "partner_api_logs"("app_id", "created_at");

ALTER TABLE "partner_api_logs"
    ADD CONSTRAINT "partner_api_logs_app_id_fkey"
    FOREIGN KEY ("app_id") REFERENCES "partner_apps"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- ============================================
-- Observed competitor ads
-- ============================================
ALTER TABLE "business_competitors"
    ADD COLUMN "observed_ads" TEXT NOT NULL DEFAULT '[]',
    ADD COLUMN "observed_ads_count" INTEGER NOT NULL DEFAULT 0,
    ADD COLUMN "ads_sources" TEXT NOT NULL DEFAULT '[]',
    ADD COLUMN "ads_observed_at" TIMESTAMP(3);
