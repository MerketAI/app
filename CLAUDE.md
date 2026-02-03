# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

Jasper is an AI-powered marketing automation platform with a monorepo structure containing three Next.js/NestJS applications that share a common backend API.

## Commands

### Development
```bash
npm run dev:all          # Start all 3 apps (frontend:3000, admin:3001, backend:3002)
npm run dev:backend      # Backend only
npm run dev:frontend     # Frontend only
npm run dev:admin        # Admin only
```

### Database (Prisma)
```bash
npm run db:generate      # Generate Prisma client after schema changes
npm run db:migrate       # Run migrations
npm run db:studio        # Open Prisma Studio at localhost:5555
```

### Build & Lint
```bash
npm run build            # Build all workspaces
npm run lint             # Lint all workspaces
```

### Backend Testing
```bash
cd apps/backend
npm run test             # Run unit tests
npm run test:watch       # Watch mode
npm run test:cov         # Coverage report
npm run test:e2e         # E2E tests
```

## Architecture

### Monorepo Structure
- **apps/frontend** (Port 3000) - User dashboard, content creation, workspace/page builder
- **apps/admin** (Port 3001) - Admin panel for user management, plans, credentials
- **apps/backend** (Port 3002) - NestJS REST API serving both frontends

All three apps communicate through the backend API. Frontend and Admin share the same API endpoints but Admin requires `ADMIN` role for `/admin/*` routes.

### Backend Module Organization (`apps/backend/src/modules/`)
| Module | Purpose |
|--------|---------|
| `auth` | JWT authentication, OAuth (Google), registration/login |
| `users` | User profile management |
| `subscriptions` | Credit-based subscription tiers, billing cycles |
| `content` | AI content generation via Jasper API, CRUD operations |
| `workspace` | Page builder with AI generation via Anthropic Claude |
| `credentials` | Encrypted API key storage (AES-256-GCM) |
| `razorpay` | Payment processing, webhooks, recurring subscriptions |
| `admin` | User management, plan CRUD, audit logs (requires ADMIN role) |
| `platforms` | OAuth connections for Meta, Google, WordPress |
| `publishing` | Multi-platform content publishing |

### Database Schema (`apps/backend/prisma/schema.prisma`)
Key relationships:
- `User` → `Subscription` (1:1) - Every user has one subscription with credits
- `User` → `Workspace` (1:1) → `WorkspacePage`, `WorkspacePost`, `WorkspaceMenu`
- `User` → `Content` → `ContentMedia`, `ContentAnalytics`
- `User` → `PlatformConnection` - OAuth tokens for social platforms
- `ApiCredential` - Encrypted storage for external API keys (Jasper, Anthropic, Meta, etc.)

### Frontend Component Pattern (`apps/frontend/src/components/ui/`)
Uses shadcn/ui components built on Radix UI primitives. Key components:
- `alert-dialog`, `dialog`, `sheet` - Modal/overlay patterns
- `dropdown-menu`, `select`, `tabs` - Navigation/selection
- `button`, `input`, `textarea`, `switch`, `badge`, `card`, `label`
- Two toast systems: custom `toast.tsx` + `sonner` (both in `providers.tsx`)

### API Client (`apps/frontend/src/lib/api.ts`, `apps/admin/src/lib/api.ts`)
Axios-based clients with:
- Automatic Bearer token injection from localStorage
- 401 interceptor for token refresh
- Grouped API methods: `authApi`, `contentApi`, `workspaceApi`, `pagesApi`, etc.

### State Management
- **Server state**: React Query (`@tanstack/react-query`)
- **Client state**: Zustand stores in `src/store/`

## Key Patterns

### Authentication Flow
1. JWT access token (15min) + refresh token (7 days)
2. Tokens stored in localStorage
3. `JwtAuthGuard` protects routes, `AdminGuard` checks role
4. `@CurrentUser()` decorator extracts user from request

### Credit System
Content generation deducts credits from `Subscription.creditsRemaining`. Costs defined in `subscriptions.service.ts` (5-25 credits per content type).

### Credential Encryption
`CredentialsService` uses AES-256-GCM encryption. Credentials fall back to environment variables if not in database.

### Workspace AI Generation
`ai-page.service.ts` calls Anthropic Claude API to generate HTML/Tailwind pages from prompts.

## Environment Variables

Backend requires `.env` with:
- `DATABASE_URL` - Prisma connection (SQLite for dev: `file:./dev.db`)
- `JWT_SECRET` - Minimum 32 characters
- `CREDENTIALS_ENCRYPTION_KEY` - For API key encryption
- External API keys can be set here or via Admin credentials page

Frontend/Admin require `.env.local` with:
- `NEXT_PUBLIC_API_URL` - Backend URL (default: `http://localhost:3002`)

## Code Style

- TypeScript strict mode
- NestJS modules follow: `module.ts`, `controller.ts`, `service.ts`, `dto/` folder
- Database columns use `snake_case` via Prisma `@map()`
- Frontend pages use Next.js App Router (`src/app/`)
