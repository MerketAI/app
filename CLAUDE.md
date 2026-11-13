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

> **The migration history is unusable.** `prisma/migrations/` was authored for
> SQLite (`migration_lock.toml` says `sqlite`, the SQL uses `REAL` and inline
> `PRIMARY KEY`) while the datasource is PostgreSQL, so `prisma migrate deploy`
> fails with P3019. Schema changes therefore go through `prisma db push`.
> `prisma/manual/` holds hand-written Postgres SQL for applying changes to an
> existing database. Worth fixing with a fresh Postgres baseline.
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
| `partner` | **B2B partner auth** (APP_KEY/APP_SECRET/APP_UID), subscriber provisioning |
| `scheduler` | Cron jobs: scheduled publishing, analytics sync, trends refresh |
| `ads` | Google Ads + Meta Ads campaign management |
| `analytics` | Engagement metrics + GA4 |
| `business` | Business profile, products, services, competitors, audiences |
| `ai-scraper` | Multi-provider competitor research (Perplexity, Serper, OpenAI, Firecrawl) |
| `design` | AI flyer/banner generation (Claude HTML -> Puppeteer -> R2) |
| `assets` | Free vector icons (Iconify), generated decorative SVG, stock photo search |
| `trends` | Google Trends via SerpAPI, geo-scoped |
| `leads` | Lead management / CRM |
| `email` | Email marketing campaigns and sequences |
| `video` | Video generation (HeyGen, Runway) |
| `upload` | Cloudflare R2 object storage |

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

Jasper is a **B2B product**: it is sold to partner platforms, which call the API
on behalf of their own subscribers. Two auth styles share the same routes.

**Partner platforms (server-to-server)** - `HybridAuthGuard`
1. `X-App-Key` + `X-App-Secret` identify and authenticate the platform
2. `X-App-Uid` selects which of that platform's subscribers the call is for
3. Unknown `APP_UID` is provisioned automatically (user + profile + subscription)
4. `request.user.id` is set to the resolved internal user
5. See `docs/PARTNER_API.md`

**Dashboard (first-party UI)** - `HybridAuthGuard` falls through to JWT
1. JWT access token (15min) + refresh token (7 days), stored in localStorage
2. `AdminGuard` checks the ADMIN role for `/admin/*`
3. `@CurrentUser()` extracts the user from the request either way

Because both paths populate `request.user`, controllers are unaware of which was
used. `@CurrentApp()` exposes the partner app where it matters.

Note: `request.partnerApp` - **not** `request.app`, which Express reserves for
the application instance.

### Credit System
Content generation deducts credits from `Subscription.creditsRemaining`. Costs defined in `subscriptions.service.ts` (5-25 credits per content type).

### Credential Encryption
`CredentialsService` uses AES-256-GCM encryption. Credentials fall back to environment variables if not in database.

### Workspace AI Generation
`ai-page.service.ts` calls Anthropic Claude API to generate HTML/Tailwind pages from prompts.

### Design Generation
`design.service.ts` asks Claude for a self-contained HTML/CSS document, which
`renderer.service.ts` screenshots with Puppeteer and `upload.service.ts` stores
in R2. There is **no image-generation model** anywhere in this project - designs
are rendered HTML, not diffusion output. `POST /designs/:id/export` returns the
public URL to pass as `mediaUrls` when creating content.

### JSON array columns
Postgres columns such as `mediaUrls`, `hashtags`, `seoKeywords` and `scopes` hold
**JSON-encoded strings**, not arrays. Prisma returns them as strings, so decode
with `parseJsonArray` / `parseJsonObject` from `common/utils/json-field.util.ts`
before using them. Treating them as arrays silently misbehaves: `"[]"` has
`.length === 2`, and `.map` does not exist on a string.

### Mock data fallbacks
The ads and GA4 integrations return synthesised data when credentials are
missing. Every such record carries `isMockData`, and responses are wrapped by
`withDataSource()` from `common/utils/data-source.util.ts` so callers can tell
real numbers from placeholders. Never surface these figures unlabelled.

### Estimated vs observed competitor ads
`BusinessCompetitor.adPlatforms` / `adStrategies` / `adBudgetEstimate` are
**AI-estimated**. `observedAds` is **factual**, pulled from the Meta Ad Library
and Google Ads Transparency Center by `competitor-ads.service.ts`. Keep them
distinct - coverage is partial and the service returns `coverageNotes` saying so.

