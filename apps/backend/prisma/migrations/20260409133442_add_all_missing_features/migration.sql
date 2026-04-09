-- CreateTable
CREATE TABLE "ad_campaigns" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "user_id" TEXT NOT NULL,
    "connection_id" TEXT NOT NULL,
    "platform" TEXT NOT NULL,
    "platform_campaign_id" TEXT,
    "name" TEXT NOT NULL,
    "type" TEXT NOT NULL,
    "objective" TEXT,
    "status" TEXT NOT NULL DEFAULT 'DRAFT',
    "budget" REAL NOT NULL DEFAULT 0,
    "budget_type" TEXT NOT NULL DEFAULT 'DAILY',
    "currency" TEXT NOT NULL DEFAULT 'USD',
    "start_date" DATETIME,
    "end_date" DATETIME,
    "targeting" TEXT NOT NULL DEFAULT '{}',
    "ad_creatives" TEXT NOT NULL DEFAULT '[]',
    "settings" TEXT NOT NULL DEFAULT '{}',
    "credits_consumed" INTEGER NOT NULL DEFAULT 0,
    "last_sync_at" DATETIME,
    "created_at" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" DATETIME NOT NULL,
    CONSTRAINT "ad_campaigns_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "ad_campaigns_connection_id_fkey" FOREIGN KEY ("connection_id") REFERENCES "platform_connections" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "ad_groups" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "campaign_id" TEXT NOT NULL,
    "platform_ad_group_id" TEXT,
    "name" TEXT NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'ACTIVE',
    "bid_strategy" TEXT,
    "bid_amount" REAL,
    "keywords" TEXT NOT NULL DEFAULT '[]',
    "negative_keywords" TEXT NOT NULL DEFAULT '[]',
    "ads" TEXT NOT NULL DEFAULT '[]',
    "created_at" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" DATETIME NOT NULL,
    CONSTRAINT "ad_groups_campaign_id_fkey" FOREIGN KEY ("campaign_id") REFERENCES "ad_campaigns" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "ad_campaign_metrics" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "campaign_id" TEXT NOT NULL,
    "date" DATETIME NOT NULL,
    "impressions" INTEGER NOT NULL DEFAULT 0,
    "clicks" INTEGER NOT NULL DEFAULT 0,
    "ctr" REAL NOT NULL DEFAULT 0,
    "cpc" REAL NOT NULL DEFAULT 0,
    "cost" REAL NOT NULL DEFAULT 0,
    "conversions" INTEGER NOT NULL DEFAULT 0,
    "conversion_rate" REAL NOT NULL DEFAULT 0,
    "roas" REAL,
    "reach" INTEGER NOT NULL DEFAULT 0,
    "cpa" REAL,
    "created_at" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "ad_campaign_metrics_campaign_id_fkey" FOREIGN KEY ("campaign_id") REFERENCES "ad_campaigns" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "leads" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "user_id" TEXT NOT NULL,
    "email" TEXT,
    "phone" TEXT,
    "name" TEXT NOT NULL,
    "company" TEXT,
    "source" TEXT,
    "source_id" TEXT,
    "stage" TEXT NOT NULL DEFAULT 'NEW',
    "score" INTEGER NOT NULL DEFAULT 0,
    "assigned_to" TEXT,
    "tags" TEXT NOT NULL DEFAULT '[]',
    "custom_fields" TEXT NOT NULL DEFAULT '{}',
    "last_contacted_at" DATETIME,
    "converted_at" DATETIME,
    "lost_reason" TEXT,
    "created_at" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" DATETIME NOT NULL,
    CONSTRAINT "leads_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "lead_activities" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "lead_id" TEXT NOT NULL,
    "type" TEXT NOT NULL,
    "data" TEXT NOT NULL DEFAULT '{}',
    "created_at" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "lead_activities_lead_id_fkey" FOREIGN KEY ("lead_id") REFERENCES "leads" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "lead_notes" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "lead_id" TEXT NOT NULL,
    "content" TEXT NOT NULL,
    "created_at" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" DATETIME NOT NULL,
    CONSTRAINT "lead_notes_lead_id_fkey" FOREIGN KEY ("lead_id") REFERENCES "leads" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "email_lists" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "user_id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "description" TEXT,
    "tags" TEXT NOT NULL DEFAULT '[]',
    "contact_count" INTEGER NOT NULL DEFAULT 0,
    "created_at" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" DATETIME NOT NULL,
    CONSTRAINT "email_lists_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "email_contacts" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "user_id" TEXT NOT NULL,
    "list_id" TEXT NOT NULL,
    "email" TEXT NOT NULL,
    "name" TEXT,
    "status" TEXT NOT NULL DEFAULT 'SUBSCRIBED',
    "metadata" TEXT NOT NULL DEFAULT '{}',
    "lead_id" TEXT,
    "created_at" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" DATETIME NOT NULL,
    CONSTRAINT "email_contacts_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "email_contacts_list_id_fkey" FOREIGN KEY ("list_id") REFERENCES "email_lists" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "email_campaigns" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "user_id" TEXT NOT NULL,
    "list_id" TEXT,
    "name" TEXT NOT NULL,
    "subject" TEXT NOT NULL,
    "preview_text" TEXT,
    "html_content" TEXT NOT NULL DEFAULT '',
    "type" TEXT NOT NULL DEFAULT 'BROADCAST',
    "status" TEXT NOT NULL DEFAULT 'DRAFT',
    "scheduled_at" DATETIME,
    "sent_at" DATETIME,
    "total_sent" INTEGER NOT NULL DEFAULT 0,
    "total_opened" INTEGER NOT NULL DEFAULT 0,
    "total_clicked" INTEGER NOT NULL DEFAULT 0,
    "total_bounced" INTEGER NOT NULL DEFAULT 0,
    "credits_consumed" INTEGER NOT NULL DEFAULT 0,
    "created_at" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" DATETIME NOT NULL,
    CONSTRAINT "email_campaigns_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "email_campaigns_list_id_fkey" FOREIGN KEY ("list_id") REFERENCES "email_lists" ("id") ON DELETE SET NULL ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "email_sequences" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "user_id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "description" TEXT,
    "status" TEXT NOT NULL DEFAULT 'DRAFT',
    "trigger_type" TEXT NOT NULL DEFAULT 'MANUAL',
    "steps" TEXT NOT NULL DEFAULT '[]',
    "created_at" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" DATETIME NOT NULL,
    CONSTRAINT "email_sequences_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "designs" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "user_id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "template" TEXT,
    "category" TEXT,
    "html_content" TEXT NOT NULL DEFAULT '',
    "css_content" TEXT,
    "width" INTEGER NOT NULL DEFAULT 1080,
    "height" INTEGER NOT NULL DEFAULT 1080,
    "size_preset" TEXT,
    "output_url" TEXT,
    "thumbnail_url" TEXT,
    "credits_consumed" INTEGER NOT NULL DEFAULT 0,
    "created_at" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" DATETIME NOT NULL,
    CONSTRAINT "designs_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "video_projects" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "user_id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "type" TEXT NOT NULL,
    "provider" TEXT NOT NULL DEFAULT 'RUNWAY',
    "status" TEXT NOT NULL DEFAULT 'DRAFT',
    "prompt" TEXT,
    "script_content" TEXT,
    "settings" TEXT NOT NULL DEFAULT '{}',
    "provider_job_id" TEXT,
    "video_url" TEXT,
    "thumbnail_url" TEXT,
    "duration" INTEGER,
    "credits_consumed" INTEGER NOT NULL DEFAULT 0,
    "error_message" TEXT,
    "created_at" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" DATETIME NOT NULL,
    CONSTRAINT "video_projects_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "analytics_snapshots" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "user_id" TEXT NOT NULL,
    "connection_id" TEXT NOT NULL,
    "property_id" TEXT NOT NULL,
    "date" DATETIME NOT NULL,
    "sessions" INTEGER NOT NULL DEFAULT 0,
    "users" INTEGER NOT NULL DEFAULT 0,
    "new_users" INTEGER NOT NULL DEFAULT 0,
    "page_views" INTEGER NOT NULL DEFAULT 0,
    "bounce_rate" REAL NOT NULL DEFAULT 0,
    "avg_session_duration" REAL NOT NULL DEFAULT 0,
    "traffic_sources" TEXT NOT NULL DEFAULT '{}',
    "top_pages" TEXT NOT NULL DEFAULT '[]',
    "conversions" INTEGER NOT NULL DEFAULT 0,
    "created_at" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "analytics_snapshots_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateIndex
