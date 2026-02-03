# Jasper Marketing Automation Platform

An intelligent agent-powered marketing workflow orchestration platform that leverages AI (Jasper AI and Anthropic Claude) for content generation, page building, and automates publishing across multiple social media platforms.

## Table of Contents

- [Overview](#overview)
- [Architecture](#architecture)
- [Tech Stack](#tech-stack)
- [Project Structure](#project-structure)
- [Frontend UI Components](#frontend-ui-components)
- [Getting Started](#getting-started)
- [Functional Flows](#functional-flows)
- [Development Guidelines](#development-guidelines)
- [API Documentation](#api-documentation)
- [Database Schema](#database-schema)
- [Authentication](#authentication)
- [Payment Integration](#payment-integration)
- [DevOps & Deployment](#devops--deployment)
- [Environment Variables](#environment-variables)
- [Troubleshooting](#troubleshooting)

---

## Overview

Jasper Marketing Automation Platform is a comprehensive solution for:

- **AI-Powered Content Generation**: Leverage Jasper AI to create marketing content for social media, blogs, and more
- **AI Page Builder**: Generate complete web pages using Anthropic Claude AI
- **Multi-Platform Publishing**: Connect and publish to Instagram, Facebook, YouTube, WordPress, and LinkedIn
- **Workspace & Site Builder**: Create custom websites with drag-and-drop page builder
- **Blog Management**: Create and manage blog posts with WordPress sync
- **Subscription Management**: Flexible subscription plans with credit-based usage and recurring payments
- **Analytics Dashboard**: Track content performance across platforms
- **Admin Panel**: Manage users, subscription plans, API credentials, and payments

---

## Architecture

```
                         ┌─────────────────────────────────────────────────────────────────┐
                         │                        Load Balancer                             │
                         │                    (nginx / AWS ALB)                             │
                         └─────────────────────────────────────────────────────────────────┘
                                                       │
                         ┌─────────────────────────────┼─────────────────────────────┐
                         │                             │                             │
                         ▼                             ▼                             ▼
                  ┌───────────────┐           ┌───────────────┐           ┌───────────────┐
                  │   Frontend    │           │    Admin      │           │   Backend     │
                  │   (Next.js)   │           │   (Next.js)   │           │   (NestJS)    │
                  │   Port 3000   │           │   Port 3001   │           │   Port 3002   │
                  └───────────────┘           └───────────────┘           └───────────────┘
                         │                           │                           │
                         │         REST API Calls    │                           │
                         └───────────────────────────┼───────────────────────────┘
                                                     │
                    ┌────────────────────────────────┼────────────────────────────────┐
                    │                                │                                │
                    ▼                                ▼                                ▼
            ┌───────────────┐               ┌───────────────┐              ┌───────────────┐
            │   Database    │               │    Redis      │              │ External APIs │
            │   (SQLite/    │               │   (Cache)     │              │               │
            │   PostgreSQL) │               │   Optional    │              │ - Jasper AI   │
            └───────────────┘               └───────────────┘              │ - Anthropic   │
                                                                           │ - Meta API    │
                                                                           │ - Google API  │
                                                                           │ - Razorpay    │
                                                                           │ - WordPress   │
                                                                           └───────────────┘
```

### App Communication Flow

```
┌─────────────────────────────────────────────────────────────────────────────────────┐
│                              USER JOURNEY                                            │
└─────────────────────────────────────────────────────────────────────────────────────┘

┌─────────────┐     ┌─────────────┐     ┌─────────────┐     ┌─────────────┐
│  Frontend   │────▶│   Backend   │────▶│  Database   │     │   Admin     │
│  (Next.js)  │◀────│  (NestJS)   │◀────│  (Prisma)   │     │  (Next.js)  │
│  Port 3000  │     │  Port 3002  │     │   SQLite    │     │  Port 3001  │
└─────────────┘     └─────────────┘     └─────────────┘     └──────┬──────┘
      │                    │                                        │
      │                    │                                        │
      │    ┌───────────────┴───────────────┐                       │
      │    │     API Endpoints Used        │                       │
      │    │                               │                       │
      │    │  /auth/*     - Authentication │                       │
      │    │  /users/*    - User Profile   │                       │
      │    │  /content/*  - Content CRUD   │◀──────────────────────┘
      │    │  /workspace/*- Page Builder   │     Admin uses same API
      │    │  /payments/* - Subscriptions  │     with ADMIN role
      │    │  /platforms/*- Social Connect │
      │    │  /admin/*    - Admin Only     │
      │    └───────────────────────────────┘
      │
      │    ┌───────────────────────────────┐
      │    │   External API Integrations   │
      │    │                               │
      └───▶│  Razorpay   - Payment UI      │
           │  Google     - OAuth Redirect  │
           │  Meta       - OAuth Redirect  │
           └───────────────────────────────┘
```

---

## Tech Stack

### Backend (NestJS)

| Package | Version | Purpose |
|---------|---------|---------|
| @nestjs/core | 10.x | Core framework |
| @nestjs/platform-express | 10.x | HTTP server |
| @nestjs/passport | 10.x | Authentication |
| @nestjs/jwt | 10.x | JWT tokens |
| @nestjs/swagger | 7.x | API documentation |
| @nestjs/config | 3.x | Configuration |
| @nestjs/throttler | 5.x | Rate limiting |
| @prisma/client | 5.x | Database ORM |
| passport-jwt | 4.x | JWT strategy |
| passport-google-oauth20 | 2.x | Google OAuth |
| bcryptjs | 2.x | Password hashing |
| helmet | 7.x | Security headers |
| razorpay | 2.x | Payment integration |
| axios | 1.x | HTTP client |
| class-validator | 0.14.x | DTO validation |
| class-transformer | 0.5.x | Object transformation |

### Frontend & Admin (Next.js)

| Package | Version | Purpose |
|---------|---------|---------|
| next | 14.1.x | React framework |
| react | 18.x | UI library |
| typescript | 5.x | Type safety |
| tailwindcss | 3.4.x | Utility CSS |
| tailwindcss-animate | 1.x | Animations |
| @tanstack/react-query | 5.x | Server state |
| zustand | 4.x | Client state |
| axios | 1.x | HTTP client |
| react-hook-form | 7.x | Form handling |
| @hookform/resolvers | 3.x | Form validation |
| zod | 3.x | Schema validation |
| date-fns | 3.x | Date utilities |
| recharts | 2.x | Charts |
| lucide-react | 0.309.x | Icons |
| sonner | 1.4.x | Toast notifications |
| class-variance-authority | 0.7.x | Component variants |
| clsx | 2.x | Class utilities |
| tailwind-merge | 2.x | Tailwind merging |

### Radix UI Components (Frontend)

| Package | Version | Purpose |
|---------|---------|---------|
| @radix-ui/react-alert-dialog | 1.x | Alert dialogs |
| @radix-ui/react-avatar | 1.x | User avatars |
| @radix-ui/react-dialog | 1.x | Modal dialogs |
| @radix-ui/react-dropdown-menu | 2.x | Dropdown menus |
| @radix-ui/react-label | 2.x | Form labels |
| @radix-ui/react-select | 2.x | Select dropdowns |
| @radix-ui/react-separator | 1.x | Visual separators |
| @radix-ui/react-slot | 1.x | Slot component |
| @radix-ui/react-switch | 1.x | Toggle switches |
| @radix-ui/react-tabs | 1.x | Tab navigation |
| @radix-ui/react-toast | 1.x | Toast messages |

### External Services

| Service | Purpose |
|---------|---------|
| Jasper AI | Content generation (social posts, blogs) |
| Anthropic Claude | AI page generation for workspace |
| Meta API | Facebook/Instagram publishing |
| Google API | YouTube/OAuth authentication |
| WordPress API | Blog publishing and sync |
| Razorpay | Payment processing (India) |
| Stripe | Payment processing (Global) - Optional |

---

## Project Structure

```
jasper/
├── apps/
│   ├── backend/                    # NestJS API Server (Port 3002)
│   │   ├── prisma/
│   │   │   ├── schema.prisma       # Database schema (444 lines)
│   │   │   ├── migrations/         # 4 migration folders
│   │   │   │   ├── 20260201183323_init/
│   │   │   │   ├── 20260201192951_add_admin_credentials_payments/
│   │   │   │   ├── 20260201201629_add_subscription_plans/
│   │   │   │   └── 20260201213602_add_workspace_page_builder/
│   │   │   └── dev.db              # SQLite database (development)
│   │   ├── src/
│   │   │   ├── common/
│   │   │   │   ├── decorators/
│   │   │   │   │   ├── current-user.decorator.ts
│   │   │   │   │   └── public.decorator.ts
│   │   │   │   ├── filters/        # Exception handling
│   │   │   │   ├── guards/
│   │   │   │   │   └── admin.guard.ts
│   │   │   │   └── interceptors/   # Request/response transformation
│   │   │   ├── modules/
│   │   │   │   ├── admin/          # Admin dashboard & user management
│   │   │   │   ├── analytics/      # Content analytics
│   │   │   │   ├── auth/           # JWT, OAuth, registration
│   │   │   │   ├── content/        # AI content generation & CRUD
│   │   │   │   ├── credentials/    # Encrypted API key storage
│   │   │   │   ├── health/         # Health check endpoints
│   │   │   │   ├── jasper/         # Jasper AI integration
│   │   │   │   ├── platforms/      # Social platform OAuth & connections
│   │   │   │   ├── publishing/     # Multi-platform publishing
│   │   │   │   ├── razorpay/       # Payment processing
│   │   │   │   ├── subscriptions/  # Plans & credit management
│   │   │   │   ├── users/          # User profile management
│   │   │   │   └── workspace/      # Page builder module
│   │   │   │       ├── workspace.controller.ts
│   │   │   │       ├── workspace.service.ts
│   │   │   │       ├── pages.service.ts
│   │   │   │       ├── posts.service.ts
│   │   │   │       ├── menus.service.ts
│   │   │   │       ├── ai-page.service.ts  # Claude AI integration
│   │   │   │       └── dto/
│   │   │   ├── prisma/
│   │   │   │   └── prisma.service.ts
│   │   │   ├── app.module.ts       # Root module
│   │   │   └── main.ts             # Bootstrap
│   │   ├── .env                    # Environment variables
│   │   └── package.json
│   │
│   ├── frontend/                   # User Dashboard (Port 3000)
│   │   ├── src/
│   │   │   ├── app/
│   │   │   │   ├── page.tsx                      # Landing page
│   │   │   │   ├── layout.tsx                    # Root layout
│   │   │   │   ├── globals.css                   # Global styles
│   │   │   │   ├── (auth)/
│   │   │   │   │   ├── login/page.tsx
│   │   │   │   │   └── register/page.tsx
│   │   │   │   └── dashboard/
│   │   │   │       ├── layout.tsx                # Dashboard layout
│   │   │   │       ├── page.tsx                  # Dashboard home
│   │   │   │       ├── content/
│   │   │   │       │   ├── page.tsx              # Content list
│   │   │   │       │   └── create/page.tsx       # Create content
│   │   │   │       ├── platforms/page.tsx        # Connected platforms
│   │   │   │       ├── analytics/page.tsx        # Analytics
│   │   │   │       ├── settings/page.tsx         # User settings
│   │   │   │       └── workspace/                # Page Builder
│   │   │   │           ├── page.tsx              # Workspace settings
│   │   │   │           ├── pages/
│   │   │   │           │   ├── page.tsx          # Pages list
│   │   │   │           │   ├── new/page.tsx      # Create page
│   │   │   │           │   └── [id]/edit/page.tsx
│   │   │   │           ├── posts/
│   │   │   │           │   ├── page.tsx          # Blog posts list
│   │   │   │           │   ├── new/page.tsx      # Create post
│   │   │   │           │   └── [id]/edit/page.tsx
│   │   │   │           └── menus/page.tsx        # Menu management
│   │   │   ├── components/
│   │   │   │   ├── landing/
│   │   │   │   │   ├── navbar.tsx
│   │   │   │   │   └── footer.tsx
│   │   │   │   ├── providers.tsx                 # React Query + Toasters
│   │   │   │   └── ui/                           # shadcn/ui components
│   │   │   │       ├── alert-dialog.tsx
│   │   │   │       ├── badge.tsx
│   │   │   │       ├── button.tsx
│   │   │   │       ├── card.tsx
│   │   │   │       ├── dialog.tsx
│   │   │   │       ├── dropdown-menu.tsx
│   │   │   │       ├── input.tsx
│   │   │   │       ├── label.tsx
│   │   │   │       ├── select.tsx
│   │   │   │       ├── sheet.tsx
│   │   │   │       ├── switch.tsx
│   │   │   │       ├── tabs.tsx
│   │   │   │       ├── textarea.tsx
│   │   │   │       ├── toast.tsx
│   │   │   │       └── toaster.tsx
│   │   │   ├── hooks/                            # Custom React hooks
│   │   │   ├── lib/
│   │   │   │   ├── api.ts                        # Axios API client
│   │   │   │   └── utils.ts                      # Utility functions
│   │   │   └── store/                            # Zustand stores
│   │   ├── tailwind.config.ts
│   │   └── package.json
│   │
│   └── admin/                      # Admin Panel (Port 3001)
│       ├── src/
│       │   ├── app/
│       │   │   ├── page.tsx                      # Redirect to dashboard
│       │   │   ├── layout.tsx
│       │   │   ├── login/page.tsx                # Admin login
│       │   │   └── dashboard/
│       │   │       ├── layout.tsx
│       │   │       ├── page.tsx                  # Stats dashboard
│       │   │       ├── users/page.tsx            # User management
│       │   │       ├── plans/page.tsx            # Subscription plans
│       │   │       ├── credentials/page.tsx      # API credentials
│       │   │       └── payments/page.tsx         # Payment history
│       │   ├── components/ui/                    # Admin UI components
│       │   ├── lib/
│       │   │   ├── api.ts                        # Admin API client
│       │   │   └── utils.ts
│       │   └── store/
│       │       └── auth.ts                       # Admin auth store
│       └── package.json
│
├── packages/                       # Shared packages (future)
│   └── shared/
│
├── package.json                    # Root workspace configuration
├── package-lock.json               # Dependency lock file
├── kill-ports.ps1                  # Windows port cleanup script
└── README.md                       # This file
```

---

## Frontend UI Components

The frontend uses **shadcn/ui** components built on Radix UI primitives with Tailwind CSS styling.

### Available Components (`apps/frontend/src/components/ui/`)

| Component | File | Radix Dependency | Purpose |
|-----------|------|------------------|---------|
| AlertDialog | `alert-dialog.tsx` | `@radix-ui/react-alert-dialog` | Confirmation dialogs |
| Badge | `badge.tsx` | None (pure CSS) | Status indicators |
| Button | `button.tsx` | `@radix-ui/react-slot` | Action buttons with variants |
| Card | `card.tsx` | None (pure CSS) | Content containers |
| Dialog | `dialog.tsx` | `@radix-ui/react-dialog` | Modal dialogs |
| DropdownMenu | `dropdown-menu.tsx` | `@radix-ui/react-dropdown-menu` | Context menus |
| Input | `input.tsx` | None (pure CSS) | Text inputs |
| Label | `label.tsx` | `@radix-ui/react-label` | Form labels |
| Select | `select.tsx` | `@radix-ui/react-select` | Dropdown selects |
| Sheet | `sheet.tsx` | `@radix-ui/react-dialog` | Slide-out panels |
| Switch | `switch.tsx` | `@radix-ui/react-switch` | Toggle switches |
| Tabs | `tabs.tsx` | `@radix-ui/react-tabs` | Tab navigation |
| Textarea | `textarea.tsx` | None (pure CSS) | Multi-line inputs |
| Toast | `toast.tsx` | `@radix-ui/react-toast` | Notifications (custom) |
| Toaster | `toaster.tsx` | - | Toast container |

### Toast Systems

The app uses **two toast systems**:
1. **Custom Toast** (`@/components/ui/toast`) - For React Query integration
2. **Sonner** (`sonner`) - For simple toast notifications in workspace pages

Both are initialized in `providers.tsx`.

---

## Getting Started

### Prerequisites

- **Node.js** >= 18.0.0
- **npm** >= 9.0.0
- **Git**

### Installation

1. **Clone the repository**
   ```bash
   git clone https://github.com/your-org/jasper.git
   cd jasper
   ```

2. **Install all dependencies**
   ```bash
   npm install
   ```

3. **Set up environment variables**
   ```bash
   # Copy example env file
   cp apps/backend/.env.example apps/backend/.env

   # Edit with your values
   ```

4. **Initialize the database**
   ```bash
   # Generate Prisma client
   npm run db:generate

   # Run migrations
   npm run db:migrate
   ```

5. **Start development servers**
   ```bash
   # Start all apps simultaneously
   npm run dev:all

   # Or start individually
   npm run dev:backend    # http://localhost:3002
   npm run dev:frontend   # http://localhost:3000
   npm run dev:admin      # http://localhost:3001
   ```

### First-Time Setup

1. **Register a user** at `http://localhost:3000/register`

2. **Promote to admin**
   ```bash
   npm run db:studio
   # Find your user → Change role to 'ADMIN'
   ```

3. **Seed subscription plans**
   - Login to admin at `http://localhost:3001`
   - Go to **Plans** → Click **"Seed Default Plans"**

4. **Configure API credentials**
   - Go to **Credentials** in admin panel
   - Add keys for services you want to use:
     - **Jasper AI**: `JASPER_API_KEY`
     - **Anthropic**: `ANTHROPIC_API_KEY`
     - **Meta**: `META_APP_ID`, `META_APP_SECRET`
     - **Google**: `GOOGLE_CLIENT_ID`, `GOOGLE_CLIENT_SECRET`
     - **Razorpay**: `RAZORPAY_KEY_ID`, `RAZORPAY_KEY_SECRET`

### NPM Scripts Reference

| Script | Description |
|--------|-------------|
| `npm run dev` | Start frontend + backend |
| `npm run dev:all` | Start all 3 apps |
| `npm run dev:backend` | Start backend only |
| `npm run dev:frontend` | Start frontend only |
| `npm run dev:admin` | Start admin only |
| `npm run build` | Build all apps |
| `npm run db:generate` | Generate Prisma client |
| `npm run db:migrate` | Run database migrations |
| `npm run db:studio` | Open Prisma Studio (port 5555) |
| `npm run lint` | Lint all apps |

---

## Functional Flows

### 1. User Authentication Flow

```
┌──────────────┐     ┌──────────────┐     ┌──────────────┐
│   Frontend   │     │   Backend    │     │   Database   │
│  /register   │     │  /auth/*     │     │    User      │
└──────┬───────┘     └──────┬───────┘     └──────┬───────┘
       │                    │                    │
       │  POST /register    │                    │
       │───────────────────▶│                    │
       │                    │  Create user       │
       │                    │───────────────────▶│
       │                    │                    │
       │                    │  Create subscription (STARTER, 100 credits)
       │                    │───────────────────▶│
       │                    │                    │
       │  { user, tokens }  │                    │
       │◀───────────────────│                    │
       │                    │                    │
       │  Store in localStorage                  │
       │  Redirect to /dashboard                 │
```

### 2. Content Generation Flow

```
┌──────────────┐     ┌──────────────┐     ┌──────────────┐     ┌──────────────┐
│   Frontend   │     │   Backend    │     │  Jasper AI   │     │   Database   │
│  /content    │     │  /content/*  │     │     API      │     │   Content    │
└──────┬───────┘     └──────┬───────┘     └──────┬───────┘     └──────┬───────┘
       │                    │                    │                    │
       │  POST /generate    │                    │                    │
       │  { type, topic }   │                    │                    │
       │───────────────────▶│                    │                    │
       │                    │                    │                    │
       │                    │  Check credits     │                    │
       │                    │───────────────────────────────────────▶│
       │                    │                    │                    │
       │                    │  Call Jasper API   │                    │
       │                    │───────────────────▶│                    │
       │                    │                    │                    │
       │                    │  Generated content │                    │
       │                    │◀───────────────────│                    │
       │                    │                    │                    │
       │                    │  Save content      │                    │
       │                    │───────────────────────────────────────▶│
       │                    │                    │                    │
       │                    │  Deduct credits    │                    │
       │                    │───────────────────────────────────────▶│
       │                    │                    │                    │
       │  { content }       │                    │                    │
       │◀───────────────────│                    │                    │
```

### 3. Payment & Subscription Flow

```
┌──────────────┐     ┌──────────────┐     ┌──────────────┐     ┌──────────────┐
│   Frontend   │     │   Backend    │     │  Razorpay    │     │   Database   │
│  Pricing     │     │  /payments/* │     │    API       │     │  Payment     │
└──────┬───────┘     └──────┬───────┘     └──────┬───────┘     └──────┬───────┘
       │                    │                    │                    │
       │  POST /create-order│                    │                    │
       │───────────────────▶│                    │                    │
       │                    │  Create order      │                    │
       │                    │───────────────────▶│                    │
       │                    │                    │                    │
       │  { orderId, key }  │                    │                    │
       │◀───────────────────│                    │                    │
       │                    │                    │                    │
       │  Open Razorpay     │                    │                    │
       │  Checkout Widget   │                    │                    │
       │─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─▶│                    │
       │                    │                    │                    │
       │  Payment complete  │                    │                    │
       │◀─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─│                    │
       │                    │                    │                    │
       │  POST /verify      │                    │                    │
       │───────────────────▶│                    │                    │
       │                    │  Verify signature  │                    │
       │                    │───────────────────▶│                    │
       │                    │                    │                    │
       │                    │  Update subscription                   │
       │                    │───────────────────────────────────────▶│
       │                    │                    │                    │
       │                    │  Add credits       │                    │
       │                    │───────────────────────────────────────▶│
       │                    │                    │                    │
       │  { success }       │                    │                    │
       │◀───────────────────│                    │                    │
```

### 4. Workspace/Page Builder Flow

```
┌──────────────┐     ┌──────────────┐     ┌──────────────┐     ┌──────────────┐
│   Frontend   │     │   Backend    │     │  Anthropic   │     │   Database   │
│  /workspace  │     │  /workspace/*│     │  Claude API  │     │  Workspace   │
└──────┬───────┘     └──────┬───────┘     └──────┬───────┘     └──────┬───────┘
       │                    │                    │                    │
       │  POST /workspace   │                    │                    │
       │  { name, slug }    │                    │                    │
       │───────────────────▶│                    │                    │
       │                    │  Create workspace  │                    │
       │                    │───────────────────────────────────────▶│
       │                    │                    │                    │
       │  POST /pages       │                    │                    │
       │───────────────────▶│                    │                    │
       │                    │  Create page       │                    │
       │                    │───────────────────────────────────────▶│
       │                    │                    │                    │
       │  POST /pages/:id/  │                    │                    │
       │  generate-with-ai  │                    │                    │
       │───────────────────▶│                    │                    │
       │                    │  Generate HTML     │                    │
       │                    │───────────────────▶│                    │
       │                    │                    │                    │
       │                    │  Claude response   │                    │
       │                    │◀───────────────────│                    │
       │                    │                    │                    │
       │                    │  Save HTML content │                    │
       │                    │───────────────────────────────────────▶│
       │                    │                    │                    │
       │  { page with HTML }│                    │                    │
       │◀───────────────────│                    │                    │
```

### 5. Admin Management Flow

```
┌──────────────┐     ┌──────────────┐     ┌──────────────┐
│    Admin     │     │   Backend    │     │   Database   │
│  /dashboard  │     │  /admin/*    │     │   (All)      │
└──────┬───────┘     └──────┬───────┘     └──────┬───────┘
       │                    │                    │
       │  GET /admin/stats  │                    │
       │───────────────────▶│                    │
       │                    │  Aggregate data    │
       │                    │───────────────────▶│
       │  { stats }         │                    │
       │◀───────────────────│                    │
       │                    │                    │
       │  PUT /admin/users/:id                   │
       │  { role: 'ADMIN' } │                    │
       │───────────────────▶│                    │
       │                    │  Update user       │
       │                    │───────────────────▶│
       │                    │                    │
       │                    │  Create audit log  │
       │                    │───────────────────▶│
       │                    │                    │
       │  PUT /admin/credentials/:key            │
       │  { value: 'sk-xxx' }                    │
       │───────────────────▶│                    │
       │                    │  Encrypt & save    │
       │                    │───────────────────▶│
```

---

## Development Guidelines

### Code Style

- **TypeScript**: Strict mode, explicit types
- **Naming**:
  - Variables/Functions: `camelCase`
  - Classes/Interfaces: `PascalCase`
  - Files: `kebab-case.ts`
  - Database columns: `snake_case` (via Prisma `@map`)

### Adding a Backend Module

```bash
cd apps/backend

# Generate module structure
npx nest g module modules/your-module
npx nest g controller modules/your-module
npx nest g service modules/your-module

# Create DTO folder
mkdir src/modules/your-module/dto
```

### Adding a Frontend Page

1. Create page file: `src/app/your-route/page.tsx`
2. Add API calls to `src/lib/api.ts`
3. Use React Query for data fetching:

```typescript
'use client';

import { useQuery } from '@tanstack/react-query';
import { yourApi } from '@/lib/api';

export default function YourPage() {
  const { data, isLoading } = useQuery({
    queryKey: ['your-key'],
    queryFn: () => yourApi.getAll(),
  });

  if (isLoading) return <div>Loading...</div>;
  return <div>{/* Render data */}</div>;
}
```

### Adding UI Components

Follow shadcn/ui pattern:

```typescript
// components/ui/your-component.tsx
import * as React from 'react';
import { cn } from '@/lib/utils';

export interface YourComponentProps extends React.HTMLAttributes<HTMLDivElement> {}

const YourComponent = React.forwardRef<HTMLDivElement, YourComponentProps>(
  ({ className, ...props }, ref) => (
    <div ref={ref} className={cn('your-base-classes', className)} {...props} />
  )
);
YourComponent.displayName = 'YourComponent';

export { YourComponent };
```

---

## API Documentation

### Base URL

| Environment | URL |
|-------------|-----|
| Development | `http://localhost:3002/api/v1` |
| Production | `https://api.yourdomain.com/api/v1` |

### Swagger UI

Access at: `http://localhost:3002/api/docs`

### Authentication

```
Authorization: Bearer <access_token>
```

### Core Endpoints

#### Authentication (`/auth`)
| Method | Endpoint | Description | Auth |
|--------|----------|-------------|------|
| POST | `/auth/register` | User registration | No |
| POST | `/auth/login` | User login | No |
| POST | `/auth/verify` | Verify email/phone | No |
| POST | `/auth/refresh` | Refresh tokens | No |
| POST | `/auth/logout` | Logout | Yes |
| GET | `/auth/me` | Current user | Yes |
| GET | `/auth/google` | Google OAuth | No |

#### Users (`/users`)
| Method | Endpoint | Description | Auth |
|--------|----------|-------------|------|
| GET | `/users/me` | Get current user | Yes |
| PUT | `/users/me` | Update user | Yes |
| GET | `/users/me/profile` | Get profile | Yes |
| PUT | `/users/me/profile` | Update profile | Yes |

#### Content (`/content`)
| Method | Endpoint | Description | Auth |
|--------|----------|-------------|------|
| POST | `/content/generate` | AI generate content | Yes |
| GET | `/content` | List user content | Yes |
| GET | `/content/:id` | Get content | Yes |
| PUT | `/content/:id` | Update content | Yes |
| DELETE | `/content/:id` | Delete content | Yes |
| POST | `/content/:id/schedule` | Schedule publishing | Yes |

#### Workspace (`/workspace`)
| Method | Endpoint | Description | Auth |
|--------|----------|-------------|------|
| GET | `/workspace` | Get user workspace | Yes |
| POST | `/workspace` | Create workspace | Yes |
| PUT | `/workspace` | Update workspace | Yes |
| DELETE | `/workspace` | Delete workspace | Yes |
| GET | `/workspace/check-slug/:slug` | Check slug availability | Yes |

#### Pages (`/workspace/pages`)
| Method | Endpoint | Description | Auth |
|--------|----------|-------------|------|
| GET | `/workspace/pages` | List pages | Yes |
| POST | `/workspace/pages` | Create page | Yes |
| GET | `/workspace/pages/:id` | Get page | Yes |
| PUT | `/workspace/pages/:id` | Update page | Yes |
| DELETE | `/workspace/pages/:id` | Delete page | Yes |
| POST | `/workspace/pages/:id/publish` | Publish page | Yes |
| POST | `/workspace/pages/:id/generate-with-ai` | AI generate page | Yes |

#### Posts (`/workspace/posts`)
| Method | Endpoint | Description | Auth |
|--------|----------|-------------|------|
| GET | `/workspace/posts` | List blog posts | Yes |
| POST | `/workspace/posts` | Create post | Yes |
| GET | `/workspace/posts/:id` | Get post | Yes |
| PUT | `/workspace/posts/:id` | Update post | Yes |
| DELETE | `/workspace/posts/:id` | Delete post | Yes |
| POST | `/workspace/posts/:id/publish` | Publish post | Yes |
| POST | `/workspace/posts/:id/sync-wordpress` | Sync to WordPress | Yes |

#### Menus (`/workspace/menus`)
| Method | Endpoint | Description | Auth |
|--------|----------|-------------|------|
| GET | `/workspace/menus` | List menus | Yes |
| GET | `/workspace/menus/:location` | Get menu by location | Yes |
| PUT | `/workspace/menus/:location` | Update menu | Yes |

#### Payments (`/payments`)
| Method | Endpoint | Description | Auth |
|--------|----------|-------------|------|
| GET | `/payments/plans` | List plans | No |
| POST | `/payments/create-order` | Create order | Yes |
| POST | `/payments/verify` | Verify payment | Yes |
| GET | `/payments/history` | Payment history | Yes |
| POST | `/payments/subscriptions/create` | Create subscription | Yes |
| POST | `/payments/subscriptions/cancel` | Cancel subscription | Yes |
| POST | `/payments/webhook` | Razorpay webhook | No |

#### Admin (`/admin`) - Requires ADMIN role
| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/admin/stats` | Dashboard statistics |
| GET | `/admin/users` | List all users |
| GET | `/admin/users/:id` | User details |
| PUT | `/admin/users/:id` | Update user |
| DELETE | `/admin/users/:id` | Delete user |
| GET | `/admin/plans` | List plans |
| POST | `/admin/plans` | Create plan |
| PUT | `/admin/plans/:id` | Update plan |
| DELETE | `/admin/plans/:id` | Delete plan |
| POST | `/admin/plans/seed` | Seed default plans |
| GET | `/admin/credentials` | List credentials |
| POST | `/admin/credentials` | Create credential |
| PUT | `/admin/credentials/:key` | Update credential |
| DELETE | `/admin/credentials/:key` | Delete credential |
| GET | `/admin/payments` | All payments |
| GET | `/admin/audit-logs` | Audit history |

---

## Database Schema

### Entity Relationship Diagram

```
┌─────────────────────────────────────────────────────────────────────────────────┐
│                              USER & AUTHENTICATION                               │
└─────────────────────────────────────────────────────────────────────────────────┘

┌─────────────────┐     ┌─────────────────┐     ┌─────────────────┐
│      User       │     │   UserProfile   │     │  RefreshToken   │
├─────────────────┤     ├─────────────────┤     ├─────────────────┤
│ id (PK)         │◀───▶│ userId (FK,UQ)  │     │ id (PK)         │
│ email (UQ)      │     │ businessName    │     │ userId (FK)     │
│ phone (UQ)      │     │ industry        │     │ token (UQ)      │
│ passwordHash    │     │ description     │     │ expiresAt       │
│ name            │     │ services (JSON) │     └─────────────────┘
│ avatarUrl       │     │ products (JSON) │
│ authProvider    │     │ targetAudience  │
│ role            │     │ location        │
│ status          │     │ timezone        │
│ mfaEnabled      │     │ logoUrl         │
│ emailVerified   │     │ brandColors     │
│ phoneVerified   │     │ tonePreference  │
│ lastLoginAt     │     │ competitors     │
│ createdAt       │     │ completeness    │
│ updatedAt       │     └─────────────────┘
└─────────────────┘
        │
        │ 1:1
        ▼
┌─────────────────────────────────────────────────────────────────────────────────┐
│                              SUBSCRIPTIONS & PAYMENTS                            │
└─────────────────────────────────────────────────────────────────────────────────┘

┌─────────────────┐     ┌─────────────────┐     ┌─────────────────┐
│  Subscription   │     │SubscriptionPlan │     │     Payment     │
├─────────────────┤     ├─────────────────┤     ├─────────────────┤
│ id (PK)         │     │ id (PK)         │     │ id (PK)         │
│ userId (FK,UQ)  │────▶│ name (UQ)       │     │ userId (FK)     │
│ tier            │     │ displayName     │     │ subscriptionId  │
│ status          │     │ description     │     │ razorpayOrderId │
│ billingCycle    │     │ monthlyPrice    │     │ razorpayPaymentId│
│ creditsTotal    │     │ yearlyPrice     │     │ razorpaySignature│
│ creditsRemaining│     │ yearlyDiscount  │     │ amount          │
│ creditsRollover │     │ credits         │     │ currency        │
│ razorpaySubId   │     │ features (JSON) │     │ status          │
│ periodStart     │     │ razorpayPlanIds │     │ planId          │
│ periodEnd       │     │ isActive        │     │ metadata        │
│ canceledAt      │     │ isDefault       │     │ failureReason   │
└─────────────────┘     │ sortOrder       │     └─────────────────┘
        │               └─────────────────┘
        │
        ▼
┌─────────────────┐
│CreditTransaction│
├─────────────────┤
│ id (PK)         │
│ userId (FK)     │
│ type            │
│ amount          │
│ balance         │
│ description     │
│ referenceId     │
│ createdAt       │
└─────────────────┘

┌─────────────────────────────────────────────────────────────────────────────────┐
│                              CONTENT & PUBLISHING                                │
└─────────────────────────────────────────────────────────────────────────────────┘

┌─────────────────┐     ┌─────────────────┐     ┌─────────────────┐
│     Content     │     │  ContentMedia   │     │ContentAnalytics │
├─────────────────┤     ├─────────────────┤     ├─────────────────┤
│ id (PK)         │◀───▶│ contentId (FK)  │     │ contentId (FK)  │
│ userId (FK)     │     │ url             │     │ impressions     │
│ connectionId(FK)│     │ type            │     │ reach           │
│ type            │     │ size            │     │ likes           │
│ status          │     │ width/height    │     │ comments        │
│ title           │     │ duration        │     │ shares          │
│ caption         │     │ altText         │     │ saves           │
│ body            │     │ order           │     │ clicks          │
│ hashtags (JSON) │     └─────────────────┘     │ engagement      │
│ mediaUrls (JSON)│                             │ lastSyncAt      │
│ thumbnailUrl    │                             └─────────────────┘
│ seoTitle        │
│ seoDescription  │
│ seoKeywords     │     ┌─────────────────┐
│ aiPrompt        │     │PlatformConnection│
│ aiMetadata      │     ├─────────────────┤
│ platformPostId  │◀────│ id (PK)         │
│ platformPostUrl │     │ userId (FK)     │
│ scheduledAt     │     │ platform        │
│ publishedAt     │     │ status          │
│ creditsConsumed │     │ accountId       │
│ errorMessage    │     │ accountName     │
└─────────────────┘     │ accessToken     │
                        │ refreshToken    │
                        │ tokenExpiry     │
                        │ scopes (JSON)   │
                        │ metadata        │
                        │ lastSyncAt      │
                        └─────────────────┘

┌─────────────────────────────────────────────────────────────────────────────────┐
│                              WORKSPACE & PAGE BUILDER                            │
└─────────────────────────────────────────────────────────────────────────────────┘

┌─────────────────┐     ┌─────────────────┐     ┌─────────────────┐
│    Workspace    │     │  WorkspacePage  │     │  WorkspacePost  │
├─────────────────┤     ├─────────────────┤     ├─────────────────┤
│ id (PK)         │◀───▶│ workspaceId(FK) │     │ workspaceId(FK) │
│ userId (FK,UQ)  │     │ title           │     │ title           │
│ name            │     │ slug            │     │ slug            │
│ slug (UQ)       │     │ description     │     │ excerpt         │
│ description     │     │ content (JSON)  │     │ content (HTML)  │
│ logo            │     │ htmlContent     │     │ featuredImage   │
│ favicon         │     │ cssContent      │     │ status          │
│ settings (JSON) │     │ status          │     │ publishedAt     │
│ isPublished     │     │ isHomePage      │     │ wpPostId        │
│ createdAt       │     │ seoTitle        │     │ wpSyncedAt      │
│ updatedAt       │     │ seoKeywords     │     │ wpConnectionId  │
└─────────────────┘     │ sortOrder       │     │ seoTitle        │
        │               │ publishedAt     │     │ seoDescription  │
        │               └─────────────────┘     │ seoKeywords     │
        │                                       │ tags (JSON)     │
        ▼                                       │ categories(JSON)│
┌─────────────────┐                             └─────────────────┘
│  WorkspaceMenu  │
├─────────────────┤
│ id (PK)         │
│ workspaceId(FK) │
│ name            │
│ location        │
│ items (JSON)    │
│ isActive        │
└─────────────────┘

┌─────────────────────────────────────────────────────────────────────────────────┐
│                              ADMIN & SYSTEM                                      │
└─────────────────────────────────────────────────────────────────────────────────┘

┌─────────────────┐     ┌─────────────────┐     ┌─────────────────┐
│  ApiCredential  │     │    AuditLog     │     │  TrendingTopic  │
├─────────────────┤     ├─────────────────┤     ├─────────────────┤
│ id (PK)         │     │ id (PK)         │     │ id (PK)         │
│ key (UQ)        │     │ userId          │     │ topic           │
│ value(encrypted)│     │ action          │     │ category        │
│ description     │     │ entityType      │     │ score           │
│ category        │     │ entityId        │     │ hashtags (JSON) │
│ isActive        │     │ oldValue        │     │ keywords (JSON) │
│ createdAt       │     │ newValue        │     │ region          │
│ updatedAt       │     │ ipAddress       │     │ source          │
└─────────────────┘     │ userAgent       │     │ expiresAt       │
                        │ createdAt       │     └─────────────────┘
                        └─────────────────┘
```

### Credential Categories

| Category | Keys | Purpose |
|----------|------|---------|
| `jasper` | `JASPER_API_KEY`, `JASPER_API_URL` | Content generation |
| `anthropic` | `ANTHROPIC_API_KEY` | AI page generation |
| `meta` | `META_APP_ID`, `META_APP_SECRET` | Facebook/Instagram |
| `google` | `GOOGLE_CLIENT_ID`, `GOOGLE_CLIENT_SECRET` | YouTube/OAuth |
| `razorpay` | `RAZORPAY_KEY_ID`, `RAZORPAY_KEY_SECRET`, `RAZORPAY_WEBHOOK_SECRET` | Payments |
| `wordpress` | `WORDPRESS_CLIENT_ID`, `WORDPRESS_CLIENT_SECRET` | Blog sync |

---

## Authentication

### JWT Token Flow

```
1. Login/Register → accessToken (15min) + refreshToken (7 days)
2. Store tokens in localStorage
3. Send: Authorization: Bearer <accessToken>
4. On 401 → Call /auth/refresh with refreshToken
5. Refresh token rotates on each use
```

### Role-Based Access

| Role | Access |
|------|--------|
| `USER` | Dashboard, content, workspace, subscriptions |
| `ADMIN` | All USER access + Admin panel |

### OAuth Providers

- **Google**: Login + YouTube integration
- **Meta**: Facebook/Instagram publishing

---

## Payment Integration

### Razorpay Setup

#### One-time Payment
```javascript
// 1. Create order
const { data } = await api.post('/payments/create-order', {
  plan: 'PROFESSIONAL',
  billingCycle: 'MONTHLY'
});

// 2. Open checkout
const razorpay = new Razorpay({
  key: data.razorpayKeyId,
  order_id: data.razorpayOrderId,
  amount: data.amount,
  handler: async (response) => {
    await api.post('/payments/verify', response);
  }
});
razorpay.open();
```

#### Recurring Subscription
```javascript
const { data } = await api.post('/payments/subscriptions/create', {
  planId: 'PROFESSIONAL',
  billingCycle: 'MONTHLY'
});
window.location.href = data.shortUrl;
```

### Webhook Events

Configure in Razorpay Dashboard:
- URL: `https://api.yourdomain.com/api/v1/payments/webhook`
- Events: `payment.captured`, `subscription.activated`, `subscription.charged`

---

## DevOps & Deployment

### Development Ports

| Service | Port |
|---------|------|
| Frontend | 3000 |
| Admin | 3001 |
| Backend | 3002 |
| Prisma Studio | 5555 |

### Docker Deployment

See `docker-compose.yml` for full stack deployment with PostgreSQL and Redis.

### Production Checklist

- [ ] Change all secrets (`JWT_SECRET`, `ENCRYPTION_KEY`)
- [ ] Enable HTTPS everywhere
- [ ] Configure CORS origins
- [ ] Switch to PostgreSQL
- [ ] Enable Redis caching
- [ ] Set up error tracking (Sentry)
- [ ] Configure Razorpay webhook URL
- [ ] Test all payment flows

---

## Environment Variables

### Backend (`apps/backend/.env`)

```bash
# Application
NODE_ENV=development
PORT=3002
APP_URL=http://localhost:3002
FRONTEND_URL=http://localhost:3000
CORS_ORIGINS=http://localhost:3000,http://localhost:3001

# Database
DATABASE_URL=file:./dev.db

# JWT
JWT_SECRET=your-secret-minimum-32-characters
JWT_EXPIRES_IN=15m
REFRESH_TOKEN_DAYS=7

# Google OAuth
GOOGLE_CLIENT_ID=
GOOGLE_CLIENT_SECRET=
GOOGLE_CALLBACK_URL=http://localhost:3002/api/v1/auth/google/callback

# Meta
META_APP_ID=
META_APP_SECRET=

# WordPress
WORDPRESS_CLIENT_ID=
WORDPRESS_CLIENT_SECRET=

# Jasper AI
JASPER_API_KEY=
JASPER_API_URL=https://api.jasper.ai/v1

# Anthropic (Claude)
ANTHROPIC_API_KEY=

# Razorpay
RAZORPAY_KEY_ID=
RAZORPAY_KEY_SECRET=
RAZORPAY_WEBHOOK_SECRET=

# Encryption
CREDENTIALS_ENCRYPTION_KEY=your-32-character-encryption-key
```

### Frontend (`apps/frontend/.env.local`)

```bash
NEXT_PUBLIC_API_URL=http://localhost:3002
NEXT_PUBLIC_APP_URL=http://localhost:3000
NEXT_PUBLIC_RAZORPAY_KEY_ID=rzp_test_xxxx
```

### Admin (`apps/admin/.env.local`)

```bash
NEXT_PUBLIC_API_URL=http://localhost:3002
```

---

## Troubleshooting

### Port Already in Use

**Windows:**
```powershell
.\kill-ports.ps1
```

**Linux/Mac:**
```bash
lsof -i :3002 && kill -9 <PID>
```

### Prisma Issues

```bash
cd apps/backend
npx prisma generate
npx prisma migrate reset  # Dev only!
```

### CORS Errors

Check `CORS_ORIGINS` in backend `.env` includes frontend URL without trailing slash.

### Missing UI Components

If you see "Module not found" for UI components:
```bash
cd apps/frontend
npm install
```

All shadcn/ui components are in `apps/frontend/src/components/ui/`.

---

## Credit System

| Content Type | Credits |
|--------------|---------|
| Instagram Image | 5 |
| Instagram Carousel | 8 |
| Instagram Video/Reel | 15 |
| Facebook Image | 5 |
| Facebook Video | 15 |
| Blog Post (500 words) | 10 |
| Blog Post (1000+ words) | 20 |
| Ad Campaign | 25 |

## Default Subscription Plans

| Plan | Monthly | Yearly | Credits | Yearly Discount |
|------|---------|--------|---------|-----------------|
| Starter | Free | Free | 100 | - |
| Professional | ₹999 | ₹9,590 | 500 | 20% |
| Business | ₹2,999 | ₹28,790 | 2,000 | 20% |
| Enterprise | ₹9,999 | ₹95,990 | 10,000 | 20% |

---

## License

This project is proprietary software. All rights reserved.

---

## Contributing

1. Fork the repository
2. Create feature branch (`git checkout -b feature/amazing-feature`)
3. Commit using conventional commits
4. Push and open Pull Request

---

*Last updated: February 2026*
