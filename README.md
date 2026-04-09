# MarketAI - AI-Powered Marketing Automation Platform

A full-stack marketing automation platform that reads a business's website, analyzes competitors, generates content (articles, social posts, videos, flyers), manages ad campaigns (Google & Meta), captures leads, runs email campaigns, and tracks performance - all powered by AI.

---

## Get MarketAI Production-Ready - Save 70% on AI Subscriptions

> **Building a marketing automation platform from scratch costs $50,000-$150,000+ in development alone** - before you even pay for AI API subscriptions. MarketAI gives you the complete engine, ready to deploy.

### What You Get

| What's Included | Market Price | With MarketAI |
|---|---|---|
| Jasper AI, Claude, OpenAI, Perplexity (bundled) | $300-500/mo | **70% less through our pooled enterprise plans** |
| Google Ads + Meta Ads automation engine | $5,000-15,000 to build | **Included** |
| CRM + Lead management system | $3,000-8,000 to build | **Included** |
| Email marketing with SMTP integration | $2,000-5,000 to build | **Included** |
| AI video generation (HeyGen + Runway) | $200-400/mo per tool | **Included in bundle** |
| AI design/flyer creator with export | $2,000-6,000 to build | **Included** |
| Multi-platform social publishing | $3,000-8,000 to build | **Included** |
| Website builder with AI page generation | $5,000-12,000 to build | **Included** |
| Business intelligence + competitor analysis | $4,000-10,000 to build | **Included** |

### Why Work With Me

- **Full source code ownership** - no vendor lock-in, deploy anywhere
- **Production deployment support** - I'll help you go live
- **Custom feature development** at **$15/hour** - need a specific integration, white-label branding, or industry-specific workflow? I'll build it
- **AI subscription bundling** - get access to all the AI services MarketAI uses at **70% below retail** through enterprise pooled plans

### Use Cases

- **Marketing Agencies** - Automate content creation for dozens of clients from a single dashboard
- **SaaS Companies** - Built-in lead capture, email sequences, and ad management to grow your user base
- **E-commerce Brands** - Product showcase videos, social posts, Google Shopping ads, and customer email flows
- **Local Businesses** - Set it and forget it: AI reads your website, creates content, posts to social media, and captures leads
- **White-Label Resellers** - Rebrand MarketAI as your own platform and sell marketing automation as a service

### Let's Talk