### Design asset layer
`assets/` supplies the visual furniture for generated designs:

- **Icons** from the Iconify public API (no key). Only the permissive sets in
  `ALLOWED_ICON_SETS` are ever fetched - Iconify serves 150+ sets under varying
  licences, and shipping the wrong one into a customer's printed flyer is a real
  problem. SVG is inlined into the design HTML, so stored designs are
  self-contained and a slow Iconify cannot stall a print render.
- **`CONCEPT_ICONS`** is a closed vocabulary (concept -> verified icon id). An
  LLM asked to name an icon will invent ids that 404; it picks from this instead.
  Every id is checked by `scripts/verify-icons.py`.
- **Decorative SVG** (waves, blobs, dot grids, gradient washes) is *generated*
  in `decorative.service.ts`, not fetched: no dependency, no licence question,
  and seeded so a brand's shapes never shift between regenerations.
- **Stock photos** via Pexels/Pixabay are optional. `PhotoService` attaches a
  model-release warning when a query looks like it wants a photograph of a
  person - those licences permit commercial use but convey no endorsement right.

### Template system
`design/templates/` replaced the single hardcoded layout:

- **`tokens.ts`** - one brand hex derives the whole palette via HSL, plus five
  typography pairs selected by industry. Templates ask for roles (`accent`,
  `onAccentEmphasis`, `onSurfaceMuted`), never literal colours.
- **`shapes.ts`** - cloud/arc/diagonal masks, blobs, cloud badges, ribbons,
  confetti. Generated and seeded per brand, so no licence question and no drift.
- **`typography.ts`** - multi-colour headline runs. `renderHeadline` takes the
  **surface** it sits on: mapping the "accent" role onto an accent-coloured page
  paints text in the background colour and it vanishes.
- **`registry.ts`** - archetype selection. A photo-led template wins whenever a
  photo is available.

Every `TemplateDefinition` declares `surface`, and `design.service` picks icon
colours from it. Two rules learned the hard way: a template must look right with
**sparse** data (optional sections absent leaves a void otherwise), and any mark
placed on the accent background needs a contrasting token, not an analogous one.

### Photo layer
`photo-ingest.service.ts` copies third-party photography into our own storage
before use - hotlinking a stock CDN breaks renders when the remote rotates, and
both Pexels and Pixabay ask you not to. Re-encodes, crops to the slot with
`sharp`'s attention strategy (a centre crop decapitates portraits), stores
content-addressed.

It refuses non-public hosts. Without that the endpoint is an SSRF primitive -
a caller could point it at cloud metadata and have the server fetch it.

`cutout.service.ts` produces transparent practitioner cutouts. remove.bg is
implemented; local ONNX removers load dynamically because their licensing is not
uniform. Never feed a stock photo of a person through this - those licences
carry no model release.

### Artwork generation
`image-generation.service.ts` produces the illustrated layer of a design
(OpenAI `gpt-image-1` or Gemini `gemini-2.5-flash-image`). Two rules are
enforced in code, not left to prompt discipline:

1. **The model never draws text.** Copy and contact details are composited as
   HTML over the artwork, so they stay exact and editable. The prompt carries an
   explicit, repeated negative clause.
2. **The model never depicts a named real person.** `sanitiseSubject()` strips
   titles+names ("Dr. Mohit Gupta" -> "a doctor") and returns what it removed,
   because generating a likeness of a real practitioner and presenting it as
   them is deceptive. Use their real photograph instead.

Artwork is content-addressed: the key is a hash of provider+aspect+prompt, so an
identical brief reuses the stored image and is **not** charged again. Use
`POST /assets/artwork/preview-prompt` to tune prompts for free.

Pass the resulting URL as `businessContext.heroImageUrl` to composite it into a
flyer header.

### Post renderer (`packages/post-renderer`)
Three templates ship: `clinic-profile-01` (A4 practice profile),
`photo-hero-01` (photo-led social post) and `event-notice-01` (camps, awareness
days, offers). The third exists because the first two left a hole the Art
Director walked straight into - with no photograph supplied, its only option
was an A4 flyer, which is not a social post. A test asserts that gap stays
closed.

The template system for generated posts and flyers, shared by the live preview
and the Puppeteer export so there is exactly one implementation of a layout.
Templates are **versioned JSON validated against an allow-list** before use -
no raw HTML, no `url()`, no arbitrary CSS - and protected facts (doctor name,
clinic name, phone, email, website, address, registration number) are injected
from the verified profile *after* generation. A model may choose whether such a
field is shown; it never supplies the value.