CREATE INDEX "ad_campaigns_user_id_platform_status_idx" ON "ad_campaigns"("user_id", "platform", "status");

-- CreateIndex
CREATE INDEX "ad_groups_campaign_id_idx" ON "ad_groups"("campaign_id");

-- CreateIndex
CREATE INDEX "ad_campaign_metrics_campaign_id_date_idx" ON "ad_campaign_metrics"("campaign_id", "date");

-- CreateIndex
CREATE UNIQUE INDEX "ad_campaign_metrics_campaign_id_date_key" ON "ad_campaign_metrics"("campaign_id", "date");

-- CreateIndex
CREATE INDEX "leads_user_id_stage_idx" ON "leads"("user_id", "stage");

-- CreateIndex
CREATE INDEX "leads_user_id_source_idx" ON "leads"("user_id", "source");

-- CreateIndex
CREATE INDEX "leads_user_id_score_idx" ON "leads"("user_id", "score");

-- CreateIndex
CREATE INDEX "lead_activities_lead_id_created_at_idx" ON "lead_activities"("lead_id", "created_at");

-- CreateIndex
CREATE INDEX "lead_notes_lead_id_idx" ON "lead_notes"("lead_id");

-- CreateIndex
CREATE INDEX "email_lists_user_id_idx" ON "email_lists"("user_id");

-- CreateIndex
CREATE INDEX "email_contacts_user_id_idx" ON "email_contacts"("user_id");

-- CreateIndex
CREATE UNIQUE INDEX "email_contacts_list_id_email_key" ON "email_contacts"("list_id", "email");

-- CreateIndex
CREATE INDEX "email_campaigns_user_id_status_idx" ON "email_campaigns"("user_id", "status");

-- CreateIndex
CREATE INDEX "email_sequences_user_id_idx" ON "email_sequences"("user_id");

-- CreateIndex
CREATE INDEX "designs_user_id_idx" ON "designs"("user_id");

-- CreateIndex
CREATE INDEX "video_projects_user_id_idx" ON "video_projects"("user_id");

-- CreateIndex
CREATE INDEX "analytics_snapshots_user_id_date_idx" ON "analytics_snapshots"("user_id", "date");

-- CreateIndex
CREATE UNIQUE INDEX "analytics_snapshots_user_id_property_id_date_key" ON "analytics_snapshots"("user_id", "property_id", "date");