| | |
|---|---|
| **Phone / WhatsApp** | [+91 95603 16581](tel:+919560316581) |
| **Email** | [uxd.arjun@gmail.com](mailto:uxd.arjun@gmail.com) |
| **Website** | [www.pluxins.com](https://www.pluxins.com) |
| **Custom Dev Rate** | **$15/hour** - any feature, any integration |

> *"Stop paying $500/month for 5 different marketing tools. Get one AI engine that does it all - and own the code."*

---

## Table of Contents

- [Architecture Overview](#architecture-overview)
- [System Architecture Diagram](#system-architecture-diagram)
- [Tech Stack](#tech-stack)
- [Project Structure](#project-structure)
- [Module Reference](#module-reference)
- [Database Schema](#database-schema)
- [API Endpoints](#api-endpoints)
- [Project Setup](#project-setup)
- [Environment Variables](#environment-variables)
- [Development Commands](#development-commands)
- [Authentication & Authorization](#authentication--authorization)
- [Credit System](#credit-system)
- [External Integrations](#external-integrations)
- [Deployment](#deployment)

---

## Architecture Overview

MarketAI is a monorepo containing three applications sharing a single backend API:

```
                    +--------------------------------------------------+
                    |                  CLIENTS                          |
                    +--------------------------------------------------+
                           |              |               |
                           v              v               v
                    +-----------+  +-----------+  +-------------+
                    | Frontend  |  |   Admin   |  | Public Site |
                    | Dashboard |  |   Panel   |  | (Workspace) |
                    | Port 3000 |  | Port 3001 |  |   *.app     |
                    | Next.js   |  | Next.js   |  |  Next.js    |
                    +-----------+  +-----------+  +-------------+
                           |              |               |
                           +--------------+---------------+
                                          |
                                    REST API v1
                                          |
                              +-----------+-----------+
                              |    Backend API        |
                              |    NestJS + Prisma    |
                              |    Port 3002          |
                              +-----------+-----------+
                                          |
              +---------------------------+---------------------------+
              |              |            |            |              |
        +-----+----+  +-----+----+ +-----+----+ +----+-----+ +-----+----+
        | Database | | Credential| |  Credit  | |  Auth    | |  File    |
        | SQLite/  | | Store    | |  System  | |  JWT +   | |  Upload  |
        | Postgres | | AES-256  | |  Per-    | |  OAuth   | |  S3/     |
        |  Prisma  | | -GCM     | |  Action  | |  Google  | |  Local   |
        +----------+ +----------+ +----------+ +----------+ +----------+
              |
    +---------+---------+---------+---------+---------+---------+
    |         |         |         |         |         |         |
+---+---+ +---+---+ +---+---+ +---+---+ +---+---+ +---+---+ +---+---+
|Jasper | |Anthro-| | Meta  | |Google | |Razor- | |HeyGen/| | SMTP  |
|AI API | |pic    | | Graph | |Ads +  | |pay    | |Runway | |NodeMlr|
|Content| |Claude | | + Mkt | |GA4 +  | |Payment| |Video  | |Email  |
|Gen    | |Pages  | | API   | |Trends | |       | |Gen    | |       |
+-------+ +-------+ +-------+ +-------+ +-------+ +-------+ +-------+
```

### Data Flow

```
Business Website
       |
       v
+------+------+     +-----------+     +----------+     +----------+
| AI Scraper  |---->| Business  |---->| Content  |---->| Publish  |
| (Perplexity,|     | Profile   |     | Generate |     | Schedule |
|  Serper,    |     | Products  |     | (Jasper  |     | (IG, FB, |
|  Firecrawl, |     | Services  |     |  AI)     |     |  WP, LI, |
|  OpenAI)    |     | Audience  |     +----+-----+     |  TikTok) |
+-------------+     | Compete.  |          |           +----+-----+
                    +-----------+          |                |
                         |                 v                v
                         |           +-----+------+   +----+------+
                         +---------->| Ad Campaigns|   | Analytics |
                                     | Google Ads  |   | Social +  |
                                     | Meta Ads    |   | GA4       |
                                     +------+------+   +-----------+
                                            |
                                            v
                                     +------+------+     +----------+
                                     | Lead Capture|---->| Email    |
                                     | CRM Pipeline|     | Campaigns|
                                     | Scoring     |     | Sequences|
                                     +-------------+     +----------+
```

---

## Tech Stack

### Backend Layer

| Technology | Version | Purpose |
|---|---|---|
| **NestJS** | 10.x | REST API framework with modules, guards, interceptors |
| **Prisma** | 5.x | Type-safe ORM with migrations |
| **SQLite** | - | Development database (swap to PostgreSQL for production) |
| **Passport** | 0.7 | Authentication strategies (JWT, Google OAuth) |
| **Swagger** | 7.x | Auto-generated API documentation at `/api` |
| **Helmet** | 7.x | HTTP security headers |
| **Throttler** | 5.x | Rate limiting (10/s short, 50/10s medium, 200/min long) |
| **Nodemailer** | 6.x | SMTP email sending for campaigns |
| **Razorpay SDK** | 2.x | Payment processing (India-focused) |
| **Stripe SDK** | 14.x | Payment processing (international) |
| **Anthropic SDK** | 0.72 | Claude AI for page generation and design |
| **AWS S3 SDK** | 3.x | File storage for uploads |
| **Puppeteer** | - | HTML-to-image rendering for designs/flyers |

### Frontend Layer

| Technology | Version | Purpose |
|---|---|---|
| **Next.js** | 14.1 | React framework with App Router |
| **React** | 18.x | UI component library |
| **TypeScript** | 5.x | Type safety across all apps |
| **Tailwind CSS** | 3.4 | Utility-first styling |
| **shadcn/ui** | - | Radix UI + Tailwind component library |
| **React Query** | 5.x | Server state management & caching |
| **Zustand** | 4.x | Client-side state management |
| **React Hook Form** | 7.x | Form state & validation |
| **Zod** | 3.x | Schema validation |
| **Recharts** | 2.x | Data visualization charts |
| **Sonner** | 1.x | Toast notifications |
| **Lucide React** | 0.3 | Icon library |
| **Axios** | 1.x | HTTP client with interceptors |

### Security Layer

| Feature | Implementation |
|---|---|
| **Authentication** | JWT access tokens (15 min) + refresh tokens (7 days) |
| **Password Hashing** | bcryptjs with salt rounds |
| **Credential Storage** | AES-256-GCM encryption with IV + AuthTag |
| **API Protection** | JwtAuthGuard on all protected routes |
| **Admin Protection** | AdminGuard checks `role === 'ADMIN'` |
| **Rate Limiting** | NestJS Throttler with 3-tier configuration |
| **CORS** | Configurable origin whitelist |
| **OAuth** | Google, Meta, LinkedIn, TikTok, WordPress |

---

## Project Structure

```
marketai/
|-- apps/
|   |-- backend/                    # NestJS REST API (Port 3002)
|   |   |-- prisma/
|   |   |   |-- schema.prisma      # Database schema (31 models)
|   |   |   |-- migrations/        # Auto-generated migrations
|   |   |   +-- dev.db             # SQLite database file
|   |   |-- src/
|   |   |   |-- main.ts            # App bootstrap, Swagger setup, CORS
|   |   |   |-- app.module.ts      # Root module - registers all feature modules
|   |   |   |-- prisma/            # PrismaService (extends PrismaClient)
|   |   |   |-- common/
|   |   |   |   +-- decorators/    # @CurrentUser() parameter decorator
|   |   |   +-- modules/
|   |   |       |-- auth/          # JWT + OAuth authentication
|   |   |       |-- users/         # User profile management
|   |   |       |-- subscriptions/ # Credit system & billing
|   |   |       |-- content/       # AI content generation (Jasper)
|   |   |       |-- publishing/    # Multi-platform publishing
|   |   |       |-- platforms/     # OAuth connections (Meta,Google,LinkedIn,TikTok,WP)
|   |   |       |-- analytics/     # Social analytics + Google Analytics GA4
|   |   |       |-- ads/           # Google Ads + Meta Ads campaign management
|   |   |       |-- leads/         # Lead CRM - pipeline, scoring, notes
|   |   |       |-- email/         # Email marketing - campaigns, lists, sequences
|   |   |       |-- design/        # AI flyer/design generation + Puppeteer render
|   |   |       |-- video/         # Video creation (HeyGen + Runway ML)
|   |   |       |-- trends/        # Trending topics (SerpAPI/Google Trends)
|   |   |       |-- workspace/     # Website builder + AI page generation (Claude)
|   |   |       |-- business/      # Business profile, products, services, audiences
|   |   |       |-- ai-scraper/    # Multi-provider web intelligence scraping
|   |   |       |-- jasper/        # Jasper AI API wrapper
|   |   |       |-- credentials/   # Encrypted API key storage (AES-256-GCM)
|   |   |       |-- razorpay/      # Payment processing + webhooks
|   |   |       |-- admin/         # Admin operations + audit logging
|   |   |       |-- upload/        # File upload (S3 / local)
|   |   |       +-- health/        # Health check endpoint
|   |   +-- package.json
|   |
|   |-- frontend/                   # Next.js User Dashboard (Port 3000)
|   |   |-- src/
|   |   |   |-- app/
|   |   |   |   |-- page.tsx       # Landing page
|   |   |   |   |-- login/         # Login page
|   |   |   |   |-- register/      # Registration page
|   |   |   |   +-- dashboard/
|   |   |   |       |-- layout.tsx  # Sidebar navigation layout
|   |   |   |       |-- page.tsx    # Dashboard overview
|   |   |   |       |-- content/    # Content creation & management
|   |   |   |       |-- ads/        # Ad campaign manager (Google + Meta)
|   |   |   |       |-- leads/      # CRM - Kanban board + list view
|   |   |   |       |-- email/      # Email campaigns, lists, sequences
|   |   |   |       |-- designs/    # Flyer/design gallery + AI generator
|   |   |   |       |-- videos/     # Video projects + AI generation
|   |   |   |       |-- trends/     # Trending topics + content suggestions
|   |   |   |       |-- platforms/  # Social platform connections
|   |   |   |       |-- analytics/  # Performance analytics dashboard
|   |   |   |       |-- business/   # Business profile, products, competitors
|   |   |   |       |-- workspace/  # Website builder, pages, posts, menus
|   |   |   |       +-- settings/   # User settings
|   |   |   |-- components/
|   |   |   |   |-- ui/            # shadcn/ui components (Button, Card, Dialog...)
|   |   |   |   |-- ai-fetch/      # AI intelligence fetch components
|   |   |   |   +-- landing/       # Landing page components
|   |   |   |-- lib/
|   |   |   |   |-- api.ts         # Axios API client (all endpoint methods)
|   |   |   |   +-- utils.ts       # cn() utility, formatDate, etc.
|   |   |   |-- store/
|   |   |   |   +-- auth.ts        # Zustand auth store
|   |   |   +-- hooks/
|   |   |       +-- use-toast.ts   # Toast notification hook
|   |   +-- package.json
|   |
|   +-- admin/                      # Next.js Admin Panel (Port 3001)
|       |-- src/
|       |   |-- app/
|       |   |   +-- admin/dashboard/
|       |   |       |-- page.tsx    # Admin overview stats
|       |   |       |-- users/      # User management
|       |   |       |-- plans/      # Subscription plan CRUD
|       |   |       |-- payments/   # Payment history
|       |   |       |-- credentials/# API key management
|       |   |       |-- workspaces/ # Workspace management
|       |   |       +-- credits/    # Credit utilization
|       |   +-- lib/api.ts          # Admin API client
|       +-- package.json
|
|-- .claude/
|   +-- launch.json                 # Dev server configurations
|-- package.json                    # Root workspace config
+-- CLAUDE.md                       # AI assistant instructions
```

---

## Module Reference

### Backend Modules (18 modules)

| Module | Path | Controllers | Purpose |
|---|---|---|---|
| **AuthModule** | `auth/` | AuthController | JWT login/register, OAuth (Google), token refresh, MFA |
| **UsersModule** | `users/` | UsersController | User profile CRUD |
| **SubscriptionsModule** | `subscriptions/` | SubscriptionsController | Plans, credits, billing cycles, Stripe webhooks |
| **ContentModule** | `content/` | ContentController | AI content generation, CRUD, scheduling |
| **PublishingModule** | `publishing/` | PublishingController | Publish to Instagram, Facebook, WordPress, LinkedIn, TikTok |
| **PlatformsModule** | `platforms/` | PlatformsController | OAuth connections for 7 platforms |
| **AnalyticsModule** | `analytics/` | AnalyticsController | Social engagement + Google Analytics GA4 dashboard |
| **AdsModule** | `ads/` | AdsController | Google Ads + Meta Ads campaigns, metrics, AI suggestions |
| **LeadsModule** | `leads/` | LeadsController | CRM pipeline, scoring, notes, activities, bulk import |
| **EmailModule** | `email/` | EmailController | Campaigns, contact lists, sequences, SMTP sending |
| **DesignModule** | `design/` | DesignController | AI design generation (Claude), Puppeteer PNG/PDF render |
| **VideoModule** | `video/` | VideoController | HeyGen + Runway ML video generation, async polling |
| **TrendsModule** | `trends/` | TrendsController | Google Trends via SerpAPI, content suggestions |
| **WorkspaceModule** | `workspace/` | Workspace + Pages + Posts + Menus | AI page builder, blog, menus |
| **BusinessModule** | `business/` | BusinessController | Business profile, products, services, audiences, competitors |
| **AiScraperModule** | `ai-scraper/` | AiScraperController | Multi-provider web intelligence (Perplexity, Serper, OpenAI, Firecrawl) |
| **CredentialsModule** | `credentials/` | - (via AdminController) | AES-256-GCM encrypted API key storage |
| **RazorpayModule** | `razorpay/` | RazorpayController | Payment processing, webhooks, recurring subscriptions |
| **AdminModule** | `admin/` | AdminController | User management, plan CRUD, audit logs |

### Module Pattern

Every backend module follows this structure:

```
module-name/
|-- module-name.module.ts      # @Module() - imports, providers, exports
|-- module-name.controller.ts  # @Controller() - HTTP endpoints with guards
|-- module-name.service.ts     # @Injectable() - business logic
+-- dto/
    +-- module-name.dto.ts     # DTOs with class-validator decorators
```

**Guard pattern**: `@UseGuards(JwtAuthGuard)` on all controllers, `@UseGuards(AdminGuard)` for admin-only routes.

**User extraction**: `@CurrentUser('id') userId: string` decorator on every endpoint method.

---

## Database Schema

### Entity Relationship Diagram

```
+-------------------+       +-------------------+       +-------------------+
|      User         |       |   Subscription    |       | SubscriptionPlan  |
|-------------------|       |-------------------|       |-------------------|
| id (PK)           |1----1>| id (PK)           |       | id (PK)           |
| email             |       | userId (FK)        |       | name (unique)     |
| name              |       | tier               |       | displayName       |
| role              |       | creditsTotal       |       | monthlyPrice      |
| status            |       | creditsRemaining   |       | yearlyPrice       |
| passwordHash      |       | billingCycle       |       | credits           |
| authProvider      |       | razorpaySubId      |       | features (JSON)   |
+--------+----------+       +-------------------+       +-------------------+
         |
         |1---*  +-------------------+    +-------------------+
         +------>| PlatformConnection|    | CreditTransaction |
         |       |-------------------|    |-------------------|
         |       | platform          |    | type              |
         |       | accessToken       |    | amount            |
         |       | refreshToken      |    | balance           |
         |       | status            |    | description       |
         |       +-------------------+    +-------------------+
         |
         |1---*  +-------------------+    +-------------------+
         +------>|     Content       |--->| ContentAnalytics  |
         |       |-------------------|    |-------------------|
         |       | type              |    | impressions       |
         |       | status            |    | reach, likes      |
         |       | caption, body     |    | clicks, shares    |
         |       | scheduledAt       |    | engagement        |
         |       | publishedAt       |    +-------------------+
         |       +-------------------+
         |
         |1---*  +-------------------+    +-------------------+
         +------>|   AdCampaign      |--->| AdCampaignMetric  |
         |       |-------------------|    |-------------------|
         |       | platform          |    | impressions       |
         |       | type, objective   |    | clicks, ctr, cpc  |
         |       | budget, status    |    | conversions, roas |
         |       | targeting (JSON)  |    | cost, reach       |
         |       | adCreatives(JSON) |    +-------------------+
         |       +--------+----------+
         |                |1---*
         |                +--------->+-------------------+
         |                           |     AdGroup       |
         |                           |-------------------|
         |                           | keywords (JSON)   |
         |                           | bidStrategy       |
         |                           | ads (JSON)        |
         |                           +-------------------+
         |
         |1---*  +-------------------+    +-------------------+
         +------>|      Lead         |--->|   LeadActivity    |
         |       |-------------------|    |-------------------|
         |       | name, email       |    | type              |
         |       | stage             |    | data (JSON)       |
         |       | score             |    +-------------------+
         |       | source, tags      |
         |       +--------+----------+    +-------------------+
         |                |1---*--------->|    LeadNote       |
         |                                |-------------------|
         |                                | content           |
         |                                +-------------------+
         |
         |1---*  +-------------------+
         +------>|    EmailList      |----*>+------------------+
         |       |-------------------|      |  EmailContact    |
         |       | name, contactCount|      |------------------|
         |       +-------------------+      | email, status    |
         |                                  +------------------+
         |1---*  +-------------------+
         +------>|  EmailCampaign    |
         |       |-------------------|
         |       | subject, html     |
         |       | totalSent/Opened  |
         |       +-------------------+
         |
         |1---*  +-------------------+
         +------>|  EmailSequence    |
         |       |-------------------|
         |       | steps (JSON)      |
         |       | triggerType       |
         |       +-------------------+
         |
         |1---*  +-------------------+      +-------------------+
         +------>|     Design        |      |   VideoProject    |
         |       |-------------------|      |-------------------|
         |       | htmlContent       |      | provider          |
         |       | width, height     |      | status, videoUrl  |
         |       | outputUrl         |      | providerJobId     |
         |       +-------------------+      +-------------------+
         |                                          ^
         |1---*  +-------------------+              |
         +------>|AnalyticsSnapshot  |    +---------+
         |       |-------------------|    |1---*
         |       | sessions, users   |<---+
         |       | bounceRate        |
         |       +-------------------+
         |
         |1---1  +-------------------+
         +------>|   UserProfile     |---->BusinessProduct(*)
         |       |-------------------|---->BusinessService(*)
         |       | businessName      |---->BusinessCompetitor(*)
         |       | brandVoice        |---->TargetAudience(*)
         |       +-------------------+
         |
         |1---1  +-------------------+
         +------>|    Workspace      |---->WorkspacePage(*)
                 |-------------------|---->WorkspacePost(*)
                 | slug (unique)     |---->WorkspaceMenu(*)
                 +-------------------+
```

### Model Count: 31 tables

**Core**: User, UserProfile, RefreshToken
**Billing**: Subscription, SubscriptionPlan, CreditTransaction, Payment
**Content**: Content, ContentMedia, ContentAnalytics
**Social**: PlatformConnection
**Ads**: AdCampaign, AdGroup, AdCampaignMetric
**CRM**: Lead, LeadActivity, LeadNote
**Email**: EmailList, EmailContact, EmailCampaign, EmailSequence
**Creative**: Design, VideoProject
**Analytics**: AnalyticsSnapshot, TrendingTopic
**Business**: BusinessProduct, BusinessService, BusinessCompetitor, TargetAudience
**Workspace**: Workspace, WorkspacePage, WorkspacePost, WorkspaceMenu
**System**: ApiCredential, AuditLog

---

## API Endpoints

### Authentication (`/api/v1/auth`)
| Method | Endpoint | Description |
|--------|----------|-------------|
| POST | `/register` | Register with email/phone + password |
| POST | `/login` | Login, returns JWT access + refresh tokens |
| POST | `/verify` | Email/phone verification |
| POST | `/refresh` | Refresh access token |
| POST | `/forgot-password` | Send password reset email |
| POST | `/reset-password` | Reset password with token |
| GET | `/me` | Get current user info |
| POST | `/logout` | Invalidate refresh token |

### Content (`/api/v1/content`)
| Method | Endpoint | Description |
|--------|----------|-------------|
| POST | `/generate` | AI-generate content for a platform |
| GET | `/` | List content with filters |
| GET | `/:id` | Get content by ID |
| PUT | `/:id` | Update content |
| DELETE | `/:id` | Delete content |
| POST | `/:id/schedule` | Schedule content for publishing |

### Publishing (`/api/v1/publishing`)
| Method | Endpoint | Description |
|--------|----------|-------------|
| POST | `/:id/publish` | Publish content now |
| GET | `/history` | Get publishing history |

### Platforms (`/api/v1/platforms`)
| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/` | List connected platforms |
| GET | `/oauth/meta` | Get Meta OAuth URL |
| GET | `/oauth/google` | Get Google OAuth URL |
| GET | `/oauth/wordpress` | Get WordPress OAuth URL |
| GET | `/oauth/linkedin` | Get LinkedIn OAuth URL |
| GET | `/oauth/tiktok` | Get TikTok OAuth URL |
| DELETE | `/:id` | Disconnect platform |
| POST | `/:id/test` | Test connection |

### Ads Manager (`/api/v1/ads`)
| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/campaigns` | List campaigns with filters |
| POST | `/campaigns` | Create campaign draft |
| GET | `/campaigns/:id` | Get campaign with metrics |
| PUT | `/campaigns/:id` | Update campaign |
| DELETE | `/campaigns/:id` | Delete draft campaign |
| POST | `/campaigns/:id/launch` | Push to Google/Meta API |
| POST | `/campaigns/:id/pause` | Pause campaign |
| POST | `/campaigns/:id/resume` | Resume campaign |
| GET | `/campaigns/:id/metrics` | Get performance metrics |
| POST | `/campaigns/:id/sync` | Sync metrics from platform |
| GET | `/suggestions` | AI optimization suggestions |

### Leads CRM (`/api/v1/leads`)
| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/` | List leads with filters |
| GET | `/stats` | Pipeline statistics |
| POST | `/` | Create lead |
| GET | `/:id` | Lead detail with activities |
| PUT | `/:id` | Update lead |
| DELETE | `/:id` | Delete lead |
| POST | `/:id/stage` | Change lead stage |
| POST | `/:id/notes` | Add note |
| GET | `/:id/activities` | Activity timeline |
| POST | `/import` | Bulk import leads |

### Email Marketing (`/api/v1/email`)
| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/lists` | List email lists |
| POST | `/lists` | Create list |
| GET | `/lists/:id/contacts` | List contacts |
| POST | `/contacts` | Add contact |
| POST | `/contacts/import` | Bulk import contacts |
| GET | `/campaigns` | List campaigns |
| POST | `/campaigns` | Create campaign |
| POST | `/campaigns/:id/send` | Send campaign |
| POST | `/campaigns/:id/test` | Send test email |
| GET | `/sequences` | List sequences |
| POST | `/sequences` | Create sequence |
| POST | `/sequences/:id/activate` | Activate sequence |
| GET | `/templates` | Built-in email templates |

### Designs (`/api/v1/designs`)
| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/` | List designs |
| GET | `/presets` | Size presets |
| GET | `/templates` | Design template gallery |
| POST | `/generate` | AI-generate design HTML |
| POST | `/:id/render` | Render to PNG/PDF (Puppeteer) |
| POST | `/:id/duplicate` | Duplicate design |

### Videos (`/api/v1/videos`)
| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/` | List video projects |
| GET | `/providers` | Available video providers |
| POST | `/` | Create video project |
| POST | `/:id/generate` | Start async generation |
| GET | `/:id/status` | Poll generation status |
| POST | `/:id/regenerate` | Re-generate video |

### Trends (`/api/v1/trends`)
| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/` | Current trending topics |
| GET | `/industry` | Industry-specific trends |
| GET | `/suggestions` | AI content suggestions |
| POST | `/sync` | Force refresh trends |

### Analytics (`/api/v1/analytics`)
| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/dashboard` | Social analytics dashboard |
| GET | `/content/:id` | Per-content analytics |
| GET | `/report` | Date-range report |
| GET | `/ga/properties` | GA4 properties |
| GET | `/ga/dashboard` | GA4 traffic dashboard |
| GET | `/ga/traffic-sources` | Traffic source breakdown |
| POST | `/ga/sync` | Sync GA4 data |

### Business Intelligence (`/api/v1/business`)
| Method | Endpoint | Description |
|--------|----------|-------------|
| GET/PUT | `/profile` | Business profile |
| CRUD | `/products` | Product catalog |
| CRUD | `/services` | Service catalog |
| CRUD | `/competitors` | Competitor tracking |
| CRUD | `/audiences` | Target audience personas |

### AI Scraper (`/api/v1/ai-scraper`)
| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/providers` | Available AI providers |
| POST | `/competitors` | Fetch competitor data |
| POST | `/products` | Discover product ideas |
| POST | `/services` | Discover service ideas |
| POST | `/audiences` | Analyze target audiences |
| POST | `/brand` | Analyze brand voice |
| POST | `/scan` | Scan business URL |

### Admin (`/api/v1/admin`) - Requires ADMIN role
| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/stats` | Dashboard statistics |
| GET/PUT/DELETE | `/users` | User management |
| CRUD | `/plans` | Subscription plan management |
| CRUD | `/credentials` | API key management |
| GET | `/payments` | Payment history |
| GET | `/credits/utilization` | Credit usage stats |

---

## Project Setup

### Prerequisites

- **Node.js** >= 18.0.0
- **npm** >= 9.0.0
- **Git**

### Installation

```bash
# 1. Clone the repository
git clone https://github.com/AppJets/marketAi.git
cd marketAi

# 2. Install dependencies (all workspaces)
npm install

# 3. Set up environment variables
cp apps/backend/.env.example apps/backend/.env
# Edit .env with your credentials (see Environment Variables section)

# 4. Generate Prisma client
npm run db:generate

# 5. Run database migrations
npm run db:migrate

# 6. Start all development servers
npm run dev:all
```

### After Setup

| Service | URL | Description |
|---|---|---|
| Frontend | http://localhost:3000 | User dashboard |
| Admin Panel | http://localhost:3001 | Admin management |
| Backend API | http://localhost:3002 | REST API |
| Swagger Docs | http://localhost:3002/api | API documentation |
| Prisma Studio | http://localhost:5555 | Database browser (run `npm run db:studio`) |

---

## Environment Variables

Create `apps/backend/.env`:

```env
# Database
DATABASE_URL="file:./dev.db"

# Authentication
JWT_SECRET="your-minimum-32-character-secret-key-here"
JWT_EXPIRES_IN="15m"
REFRESH_TOKEN_DAYS=7

# Credential Encryption
CREDENTIALS_ENCRYPTION_KEY="your-32-character-encryption-key!"

# App URLs
APP_URL="http://localhost:3002"
FRONTEND_URL="http://localhost:3000"

# --- Optional: Set via Admin Credentials page or .env ---

# AI Services
JASPER_API_KEY=""
JASPER_API_URL="https://api.jasper.ai/v1"
ANTHROPIC_API_KEY=""

# Social Platform OAuth
META_APP_ID=""
META_APP_SECRET=""
GOOGLE_CLIENT_ID=""
GOOGLE_CLIENT_SECRET=""
WORDPRESS_CLIENT_ID=""
WORDPRESS_CLIENT_SECRET=""
LINKEDIN_CLIENT_ID=""
LINKEDIN_CLIENT_SECRET=""
TIKTOK_CLIENT_KEY=""
TIKTOK_CLIENT_SECRET=""

# Google Ads
GOOGLE_ADS_DEVELOPER_TOKEN=""
GOOGLE_ADS_MANAGER_ID=""

# Payment Processing
RAZORPAY_KEY_ID=""
RAZORPAY_KEY_SECRET=""
RAZORPAY_WEBHOOK_SECRET=""

# Email (SMTP)
SMTP_HOST=""
SMTP_PORT="587"
SMTP_USER=""
SMTP_PASS=""
SMTP_FROM_EMAIL=""
SMTP_FROM_NAME="MarketAI"

# Video Generation
HEYGEN_API_KEY=""
RUNWAY_API_KEY=""

# Trends
SERPAPI_KEY=""

# File Storage (AWS S3)
AWS_ACCESS_KEY_ID=""
AWS_SECRET_ACCESS_KEY=""
AWS_S3_BUCKET=""
AWS_S3_REGION="ap-south-1"
```

Create `apps/frontend/.env.local` and `apps/admin/.env.local`:

```env
NEXT_PUBLIC_API_URL=http://localhost:3002
```

> **Note**: API keys can be set in `.env` OR via the Admin panel at `/admin/dashboard/credentials`. Database-stored credentials take priority and are encrypted with AES-256-GCM.

---

## Development Commands

```bash
# Start all 3 apps concurrently
npm run dev:all

# Start individual apps
npm run dev:backend      # Backend API on port 3002
npm run dev:frontend     # Frontend on port 3000
npm run dev:admin        # Admin panel on port 3001

# Database
npm run db:generate      # Regenerate Prisma client after schema changes
npm run db:migrate       # Create and run migrations
npm run db:studio        # Open Prisma Studio (visual DB browser)

# Build
npm run build            # Build all workspaces
npm run build:backend    # Build backend only
npm run build:frontend   # Build frontend only
npm run build:admin      # Build admin only

# Test (backend)
cd apps/backend
npm run test             # Unit tests
npm run test:watch       # Watch mode
npm run test:cov         # Coverage report
npm run test:e2e         # End-to-end tests

# Lint
npm run lint             # Lint all workspaces
```

---

## Authentication & Authorization

### Flow

```
Register/Login ──> JWT Access Token (15 min) + Refresh Token (7 days)
                        │
                        ├── Stored in localStorage
                        ├── Auto-injected via Axios interceptor
                        └── Auto-refreshed on 401 via response interceptor
```

### Guards

| Guard | Decorator | Purpose |
|---|---|---|
| `JwtAuthGuard` | `@UseGuards(JwtAuthGuard)` | Validates JWT, extracts user |
| `AdminGuard` | `@UseGuards(AdminGuard)` | Extends JWT guard, checks `role === 'ADMIN'` |
| `@Public()` | `@Public()` | Bypasses JWT guard for public endpoints |

### Roles

| Role | Access |
|---|---|
| `USER` | All `/api/v1/*` endpoints except `/admin/*` |
| `ADMIN` | All endpoints including `/api/v1/admin/*` |

---

## Credit System

Every action that uses AI or external APIs consumes credits from the user's subscription.

### Credit Costs

| Action | Credits | Description |
|---|---|---|
| Instagram Image | 5 | Generate + publish |
| Instagram Carousel | 8 | Multi-image post |
| Instagram/Facebook Video | 15 | Video content |
| Facebook Image | 5 | Image post |
| Facebook Link | 3 | Link post |
| Blog Post (500 words) | 10 | Short article |
| Blog Post (1000 words) | 20 | Long article |
| Ad Campaign Create | 25 | Google/Meta campaign |
| Ad Campaign Optimize | 10 | AI optimization suggestions |
| Email Campaign | 15 | Send email blast |
| Email Sequence | 20 | Create drip sequence |
| Design Generate | 10 | AI design creation |
| Design Render | 5 | PNG/PDF export |
| Video Generate | 30 | HeyGen/Runway video |
| Trend Analysis | 10 | Industry trend report |
| LinkedIn/TikTok Post | 5 | Social post |

### Billing Cycle

Credits reset each billing period. Up to 50% of unused credits roll over (capped at 1 month allocation).

---

## External Integrations

| Service | Purpose | API Used |
|---|---|---|
| **Jasper AI** | Content generation (captions, articles, SEO) | Jasper API v1 |
| **Anthropic Claude** | Page generation, design creation | Claude API (Haiku/Sonnet) |
| **Meta Graph API** | Facebook/Instagram posting, analytics | Graph API v18.0 |
| **Meta Marketing API** | Ad campaigns, audiences, insights | Marketing API v18.0 |
| **Google Ads** | Search/Display ad campaigns, metrics | Google Ads REST API v16 |
| **Google Analytics** | Website traffic, sessions, conversions | GA4 Data API |
| **Google OAuth** | User authentication, Ads/Analytics access | OAuth 2.0 |
| **LinkedIn** | Post publishing, company pages | Marketing API + UGC Posts |
| **TikTok** | Video publishing | Content Posting API |
| **WordPress** | Blog post publishing | WordPress.com REST API |
| **Razorpay** | Payment processing (India) | Razorpay API v1 |
| **Stripe** | Payment processing (International) | Stripe API 2023-10-16 |
| **Perplexity AI** | Real-time web intelligence | Chat Completions API |
| **Serper** | Google search results for research | Serper API |
| **Firecrawl** | Website crawling and extraction | Firecrawl API |
| **OpenAI** | Business analysis and intelligence | Chat Completions API |
| **SerpAPI** | Google Trends data | SerpAPI Trends Engine |
| **HeyGen** | AI avatar video generation | HeyGen API v2 |
| **Runway ML** | AI text/image-to-video generation | Runway API v1 |
| **Nodemailer** | SMTP email delivery | Direct SMTP |
| **AWS S3** | File storage for uploads | AWS SDK v3 |

> All external API keys are stored encrypted (AES-256-GCM) in the database and can be managed via the Admin panel. Services gracefully fall back to mock data when API keys are not configured.

---

## Deployment

### Production Checklist

- [ ] Switch database from SQLite to PostgreSQL (`DATABASE_URL`)
- [ ] Set strong `JWT_SECRET` (min 32 chars) and `CREDENTIALS_ENCRYPTION_KEY`
- [ ] Configure all required API keys via Admin credentials page
- [ ] Set `APP_URL` and `FRONTEND_URL` to production domains
- [ ] Enable HTTPS / TLS
- [ ] Configure CORS origins for production domains
- [ ] Set up S3 bucket for file uploads
- [ ] Configure Razorpay/Stripe webhook endpoints
- [ ] Set up proper process manager (PM2 / Docker)
- [ ] Add Redis for session caching and job queues (optional)
- [ ] Set up monitoring and error tracking

### Docker (Example)

```dockerfile
# Backend
FROM node:18-alpine
WORKDIR /app
COPY package*.json ./
COPY apps/backend ./apps/backend
RUN npm install --workspace=apps/backend
RUN npm run build:backend
EXPOSE 3002
CMD ["node", "apps/backend/dist/main"]
```

### Environment-Specific Notes

| Environment | Database | File Storage | Background Jobs |
|---|---|---|---|
| Development | SQLite (`file:./dev.db`) | Local filesystem | setTimeout polling |
| Production | PostgreSQL | AWS S3 | BullMQ + Redis (recommended) |

---

## License

Proprietary - All rights reserved.
