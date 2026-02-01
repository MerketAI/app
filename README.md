# Jasper Marketing Automation Platform

An intelligent agent-powered marketing workflow orchestration platform that leverages Jasper AI for content generation and automates publishing across multiple social media platforms.

## Table of Contents

- [Overview](#overview)
- [Architecture](#architecture)
- [Tech Stack](#tech-stack)
- [Project Structure](#project-structure)
- [Getting Started](#getting-started)
- [Development Guidelines](#development-guidelines)
- [API Documentation](#api-documentation)
- [Database](#database)
- [Authentication](#authentication)
- [Payment Integration](#payment-integration)
- [DevOps & Deployment](#devops--deployment)
- [Environment Variables](#environment-variables)
- [Troubleshooting](#troubleshooting)

---

## Overview

Jasper Marketing Automation Platform is a comprehensive solution for:

- **AI-Powered Content Generation**: Leverage Jasper AI to create marketing content for social media, blogs, and more
- **Multi-Platform Publishing**: Connect and publish to Instagram, Facebook, YouTube, WordPress, and LinkedIn
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
                                                                                  │
                                    ┌─────────────────────────────────────────────┼─────────────────────────────┐
                                    │                                             │                             │
                                    ▼                                             ▼                             ▼
                            ┌───────────────┐                            ┌───────────────┐           ┌───────────────┐
                            │   Database    │                            │    Redis      │           │  External APIs │
                            │   (SQLite/    │                            │   (Cache)     │           │  - Jasper AI   │
                            │   PostgreSQL) │                            │               │           │  - Meta API    │
                            └───────────────┘                            └───────────────┘           │  - Google API  │
                                                                                                     │  - Razorpay    │
                                                                                                     └───────────────┘
```

---

## Tech Stack

### Backend
| Technology | Version | Purpose |
|------------|---------|---------|
| Node.js | >= 18.0.0 | Runtime |
| NestJS | 10.x | API Framework |
| Prisma | 5.x | ORM |
| SQLite/PostgreSQL | - | Database |
| Redis | - | Caching (optional) |
| Passport.js | 0.7.x | Authentication |
| JWT | - | Token-based auth |

### Frontend & Admin
| Technology | Version | Purpose |
|------------|---------|---------|
| Next.js | 14.x | React Framework |
| React | 18.x | UI Library |
| TypeScript | 5.x | Type Safety |
| Tailwind CSS | 3.x | Styling |
| Zustand | 4.x | State Management |
| React Query | 5.x | Data Fetching |
| Radix UI | - | UI Components |

### External Services
| Service | Purpose |
|---------|---------|
| Jasper AI | Content Generation |
| Meta API | Facebook/Instagram Publishing |
| Google API | YouTube/OAuth |
| Razorpay | Payment Processing (India) |
| Stripe | Payment Processing (Global) |

---

## Project Structure

```
jasper/
├── apps/
│   ├── backend/                 # NestJS API Server
│   │   ├── prisma/
│   │   │   ├── schema.prisma    # Database schema
│   │   │   ├── migrations/      # Database migrations
│   │   │   └── dev.db           # SQLite database (dev)
│   │   ├── src/
│   │   │   ├── common/          # Shared utilities
│   │   │   │   ├── decorators/  # Custom decorators
│   │   │   │   ├── filters/     # Exception filters
│   │   │   │   ├── guards/      # Auth guards (JwtAuthGuard, AdminGuard)
│   │   │   │   └── interceptors/# Request interceptors
│   │   │   ├── modules/
│   │   │   │   ├── admin/       # Admin management (users, plans, audit)
│   │   │   │   ├── analytics/   # Analytics module
│   │   │   │   ├── auth/        # Authentication (JWT, OAuth)
│   │   │   │   ├── content/     # Content management
│   │   │   │   ├── credentials/ # Encrypted API credentials
│   │   │   │   ├── health/      # Health checks
│   │   │   │   ├── jasper/      # Jasper AI integration
│   │   │   │   ├── platforms/   # Social platform connections
│   │   │   │   ├── publishing/  # Content publishing
│   │   │   │   ├── razorpay/    # Razorpay payments & subscriptions
│   │   │   │   ├── subscriptions/# Subscription management
│   │   │   │   └── users/       # User management
│   │   │   ├── prisma/          # Prisma service
│   │   │   ├── app.module.ts    # Root module
│   │   │   └── main.ts          # Entry point
│   │   ├── .env                 # Environment variables
│   │   └── package.json
│   │
│   ├── frontend/                # User-facing Next.js App (Port 3000)
│   │   ├── src/
│   │   │   ├── app/             # App Router pages
│   │   │   ├── components/      # React components
│   │   │   ├── hooks/           # Custom hooks
│   │   │   ├── lib/             # Utilities & API client
│   │   │   └── store/           # Zustand stores
│   │   └── package.json
│   │
│   └── admin/                   # Admin Panel Next.js App (Port 3001)
│       ├── src/
│       │   ├── app/
│       │   │   ├── dashboard/   # Admin dashboard
│       │   │   │   ├── page.tsx          # Dashboard stats
│       │   │   │   ├── users/page.tsx    # User management
│       │   │   │   ├── plans/page.tsx    # Subscription plans
│       │   │   │   ├── credentials/page.tsx # API credentials
│       │   │   │   └── payments/page.tsx # Payment history
│       │   │   └── login/page.tsx        # Admin login
│       │   ├── components/ui/   # UI components
│       │   ├── lib/api.ts       # API client
│       │   └── store/auth.ts    # Auth store
│       └── package.json
│
├── packages/                    # Shared packages (future)
│   └── shared/
│
├── package.json                 # Root package.json (workspaces)
├── kill-ports.ps1              # Windows port cleanup script
└── README.md                    # This file
```

---

## Getting Started

### Prerequisites

- **Node.js** >= 18.0.0
- **npm** >= 9.0.0
- **Git**

### Installation

1. **Clone the repository**
   ```bash
   git clone https://github.com/your-org/jasper-marketing-automation.git
   cd jasper-marketing-automation
   ```

2. **Install dependencies**
   ```bash
   npm install
   ```

3. **Set up environment variables**
   ```bash
   # Copy example env file
   cp apps/backend/.env.example apps/backend/.env

   # Edit with your values (see Environment Variables section)
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
   # Start all apps (backend, frontend, admin)
   npm run dev:all

   # Or start individually
   npm run dev:backend    # http://localhost:3002
   npm run dev:frontend   # http://localhost:3000
   npm run dev:admin      # http://localhost:3001
   ```

### First-Time Setup

1. **Create an admin user**
   ```bash
   # Open Prisma Studio
   npm run db:studio

   # Find your user and update role to 'ADMIN'
   # Or use the API to register, then update via Studio
   ```

2. **Seed default subscription plans**
   - Login to admin panel at `http://localhost:3001`
   - Navigate to **Plans** page
   - Click **"Seed Default Plans"** button

3. **Configure API credentials**
   - Go to **Credentials** page in admin
   - Add required API keys:
     - Jasper AI: `JASPER_API_KEY`
     - Meta: `META_APP_ID`, `META_APP_SECRET`
     - Google: `GOOGLE_CLIENT_ID`, `GOOGLE_CLIENT_SECRET`
     - Razorpay: `RAZORPAY_KEY_ID`, `RAZORPAY_KEY_SECRET`, `RAZORPAY_WEBHOOK_SECRET`

---

## Development Guidelines

### Code Style

- **TypeScript**: Use strict mode, explicit types for function parameters and returns
- **Naming Conventions**:
  - Variables/Functions: `camelCase`
  - Classes/Interfaces/Types: `PascalCase`
  - Files: `kebab-case.ts` or `kebab-case.service.ts`
  - Database columns: `snake_case` (using Prisma `@map`)
- **Imports**: Group by external, internal, relative
- **Comments**: Use JSDoc for public APIs and complex logic

### Git Workflow

```bash
# Create feature branch from main
git checkout main
git pull origin main
git checkout -b feature/your-feature-name

# Make changes and commit (use conventional commits)
git add .
git commit -m "feat: add your feature description"

# Push and create PR
git push origin feature/your-feature-name
```

### Commit Convention

Follow [Conventional Commits](https://www.conventionalcommits.org/):

| Type | Description | Example |
|------|-------------|---------|
| `feat` | New feature | `feat: add subscription plan management` |
| `fix` | Bug fix | `fix: resolve payment verification issue` |
| `docs` | Documentation | `docs: update API documentation` |
| `style` | Formatting | `style: fix indentation in auth service` |
| `refactor` | Code restructuring | `refactor: simplify credential encryption` |
| `test` | Adding tests | `test: add unit tests for razorpay service` |
| `chore` | Maintenance | `chore: update dependencies` |

### Backend Development

#### Adding a New Module

```bash
cd apps/backend

# Generate module, controller, and service
npx nest g module modules/your-module
npx nest g controller modules/your-module
npx nest g service modules/your-module

# Create DTO folder
mkdir src/modules/your-module/dto
```

#### Module Structure
```
modules/your-module/
├── dto/
│   └── your-module.dto.ts      # Request/Response DTOs
├── your-module.controller.ts    # HTTP endpoints
├── your-module.service.ts       # Business logic
├── your-module.module.ts        # Module definition
└── index.ts                     # Barrel exports
```

#### Adding API Endpoints

1. **Create DTOs** with validation decorators:
   ```typescript
   // dto/create-item.dto.ts
   import { ApiProperty } from '@nestjs/swagger';
   import { IsString, IsInt, Min } from 'class-validator';

   export class CreateItemDto {
     @ApiProperty({ example: 'Item Name' })
     @IsString()
     name: string;

     @ApiProperty({ example: 100 })
     @IsInt()
     @Min(0)
     price: number;
   }
   ```

2. **Add service methods**:
   ```typescript
   // your-module.service.ts
   @Injectable()
   export class YourModuleService {
     constructor(private prisma: PrismaService) {}

     async create(dto: CreateItemDto) {
       return this.prisma.item.create({ data: dto });
     }
   }
   ```

3. **Add controller routes** with Swagger decorators:
   ```typescript
   // your-module.controller.ts
   @ApiTags('Items')
   @Controller({ path: 'items', version: '1' })
   export class YourModuleController {
     @Post()
     @UseGuards(JwtAuthGuard)
     @ApiBearerAuth()
     @ApiOperation({ summary: 'Create item' })
     @ApiResponse({ status: 201, description: 'Item created' })
     async create(@Body() dto: CreateItemDto) {
       return this.service.create(dto);
     }
   }
   ```

#### Database Changes

```bash
# 1. Modify prisma/schema.prisma

# 2. Create and apply migration
npm run db:migrate

# 3. Regenerate Prisma client
npm run db:generate

# 4. (Optional) View in Prisma Studio
npm run db:studio
```

### Frontend Development

#### Adding a New Page

1. Create page file:
   ```
   src/app/your-route/page.tsx
   ```

2. Add API calls to `src/lib/api.ts`:
   ```typescript
   export const itemsApi = {
     getAll: () => api.get('/items'),
     create: (data: CreateItemDto) => api.post('/items', data),
   };
   ```

3. Create page component:
   ```typescript
   'use client';

   import { useQuery } from '@tanstack/react-query';
   import { itemsApi } from '@/lib/api';

   export default function ItemsPage() {
     const { data, isLoading } = useQuery({
       queryKey: ['items'],
       queryFn: () => itemsApi.getAll(),
     });

     if (isLoading) return <div>Loading...</div>;

     return <div>{/* Render items */}</div>;
   }
   ```

#### State Management with Zustand

```typescript
// src/store/items.ts
import { create } from 'zustand';

interface ItemsStore {
  items: Item[];
  selectedItem: Item | null;
  setItems: (items: Item[]) => void;
  selectItem: (item: Item) => void;
}

export const useItemsStore = create<ItemsStore>((set) => ({
  items: [],
  selectedItem: null,
  setItems: (items) => set({ items }),
  selectItem: (item) => set({ selectedItem: item }),
}));
```

### Testing

```bash
# Backend unit tests
cd apps/backend
npm run test

# Backend E2E tests
npm run test:e2e

# Test coverage
npm run test:cov

# Watch mode
npm run test:watch
```

---

## API Documentation

### Base URLs
| Environment | URL |
|-------------|-----|
| Development | `http://localhost:3002/api/v1` |
| Production | `https://api.yourdomain.com/api/v1` |

### Swagger UI
Access interactive API docs at: `http://localhost:3002/api/docs`

### Authentication

All protected endpoints require Bearer token:
```
Authorization: Bearer <access_token>
```

### Core Endpoints

#### Authentication
| Method | Endpoint | Description | Auth |
|--------|----------|-------------|------|
| POST | `/auth/register` | User registration | No |
| POST | `/auth/login` | User login | No |
| POST | `/auth/refresh` | Refresh access token | No |
| POST | `/auth/logout` | Logout user | Yes |
| GET | `/auth/me` | Get current user | Yes |
| GET | `/auth/google` | Google OAuth redirect | No |

#### Users & Profile
| Method | Endpoint | Description | Auth |
|--------|----------|-------------|------|
| GET | `/users/me` | Get current user | Yes |
| PUT | `/users/me` | Update user | Yes |
| GET | `/users/me/profile` | Get user profile | Yes |
| PUT | `/users/me/profile` | Update profile | Yes |

#### Content
| Method | Endpoint | Description | Auth |
|--------|----------|-------------|------|
| POST | `/content/generate` | Generate AI content | Yes |
| GET | `/content` | List user content | Yes |
| GET | `/content/:id` | Get content details | Yes |
| PUT | `/content/:id` | Update content | Yes |
| DELETE | `/content/:id` | Delete content | Yes |
| POST | `/content/:id/schedule` | Schedule content | Yes |

#### Publishing
| Method | Endpoint | Description | Auth |
|--------|----------|-------------|------|
| POST | `/publishing/:contentId/publish` | Publish content | Yes |
| GET | `/publishing/history` | Get publishing history | Yes |

#### Platforms
| Method | Endpoint | Description | Auth |
|--------|----------|-------------|------|
| GET | `/platforms` | List connected platforms | Yes |
| GET | `/platforms/oauth/meta` | Meta OAuth URL | Yes |
| DELETE | `/platforms/:id` | Disconnect platform | Yes |

#### Subscriptions
| Method | Endpoint | Description | Auth |
|--------|----------|-------------|------|
| GET | `/subscriptions` | Current subscription | Yes |
| GET | `/subscriptions/credits` | Credit balance | Yes |
| GET | `/subscriptions/credits/history` | Credit history | Yes |

#### Payments
| Method | Endpoint | Description | Auth |
|--------|----------|-------------|------|
| GET | `/payments/plans` | List available plans | No |
| POST | `/payments/create-order` | Create payment order | Yes |
| POST | `/payments/verify` | Verify payment | Yes |
| GET | `/payments/history` | Payment history | Yes |
| POST | `/payments/subscriptions/create` | Create recurring subscription | Yes |
| POST | `/payments/subscriptions/cancel` | Cancel subscription | Yes |
| POST | `/payments/webhook` | Razorpay webhook | No |

### Admin Endpoints (Requires ADMIN role)

| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/admin/stats` | Dashboard statistics |
| GET | `/admin/users` | List all users |
| GET | `/admin/users/:id` | Get user details |
| PUT | `/admin/users/:id` | Update user (status, role) |
| DELETE | `/admin/users/:id` | Delete user |
| GET | `/admin/plans` | List subscription plans |
| POST | `/admin/plans` | Create plan |
| PUT | `/admin/plans/:id` | Update plan |
| DELETE | `/admin/plans/:id` | Delete plan |
| POST | `/admin/plans/seed` | Seed default plans |
| GET | `/admin/credentials` | List API credentials |
| POST | `/admin/credentials` | Create credential |
| PUT | `/admin/credentials/:key` | Update credential |
| DELETE | `/admin/credentials/:key` | Delete credential |
| GET | `/admin/payments` | Payment history (all users) |
| GET | `/admin/audit-logs` | Audit log history |

---

## Database

### Schema Overview

```
┌─────────────────┐     ┌─────────────────┐     ┌─────────────────┐
│     User        │     │  Subscription   │     │SubscriptionPlan │
├─────────────────┤     ├─────────────────┤     ├─────────────────┤
│ id              │◄────│ userId          │     │ id              │
│ email           │     │ tier ───────────│────►│ name            │
│ name            │     │ status          │     │ displayName     │
│ role            │     │ creditsRemaining│     │ monthlyPrice    │
│ status          │     │ billingCycle    │     │ yearlyPrice     │
│ mfaEnabled      │     │ razorpaySubId   │     │ yearlyDiscount  │
└─────────────────┘     └─────────────────┘     │ credits         │
        │                                        │ features (JSON) │
        │                                        │ razorpayPlanIds │
        ▼                                        └─────────────────┘
┌─────────────────┐     ┌─────────────────┐     ┌─────────────────┐
│    Content      │     │PlatformConnection│     │    Payment      │
├─────────────────┤     ├─────────────────┤     ├─────────────────┤
│ id              │     │ id              │     │ id              │
│ userId          │     │ userId          │     │ userId          │
│ type            │     │ platform        │     │ razorpayOrderId │
│ status          │     │ accessToken     │     │ razorpayPaymentId│
│ caption/body    │     │ status          │     │ amount          │
│ scheduledAt     │     │ tokenExpiry     │     │ status          │
│ publishedAt     │     │ scopes          │     │ planId          │
└─────────────────┘     └─────────────────┘     └─────────────────┘
        │
        ▼
┌─────────────────┐     ┌─────────────────┐     ┌─────────────────┐
│ContentAnalytics │     │ ApiCredential   │     │   AuditLog      │
├─────────────────┤     ├─────────────────┤     ├─────────────────┤
│ contentId       │     │ key             │     │ userId          │
│ impressions     │     │ value (encrypted)│    │ action          │
│ likes           │     │ category        │     │ entityType      │
│ comments        │     │ isActive        │     │ oldValue/newValue│
│ engagement      │     │ description     │     │ ipAddress       │
└─────────────────┘     └─────────────────┘     └─────────────────┘
```

### Common Database Commands

```bash
# Generate Prisma client after schema changes
npm run db:generate

# Create and apply migration
npm run db:migrate

# Deploy migrations (production)
cd apps/backend && npx prisma migrate deploy

# Reset database (development only!)
cd apps/backend && npx prisma migrate reset

# Open Prisma Studio
npm run db:studio
```

---

## Authentication

### JWT Token Flow

1. User logs in with email/password → Server returns `accessToken` (15 min) + `refreshToken` (7 days)
2. Client stores tokens in localStorage
3. Client sends `Authorization: Bearer <accessToken>` with requests
4. On 401, client uses refresh token to get new access token
5. Refresh token is rotated on each use

### Role-Based Access Control

| Role | Access Level |
|------|--------------|
| `USER` | User dashboard, content management, subscriptions |
| `ADMIN` | All USER access + Admin panel (user management, plans, credentials) |

### OAuth Providers

- **Google OAuth 2.0**: Login and YouTube integration
- **Meta OAuth**: Facebook and Instagram publishing

---

## Payment Integration

### Razorpay Setup (Primary for India)

#### 1. One-time Payments

```javascript
// Frontend: Create order
const { data } = await api.post('/payments/create-order', {
  plan: 'PROFESSIONAL',
  billingCycle: 'MONTHLY'
});

// Frontend: Open Razorpay checkout
const razorpay = new Razorpay({
  key: data.razorpayKeyId,
  order_id: data.razorpayOrderId,
  amount: data.amount,
  handler: async (response) => {
    // Verify payment
    await api.post('/payments/verify', {
      razorpay_order_id: response.razorpay_order_id,
      razorpay_payment_id: response.razorpay_payment_id,
      razorpay_signature: response.razorpay_signature
    });
  }
});
razorpay.open();
```

#### 2. Recurring Subscriptions (Auto-debit)

**Admin Setup:**
1. Create subscription plan in admin panel
2. Click "Setup" button for Monthly/Yearly to create Razorpay plan

**User Subscription:**
```javascript
// Create recurring subscription
const { data } = await api.post('/payments/subscriptions/create', {
  planId: 'PROFESSIONAL',
  billingCycle: 'MONTHLY'
});

// Redirect user to authorize
window.location.href = data.shortUrl;
```

### Webhook Configuration

Add to Razorpay Dashboard → Webhooks:
```
URL: https://api.yourdomain.com/api/v1/payments/webhook
Secret: <your-webhook-secret>

Events to enable:
- payment.captured
- payment.failed
- refund.created
- subscription.authenticated
- subscription.activated
- subscription.charged
- subscription.pending
- subscription.halted
- subscription.cancelled
```

---

## DevOps & Deployment

### Development Ports

| Service | Port | URL |
|---------|------|-----|
| Frontend | 3000 | http://localhost:3000 |
| Admin | 3001 | http://localhost:3001 |
| Backend | 3002 | http://localhost:3002 |
| Prisma Studio | 5555 | http://localhost:5555 |

### Option 1: Docker Deployment

#### Dockerfile.backend
```dockerfile
FROM node:18-alpine AS builder
WORKDIR /app
COPY package*.json ./
COPY apps/backend/package*.json ./apps/backend/
RUN npm ci --workspace=apps/backend
COPY apps/backend ./apps/backend
WORKDIR /app/apps/backend
RUN npm run build
RUN npx prisma generate

FROM node:18-alpine
WORKDIR /app
COPY --from=builder /app/apps/backend/dist ./dist
COPY --from=builder /app/apps/backend/prisma ./prisma
COPY --from=builder /app/node_modules ./node_modules
EXPOSE 3002
CMD ["node", "dist/main"]
```

#### Dockerfile.frontend
```dockerfile
FROM node:18-alpine AS builder
WORKDIR /app
COPY package*.json ./
COPY apps/frontend/package*.json ./apps/frontend/
RUN npm ci --workspace=apps/frontend
COPY apps/frontend ./apps/frontend
WORKDIR /app/apps/frontend
RUN npm run build

FROM node:18-alpine
WORKDIR /app
COPY --from=builder /app/apps/frontend/.next/standalone ./
COPY --from=builder /app/apps/frontend/.next/static ./.next/static
COPY --from=builder /app/apps/frontend/public ./public
EXPOSE 3000
CMD ["node", "server.js"]
```

#### docker-compose.yml
```yaml
version: '3.8'
services:
  backend:
    build:
      context: .
      dockerfile: Dockerfile.backend
    ports:
      - "3002:3002"
    environment:
      - DATABASE_URL=postgresql://jasper:jasper@db:5432/jasper
      - JWT_SECRET=${JWT_SECRET}
      - NODE_ENV=production
    depends_on:
      - db
      - redis

  frontend:
    build:
      context: .
      dockerfile: Dockerfile.frontend
    ports:
      - "3000:3000"
    environment:
      - NEXT_PUBLIC_API_URL=http://localhost:3002

  admin:
    build:
      context: .
      dockerfile: Dockerfile.admin
    ports:
      - "3001:3001"
    environment:
      - NEXT_PUBLIC_API_URL=http://localhost:3002

  db:
    image: postgres:15-alpine
    volumes:
      - postgres_data:/var/lib/postgresql/data
    environment:
      - POSTGRES_USER=jasper
      - POSTGRES_PASSWORD=jasper
      - POSTGRES_DB=jasper
    ports:
      - "5432:5432"

  redis:
    image: redis:7-alpine
    volumes:
      - redis_data:/data
    ports:
      - "6379:6379"

volumes:
  postgres_data:
  redis_data:
```

### Option 2: Cloud Deployment

#### Recommended: Vercel + Railway

1. **Frontend & Admin → Vercel**
   ```bash
   # Install Vercel CLI
   npm i -g vercel

   # Deploy frontend
   cd apps/frontend && vercel

   # Deploy admin
   cd apps/admin && vercel
   ```

2. **Backend → Railway**
   ```bash
   # Install Railway CLI
   npm i -g @railway/cli

   # Login and deploy
   railway login
   cd apps/backend
   railway init
   railway up
   ```

3. **Database → Railway PostgreSQL or Supabase**

#### AWS Architecture

```
Route 53 (DNS)
    │
CloudFront (CDN + SSL)
    │
Application Load Balancer
    │
    ├── ECS Fargate (Frontend)
    ├── ECS Fargate (Admin)
    └── ECS Fargate (Backend)
            │
            ├── RDS PostgreSQL
            ├── ElastiCache Redis
            └── Secrets Manager
```

### CI/CD with GitHub Actions

```yaml
# .github/workflows/deploy.yml
name: Deploy

on:
  push:
    branches: [main]

jobs:
  test:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - uses: actions/setup-node@v4
        with:
          node-version: '18'
          cache: 'npm'
      - run: npm ci
      - run: npm run lint
      - run: npm run test

  deploy-backend:
    needs: test
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - name: Deploy to Railway
        uses: railwayapp/railway-action@v1
        with:
          service: backend
        env:
          RAILWAY_TOKEN: ${{ secrets.RAILWAY_TOKEN }}

  deploy-frontend:
    needs: test
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - uses: amondnet/vercel-action@v25
        with:
          vercel-token: ${{ secrets.VERCEL_TOKEN }}
          vercel-org-id: ${{ secrets.VERCEL_ORG_ID }}
          vercel-project-id: ${{ secrets.VERCEL_PROJECT_ID }}
          working-directory: ./apps/frontend
```

### Production Checklist

#### Security
- [ ] Change all default secrets (`JWT_SECRET`, `ENCRYPTION_KEY`)
- [ ] Enable HTTPS everywhere
- [ ] Configure CORS with specific origins
- [ ] Enable rate limiting (configured in NestJS Throttler)
- [ ] Review Helmet security headers
- [ ] Secure cookie settings for refresh tokens

#### Database
- [ ] Migrate from SQLite to PostgreSQL
- [ ] Configure connection pooling
- [ ] Set up automated backups
- [ ] Run `npx prisma migrate deploy`

#### Monitoring
- [ ] Set up error tracking (Sentry, Bugsnag)
- [ ] Configure application logging
- [ ] Set up health check endpoints
- [ ] Configure uptime monitoring

#### Performance
- [ ] Enable Redis caching for credentials
- [ ] Configure CDN for static assets
- [ ] Enable gzip/brotli compression
- [ ] Set up auto-scaling

#### Payments
- [ ] Switch to production Razorpay keys
- [ ] Configure webhook URL in Razorpay dashboard
- [ ] Test all payment flows
- [ ] Set up subscription plans in admin

---

## Environment Variables

### Backend (`apps/backend/.env`)

```bash
# ============================================
# Application
# ============================================
NODE_ENV=production
PORT=3002
APP_URL=https://api.yourdomain.com
FRONTEND_URL=https://yourdomain.com
CORS_ORIGINS=https://yourdomain.com,https://admin.yourdomain.com

# ============================================
# Database
# ============================================
# Development (SQLite)
DATABASE_URL=file:./dev.db

# Production (PostgreSQL)
DATABASE_URL=postgresql://user:password@host:5432/database?schema=public

# ============================================
# JWT Authentication
# ============================================
JWT_SECRET=your-super-secret-jwt-key-minimum-32-characters-long
JWT_EXPIRES_IN=15m
REFRESH_TOKEN_DAYS=7

# ============================================
# Google OAuth
# ============================================
GOOGLE_CLIENT_ID=your-google-client-id.apps.googleusercontent.com
GOOGLE_CLIENT_SECRET=your-google-client-secret
GOOGLE_CALLBACK_URL=https://api.yourdomain.com/api/v1/auth/google/callback

# ============================================
# Meta (Facebook/Instagram)
# ============================================
META_APP_ID=your-meta-app-id
META_APP_SECRET=your-meta-app-secret

# ============================================
# WordPress
# ============================================
WORDPRESS_CLIENT_ID=your-wordpress-client-id
WORDPRESS_CLIENT_SECRET=your-wordpress-client-secret

# ============================================
# Jasper AI
# ============================================
JASPER_API_KEY=your-jasper-api-key
JASPER_API_URL=https://api.jasper.ai/v1

# ============================================
# Razorpay (Payments)
# ============================================
RAZORPAY_KEY_ID=rzp_live_xxxxxxxxxxxx
RAZORPAY_KEY_SECRET=your-razorpay-secret
RAZORPAY_WEBHOOK_SECRET=your-webhook-secret

# ============================================
# Stripe (Optional - Global payments)
# ============================================
STRIPE_SECRET_KEY=sk_live_xxxxxxxxxxxx
STRIPE_WEBHOOK_SECRET=whsec_xxxxxxxxxxxx
STRIPE_PUBLISHABLE_KEY=pk_live_xxxxxxxxxxxx

# ============================================
# Redis (Optional - Caching)
# ============================================
REDIS_URL=redis://localhost:6379

# ============================================
# Encryption (for stored credentials)
# ============================================
# Generate with: node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"
ENCRYPTION_KEY=your-32-byte-hex-encryption-key
```

### Frontend (`apps/frontend/.env.local`)

```bash
NEXT_PUBLIC_API_URL=https://api.yourdomain.com
NEXT_PUBLIC_APP_URL=https://yourdomain.com
NEXT_PUBLIC_RAZORPAY_KEY_ID=rzp_live_xxxxxxxxxxxx
```

### Admin (`apps/admin/.env.local`)

```bash
NEXT_PUBLIC_API_URL=https://api.yourdomain.com
```

---

## Troubleshooting

### Common Issues

#### Port Already in Use

**Windows (PowerShell):**
```powershell
# Use the provided script
.\kill-ports.ps1

# Or manually
netstat -ano | findstr :3002
taskkill /PID <PID> /F
```

**Linux/Mac:**
```bash
lsof -i :3002
kill -9 <PID>
```

#### Prisma Client Generation Failed
```bash
# Stop all running servers first, then:
cd apps/backend
npx prisma generate --schema=prisma/schema.prisma
```

#### Database Connection Issues
```bash
# Verify DATABASE_URL is set correctly
echo $DATABASE_URL

# Test connection
cd apps/backend
npx prisma db pull

# Reset if needed (dev only!)
npx prisma migrate reset
```

#### CORS Errors
1. Check `CORS_ORIGINS` in backend `.env` includes your frontend URL
2. Ensure no trailing slash in URLs
3. Check browser console for specific blocked origin

#### JWT Token Issues
- Verify `JWT_SECRET` is set and consistent across restarts
- Check token expiration (`JWT_EXPIRES_IN`)
- Ensure clocks are synchronized (important for containerized apps)

### Useful Commands

```bash
# Check backend health
curl http://localhost:3002/api/v1/health

# View backend logs in development
npm run dev:backend

# View Prisma query logs (add to .env)
DEBUG=prisma:query

# Database introspection
cd apps/backend
npx prisma db pull
```

### Getting Help

- **Documentation**: Check this README and inline code comments
- **API Docs**: http://localhost:3002/api/docs (Swagger)
- **Prisma Studio**: `npm run db:studio`
- **GitHub Issues**: Report bugs and feature requests

---

## Credit Costs

| Content Type | Credits |
|--------------|---------|
| Instagram Image Post | 5 |
| Instagram Carousel | 8 |
| Instagram Video/Reel | 15 |
| Facebook Image Post | 5 |
| Facebook Video Post | 15 |
| Blog Post (500 words) | 10 |
| Blog Post (1000+ words) | 20 |
| Ad Campaign Creation | 25 |

## Default Subscription Plans

| Plan | Monthly Price | Yearly Price | Credits | Discount |
|------|---------------|--------------|---------|----------|
| Starter | Free | Free | 100 | - |
| Professional | Rs 999 | Rs 9,590 | 500 | 20% |
| Business | Rs 2,999 | Rs 28,790 | 2,000 | 20% |
| Enterprise | Rs 9,999 | Rs 95,990 | 10,000 | 20% |

---

## License

This project is proprietary software. All rights reserved.

---

## Contributing

1. Fork the repository
2. Create your feature branch (`git checkout -b feature/amazing-feature`)
3. Commit your changes using conventional commits
4. Push to the branch (`git push origin feature/amazing-feature`)
5. Open a Pull Request

---

*Last updated: February 2026*