`npm test` is the fast suite. `npm run test:browser` launches Chrome and checks
the things only a browser can answer: that nothing clips across a stress matrix
(long addresses, long names, sparse profiles, Hindi and English), that the
preview and export are pixel-identical, and that identical inputs render
identically. Two cases are deliberately unfittable controls - without them a
report that always said "fits" would pass everything else. Re-record baselines
with `JASPER_UPDATE_BASELINES=1`. See the package README.

The live preview is the **Template studio** (`/dashboard/designs/studio`). It
mounts the shared `composePost` inside an iframe with `postDocumentStyles` and
runs the same fit script the export inlines, so what it shows is what the PNG
will be - the package's parity test asserts the two are pixel-identical. The
iframe is load-bearing: those styles are document-scoped, and the fit pass
measures a document.

Auto-fit shrinks; it never grows text past the size the template was designed
at. A zone reported at `scale=0` fitted only because it ran out of room to
shrink - that is a design problem, not a pass. Colours for icons and headline
emphasis come from the surface a mark lands on (`iconPaintPlan`, `emphasisOn`),
never from the template's general mood - that is how accent marks end up
invisible on an accent field, and warm emphasis unreadable on a white page.

### Art Director (`design/art-director.service.ts`, `/post-designs`)
The model that fills the templates above. It directs the design system rather
than drawing: it picks a layout from the catalogue and writes the copy, and
produces no HTML, CSS, colour, coordinate or font size.

`art-direction.ts` is the trust boundary and is deliberately pure, so it can be
tested exhaustively without an API key, a database or a browser. A value for
any slot whose `source` is not `campaign` is **discarded without being read** -
it does not matter whether the model's phone number happens to be right, it is
not the model's to supply. Invented icon concepts are dropped (the label
stands alone), over-long lists are trimmed, over-long copy is kept because the
fit pass can shrink it, and everything dropped is reported in `corrections[]`.
A plan that cannot proceed gets exactly one corrected retry.

Templates whose required *asset* slots cannot be satisfied are filtered out
before the model is called - offering a photo-led layout with no photograph
guarantees a wasted call and then a failed render.

`POST /post-designs/plan` returns the plan without rendering, so a caller can
iterate cheaply and send it back as `direction` to `/render` without paying for
the model twice.

### Stack repacking
Absolute zones are what give these layouts their composition, and also why an
omitted section leaves a hole: nothing reflows into the gap. Zones sharing a
`stack` name are repacked against their **measured content** after the fit pass
- not `scrollHeight`, which never reports less than the box. Repacking only
ever moves a zone *up*, so content that could not be shrunk can never push the
next zone down into a pinned footer.

A stack's envelope comes from the template, never from the DOM: a zone with no
content is not rendered at all, so measuring from what survived collapses the
envelope to those members and `stackAlign: "center"` would centre a lone
headline inside its own box rather than in the space the layout set aside.
Centring suits a stack pinned between a masthead and a footer; a document's
masthead belongs at the top of the page, so the A4 profile stays `start`.

Note what this means for the tests: the overflow suite detects too much content
and is blind to too little. `a4-sparse` passed every assertion while two-thirds
empty.

### Layout auto-fit
Fixed-size pages plus tenant-supplied copy means overflow is inevitable.
Templates expose `window.__fitDesign()`, which `renderer.service.ts` calls
*after* `document.fonts.ready` (text metrics are not final before then). It
shrinks the body until it fits, so a long address or service name can never push
the call-to-action or contact block off the page. Do not hand-tune spacing to
fix overflow - extend the fit hook.

### Background jobs
`scheduler.service.ts` owns everything time-based: scheduled publishing (every
minute), analytics sync (30 min), trends refresh (6h), connection-expiry flagging
(hourly), plus pruning. Jobs are in-process and guarded against overlap; set
`JASPER_SCHEDULER_ENABLED=false` on all but one replica. Scheduled rows are
claimed with a conditional update, so two runs cannot double-publish.

## Environment Variables

Backend requires `.env` with:
- `DATABASE_URL` - Prisma connection (**PostgreSQL**; the project uses Supabase)
- `DIRECT_URL` - Non-pooled Postgres URL, required by Prisma for migrations
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
