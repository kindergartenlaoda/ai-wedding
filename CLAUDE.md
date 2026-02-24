# CLAUDE.md

> 变更记录 (Changelog)
> - **2026-02-24T14:27:17** -- 初始化架构扫描：全仓清点 207 个源文件，识别 7 个逻辑模块，生成模块级 CLAUDE.md 与 `.claude/index.json`。补充模块结构图、运行与开发、测试策略、编码规范、AI 使用指引等章节。

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

多领域 AI 图片生成平台 -- A Next.js 14 application for generating AI-powered images across multiple domains (wedding, children, id_photo, artistic, portrait, anime, landscape, product) using OpenAI-compatible image generation APIs, PostgreSQL + Prisma, and NextAuth.

**Tech Stack**: Next.js 14 (App Router) + React 18 + TypeScript + TailwindCSS + PostgreSQL + Prisma + NextAuth + shadcn/ui + Lucide Icons

## Architecture Overview

```
ai-wedding/                 # Next.js 14 monolith (App Router)
+-- app/
|   +-- api/                # 41 API route handlers (server-only)
|   +-- components/         # 72 UI components (page + reusable + admin)
|   +-- hooks/              # 20 custom React hooks
|   +-- lib/                # 32 utility/service modules
|   +-- types/              # 14 TypeScript type definition files
|   +-- contexts/           # React contexts (AuthContext)
|   +-- data/               # Static/mock data
|   +-- shared/             # Shared layout components
|   +-- admin/              # Admin pages (templates, model-configs, announcements)
|   +-- (pages)             # Route pages (page.tsx files)
+-- prisma/                 # Database schema, migrations, seed
+-- scripts/                # DevOps scripts (deploy, db, minio)
+-- middleware.ts            # Optional SSR auth guard
```

## Module Structure Diagram

```mermaid
graph TD
    ROOT["ai-wedding"] --> APP["app/"];
    ROOT --> PRISMA["prisma/"];
    ROOT --> SCRIPTS["scripts/"];
    ROOT --> MW["middleware.ts"];

    APP --> API["api/ (41 routes)"];
    APP --> COMP["components/ (72 files)"];
    APP --> HOOKS["hooks/ (20 hooks)"];
    APP --> LIB["lib/ (32 modules)"];
    APP --> TYPES["types/ (14 files)"];
    APP --> ADMIN["admin/ (5 pages)"];
    APP --> CTX["contexts/"];
    APP --> DATA["data/"];

    API --> API_GEN["generate-image, generate-stream, generate-single"];
    API --> API_AUTH["auth/, profile, invite"];
    API --> API_CRUD["projects, generations, templates, favorites"];
    API --> API_PAY["orders/, credits/"];
    API --> API_ADMIN["admin/ (templates, model-configs, announcements)"];

    COMP --> COMP_PAGE["Page Components (Home, Dashboard, Create...)"];
    COMP --> COMP_UI["ui/ (shadcn/ui primitives)"];
    COMP --> COMP_ADMIN["admin/ (TemplateForm, ModelConfig...)"];
    COMP --> COMP_DASH["Dashboard/ (6 sub-components)"];

    LIB --> LIB_AUTH["auth.ts, auth-api.ts, auth-admin.ts"];
    LIB --> LIB_GEN["generation-service.ts, image-stream.ts"];
    LIB --> LIB_PROMPT["prompt-strategies/ (8 domain strategies)"];
    LIB --> LIB_STORAGE["minio-client.ts, image-compress.ts"];

    click PRISMA "./prisma/CLAUDE.md" "Prisma data layer docs"
    click API "./app/api/CLAUDE.md" "API routes docs"
    click COMP "./app/components/CLAUDE.md" "Components docs"
    click HOOKS "./app/hooks/CLAUDE.md" "Hooks docs"
    click LIB "./app/lib/CLAUDE.md" "Lib/services docs"
    click TYPES "./app/types/CLAUDE.md" "Type definitions docs"
    click ADMIN "./app/admin/CLAUDE.md" "Admin pages docs"
```

## Module Index

| Module | Path | Files | Language | Description |
|--------|------|-------|----------|-------------|
| API Routes | `app/api/` | 41 | TypeScript | Server-side API handlers: image gen, auth, CRUD, payments, admin |
| Components | `app/components/` | 72 | TSX | Page components, reusable UI, admin panels, Dashboard sub-system |
| Hooks | `app/hooks/` | 20 | TypeScript | Custom React hooks for data fetching, state, generation flow |
| Lib/Services | `app/lib/` | 32 | TypeScript | Auth, generation service, prompt strategies, storage, validation |
| Types | `app/types/` | 14 | TypeScript | Shared type definitions (domain, database, generation, etc.) |
| Admin Pages | `app/admin/` | 5 | TSX | Admin UI: template CRUD, model config, announcements |
| Prisma/Data | `prisma/` | 4 | Prisma/SQL/TS | Database schema (13 models), migration, seed |
| Scripts | `scripts/` | 7 | Shell/TS | Deploy, PM2, DB permissions, MinIO fixes |

## Essential Commands

### Development
```bash
pnpm dev          # Start development server (Next.js dev mode)
pnpm build        # Build for production
pnpm start        # Start production server
pnpm lint         # Run ESLint checks
pnpm typecheck    # Run TypeScript type checking (strict mode)
pnpm prisma migrate deploy  # Apply database migrations
pnpm prisma db seed        # Seed initial templates
```

### Operations
```bash
pnpm deploy              # Run deployment script
pnpm pm2:start           # Start via PM2
pnpm pm2:stop            # Stop PM2 process
pnpm pm2:restart         # Restart PM2 process
pnpm pm2:logs            # View PM2 logs
pnpm verify-db           # Verify database permissions
pnpm grant-db-permissions # Grant database permissions
pnpm fix-minio           # Fix MinIO 403 errors
pnpm fix-minio:policy    # Fix MinIO bucket policy
pnpm fix-minio:urls      # Refresh MinIO image URLs
```

**Note**: This project uses `pnpm` as the package manager. Do NOT use `npm` or `yarn`.

## Environment Setup

1. Copy `.env.example` to `.env`
2. Configure required variables:

   **PostgreSQL (Required)**:
   - `DATABASE_URL` - PostgreSQL connection string (e.g., `postgresql://user:password@host:5432/database`)

   **NextAuth (Required)**:
   - `NEXTAUTH_URL` - Application URL (e.g., `http://localhost:3000`)
   - `NEXTAUTH_SECRET` - Random secret for session encryption

   **Image Generation API (Required, server-only)**:
   - `IMAGE_API_MODE` - Generation mode: `images` (OpenAI/DALL-E) or `chat` (streaming, e.g., Gemini)
   - `IMAGE_API_BASE_URL` - API base URL (e.g., `https://api.openai.com`)
   - `IMAGE_API_KEY` - API key (never expose to client)
   - `IMAGE_IMAGE_MODEL` - Model for `images` mode (default: `dall-e-3`)
   - `IMAGE_CHAT_MODEL` - Model for `chat` mode (e.g., `gemini-2.5-flash-image`)
   - Fallback: If `IMAGE_*` not set, uses legacy `OPENAI_*` variables

   **MinIO Storage (Optional)**:
   - `MINIO_ENDPOINT` - MinIO server endpoint (e.g., `http://localhost:9000`)
   - `MINIO_ACCESS_KEY` - Access key
   - `MINIO_SECRET_KEY` - Secret key
   - `MINIO_BUCKET_NAME` - Bucket name (e.g., `ai-images`)
   - `MINIO_USE_SSL` - `true` or `false`

   **Payment (Optional)**:
   - `STRIPE_WEBHOOK_SECRET` - For Stripe webhook signature verification
   - `PAYMENT_PROVIDER` - `mock` or `stripe`

3. Initialize database: `pnpm prisma migrate deploy` then `pnpm prisma db seed`

## Architecture Patterns

### Routing Structure (App Router)
- `app/` - Next.js 14 App Router with all application code
  - **Pages** (route handlers):
    - `app/page.tsx` - Home page
    - `app/templates/page.tsx` - Template gallery
    - `app/templates/[domain]/page.tsx` - Domain-specific templates
    - `app/create/page.tsx` - Project creation (domain selector)
    - `app/create/[domain]/page.tsx` - Domain-specific creation
    - `app/generate-single/page.tsx` - Single image generation
    - `app/generate-prompts/page.tsx` - Prompt generation tool
    - `app/dashboard/page.tsx` - User dashboard
    - `app/results/[id]/page.tsx` - Generation results
    - `app/pricing/page.tsx` - Pricing/credits
    - `app/testimonials/page.tsx` - Testimonials
    - `app/gallery/page.tsx` - Public gallery
    - `app/admin/templates/page.tsx` - Admin template management
    - `app/admin/model-configs/page.tsx` - Admin model config
    - `app/admin/announcements/page.tsx` - Admin announcements

  - **API Routes** (server-side only):
    - `app/api/**/route.ts` - 41 API route handlers

  - **Shared Code**:
    - `app/components/` - All UI components (page components + reusable UI)
    - `app/hooks/` - Custom React hooks
    - `app/lib/` - Utilities, services, and helpers
    - `app/types/` - TypeScript type definitions
    - `app/contexts/` - React contexts (e.g., AuthContext)
    - `app/data/` - Static data and mock data
    - `app/shared/` - Shared layout components

### Data Layer Architecture

**Prisma + PostgreSQL**:
- `app/lib/prisma.ts` - PrismaClient singleton with PrismaPg adapter
- `prisma/schema.prisma` - Database schema (13 models)
- `generated/prisma/` - Generated Prisma client (do not edit)

**Custom Hooks** (in `app/hooks/`):
- `useProjects` - Fetch user projects with generations (sorted DESC)
- `useTemplates` - Fetch active templates with favorites
- `useTemplateSelection` - Template selection state management
- `useFavorites` - Manage template favorites
- `useImageLikes` - Track image likes/unlikes
- `useImageGeneration` - Handle image generation flow
- `useStreamImageGeneration` - Handle streaming image generation
- `useGenerationPolling` - Poll generation status
- `useEngagementStats` - Aggregate likes + downloads stats
- `usePhotoUpload` - Handle photo uploads
- `usePhotoSelection` - Manage photo selection state
- `useImageUpload` - Image upload to MinIO
- `useImageIdentification` - AI image identification
- `useSingleGenerations` - Single generation history
- `usePromptGeneration` - Prompt generation flow
- `useAnnouncement` - System announcement display
- `useAvailableSources` - Available model sources
- `useDashboardActions` - Dashboard action handlers
- `useDashboardModals` - Dashboard modal state management

**Database Schema** (see `prisma/schema.prisma`) -- 13 models:
- `users` - NextAuth users (email, passwordHash)
- `profiles` - User profiles with credits and invite system
- `templates` - AI generation templates (categories, prompts, pricing, domain)
- `projects` - User photo projects (domain-aware)
- `generations` - AI generation jobs (status, images, credits used)
- `single_generations` - Single image generation records
- `orders` - Payment orders
- `favorites` - User-template favorites
- `image_likes` - Image engagement tracking
- `image_downloads` - Download analytics
- `invite_events` - Invite history and audit trail
- `model_configs` - Dynamic model configuration (multi-source AI)
- `system_announcements` - System-wide announcements

**Domain System**: Templates and projects have a `domain` field (wedding, children, id_photo, artistic, portrait, anime, landscape, product). See `app/types/domain.ts`.

### API Routes

**Server-Side Only APIs** (never expose keys to client):

1. **Image Generation**:
   - `app/api/generate-image/route.ts` - Standard image generation (OpenAI/DALL-E style)
   - `app/api/generate-stream/route.ts` - Streaming generation (chat completions, SSE)
   - `app/api/generate-single/route.ts` - Single image generation (simplified flow)
   - `app/api/generate-prompts/route.ts` - AI prompt generation
   - `app/api/identify-image/route.ts` - AI image identification

2. **Storage**:
   - `app/api/upload-image/route.ts` - Upload images to MinIO storage

3. **CRUD**:
   - `app/api/projects/route.ts` - Project list/create
   - `app/api/projects/[id]/route.ts` - Project detail/update/delete
   - `app/api/generations/route.ts` - Generation list/create
   - `app/api/generations/[id]/route.ts` - Generation detail/update
   - `app/api/generations/[id]/share/route.ts` - Share generation to gallery
   - `app/api/templates/route.ts` - Fetch templates with filters (domain-aware)
   - `app/api/favorites/route.ts` - Manage favorites
   - `app/api/gallery/route.ts` - Public gallery feed
   - `app/api/single-generations/route.ts` - Single generation CRUD
   - `app/api/single-generations/list/route.ts` - List single generations
   - `app/api/single-generations/[id]/route.ts` - Single generation detail
   - `app/api/image-likes/route.ts` - Like/unlike images
   - `app/api/engagement-stats/route.ts` - Engagement statistics

4. **Auth & Profile**:
   - `app/api/auth/[...nextauth]/route.ts` - NextAuth handler
   - `app/api/auth/register/route.ts` - User registration
   - `app/api/profile/route.ts` - User profile
   - `app/api/invite/claim/route.ts` - Claim invite code

5. **Orders/Payments**:
   - `app/api/orders/create/route.ts` - Create order
   - `app/api/orders/validate/route.ts` - Validate order status
   - `app/api/orders/mock/confirm/route.ts` - Mock payment callback (dev only)
   - `app/api/orders/webhook/stripe/route.ts` - Stripe webhook handler
   - `app/api/credits/refund/route.ts` - Credit refund on generation failure

6. **Admin**:
   - `app/api/admin/templates/route.ts` - Template CRUD (admin)
   - `app/api/admin/templates/[id]/route.ts` - Template detail (admin)
   - `app/api/admin/model-configs/route.ts` - Model config CRUD (admin)
   - `app/api/admin/model-configs/[id]/route.ts` - Model config detail (admin)
   - `app/api/admin/announcements/route.ts` - Announcement management (admin)
   - `app/api/admin/upload-template-image/route.ts` - Template image upload (admin)
   - `app/api/model-configs/active/route.ts` - Active model configs (public)
   - `app/api/model-sources/available/route.ts` - Available model sources

7. **Analytics & Debug**:
   - `app/api/images/track-download/route.ts` - Track image downloads
   - `app/api/announcements/route.ts` - Public announcements
   - `app/api/debug/check-data/route.ts` - Debug data check
   - `app/api/debug/gallery/route.ts` - Debug gallery
   - `app/api/test-data/route.ts` - Test data

### Component Organization

**shadcn/ui Components** (in `app/components/ui/`):
- Installed via `pnpm dlx shadcn@latest add [component]`
- Configuration in `components.json`
- Base color: slate, CSS variables enabled
- Components: button, card, input, label, select, switch, textarea, alert-dialog, skeleton, loading, progress-bar, card-skeleton

**Path Aliases** (tsconfig.json):
- `@/*` - `./app/*` (app directory root)
- `@/components/*` - `./app/components/*` (UI components)
- `@/hooks/*` - `./app/hooks/*` (custom hooks)
- `@/lib/*` - `./app/lib/*` (utilities)
- `@/types/*` - `./app/types/*` (type definitions)
- `@/contexts/*` - `./app/contexts/*` (React contexts)

### Type Safety Rules

**CRITICAL**:
- NO `any` types allowed - all TypeScript types must be explicit
- Use strict mode (`strict: true` in tsconfig.json)
- Types should be defined in separate `types.ts` files in `app/types/`
- Run `pnpm typecheck` before committing
- ESLint enforces `@typescript-eslint/no-explicit-any: error`

### Code Organization Rules

**File Size Limit**:
- Single file MUST NOT exceed 500 lines
- If a file grows beyond 500 lines:
  - Extract subcomponents to separate files
  - Create custom hooks to encapsulate logic
  - Split into logical modules

**Icon Usage**:
- Use Lucide React icons (`lucide-react` package)
- Do NOT use emoji in code or UI

## Testing Strategy

- **Current state**: No automated test framework is configured (no Jest, Vitest, or Playwright).
- **Manual verification**: `pnpm lint` + `pnpm typecheck` + `pnpm build` serve as the quality gate.
- **Validation layer**: Zod schemas in `app/lib/validations.ts` provide runtime request validation for all API routes.
- **Recommendation**: Consider adding Vitest for unit tests and Playwright for E2E tests.

## Key Implementation Details

### NextAuth Configuration
- Credentials provider (email + password)
- Session stored in JWT cookies (`next-auth.session-token` or `__Secure-next-auth.session-token`)
- Middleware (`middleware.ts`) optionally protects `/dashboard`, `/results/:path*`, `/create`, `/create/:path*` when `ENABLE_SSR_GUARD=true`

### Image Generation Flow

**Standard Mode** (`IMAGE_API_MODE=images`):
1. User selects template + uploads photos
2. Frontend calls `/api/generate-image` with session
3. API validates auth via getServerSession, checks rate limits, proxies to OpenAI-compatible endpoint
4. Response contains image URLs or base64 data
5. Frontend stores generation record in `generations` table via API

**Streaming Mode** (`IMAGE_API_MODE=chat`):
1. User selects template + uploads photos
2. Frontend calls `/api/generate-stream` with session and image inputs
3. API validates auth, constructs chat messages with image URLs
4. Streams Server-Sent Events from upstream API (e.g., Gemini)
5. Frontend parses streamed markdown chunks and extracts Base64 images
6. Displays images progressively as they arrive
7. Stores final result in `generations` table via API

**Single Generation Mode**:
1. User uploads a single photo + selects template + adjusts settings
2. Frontend calls `/api/generate-single` or uses streaming via `useStreamImageGeneration`
3. Result saved to `single_generations` table

### Multi-Source Model Configuration
- `model_configs` table stores multiple AI model endpoints (OpenAI, OpenRouter, 302.ai)
- Admin can configure active/inactive models via `/admin/model-configs`
- API routes dynamically select model based on active config and source preference
- Supports `ModelConfigType`: generate_image, identify_image, generate_prompts, other

### Prompt Strategy System
- `app/lib/prompt-strategies/` contains domain-specific prompt generation strategies
- Each domain (wedding, children, id_photo, artistic, portrait, anime, landscape, product) has its own strategy file
- Strategy interface defined in `app/lib/prompt-strategies/types.ts`
- `getPromptStrategy(domain)` dispatches to the correct strategy

### Payment Flow (Current: Mock + Stripe Ready)
1. User clicks "Purchase" -> Create order via `/api/orders/create`
2. **Mock mode**: Call `/api/orders/mock/confirm` to simulate success
3. **Stripe mode**: Redirect to Stripe Checkout, receive webhook at `/api/orders/webhook/stripe`
4. Webhook updates order status + credits
5. Frontend polls order status or uses real-time subscriptions

### Invite System Flow
1. User gets unique `invite_code` (generated on profile creation)
2. User shares invite link with friends (URL param `?inv=CODE`)
3. New user claims code via `/api/invite/claim` on first login
4. System validates code, awards credits to both parties
5. Updates `invited_by`, `invite_count`, `reward_credits` in profiles
6. Records event in `invite_events` table for audit

## Common Patterns

### Fetching User Data (API Routes)
```typescript
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth-api';
import { prisma } from '@/lib/prisma';

const session = await getServerSession(authOptions);
if (!session?.user?.id) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

const projects = await prisma.project.findMany({
  where: { userId: session.user.id },
  include: { generations: true },
  orderBy: { createdAt: 'desc' },
});
```

### Protected API Routes
```typescript
import { requireAuth } from '@/lib/auth-api';

const authResult = await requireAuth();
if (authResult instanceof Response) return authResult;
const { user } = authResult;
```

### Admin-Protected API Routes
```typescript
import { requireAdmin } from '@/lib/auth-admin';

const adminResult = await requireAdmin(req);
if (adminResult instanceof Response) return adminResult;
const { profile } = adminResult;
```

### Prisma Client
```typescript
import { prisma } from '@/lib/prisma';

const templates = await prisma.template.findMany({
  where: { isActive: true, domain: 'wedding' },
});
```

### Streaming Image Generation
```typescript
const response = await fetch('/api/generate-stream', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  credentials: 'include',
  body: JSON.stringify({ prompt, image_inputs }),
});

const reader = response.body.getReader();
const decoder = new TextDecoder();

while (true) {
  const { done, value } = await reader.read();
  if (done) break;
  const chunk = decoder.decode(value);
  // Parse SSE format: "data: {...}\n\n"
}
```

## Image Configuration

Next.js Image optimization is configured for (see `next.config.js`):
- `localhost`
- `images.pexels.com`
- `**.supabase.co` (legacy)
- `oaidalleapiprodscus.blob.core.windows.net` (OpenAI DALL-E)
- `123.57.16.107:9000` (MinIO instance)
- `file.302.ai` (302.ai service)
- `images.unsplash.com`

Add new domains to `next.config.js` -> `images.remotePatterns` array.

## Key Services and Utilities

Located in `app/lib/`:

- `prisma.ts` - PrismaClient singleton (PrismaPg adapter)
- `auth.ts` - NextAuth configuration and options
- `auth-api.ts` - NextAuth server helpers (getSessionUser, requireAuth)
- `auth-admin.ts` - Admin role verification (verifyAdmin, requireAdmin)
- `api-client.ts` - Client-side API helper functions
- `generation-service.ts` - Image generation orchestration (guest + authenticated modes)
- `image-stream.ts` - Server-Sent Events parsing for streaming responses
- `image.ts` - Image utility functions
- `minio-client.ts` - MinIO storage client for image uploads
- `image-compress.ts` - Client-side image compression before upload
- `image-quality-checker.ts` - Validate image quality (resolution, format)
- `image-rating.ts` - Image quality scoring system
- `validations.ts` - Zod schemas for API request validation
- `errors.ts` - Custom error classes
- `utils.ts` - General utilities (cn, date formatting, etc.)
- `constants.ts` - Application constants (GitHub URL, social links)
- `status.ts` - Generation status types and helpers
- `time.ts` - Time formatting utilities
- `mock-generator.ts` - Mock data generator for development
- `pricing-recommender.ts` - Dynamic pricing logic
- `share-card.ts` - Social media share card generation
- `logger.ts` - Structured logging utility
- `prompt-strategies/` - Domain-specific prompt generation (8 strategies + index)

All services follow the pattern: single responsibility, explicit types, no `any` types.

## Coding Standards

- **Language**: TypeScript strict mode, no `any` types
- **Formatting**: ESLint flat config (`eslint.config.mjs`) with typescript-eslint + react-hooks
- **CSS**: TailwindCSS with custom theme (see `tailwind.config.js`, `app/globals.css`)
- **Components**: shadcn/ui as base, Lucide icons only (no emoji)
- **Validation**: Zod schemas for all API inputs
- **Auth pattern**: `requireAuth()` / `requireAdmin()` guard at route entry
- **Error handling**: Custom error classes in `app/lib/errors.ts`
- **File limit**: 500 lines max per file; split into sub-components or hooks

## AI Usage Guidelines

- When modifying API routes, always check auth pattern (`requireAuth` or `requireAdmin`)
- When adding new domains, update: `app/types/domain.ts`, `app/lib/prompt-strategies/`, `prisma/schema.prisma` if needed
- When adding UI components, prefer shadcn/ui primitives from `app/components/ui/`
- When adding new API routes, add Zod validation schema in `app/lib/validations.ts`
- Types go in `app/types/*.ts`, never inline in business files
- Run `pnpm typecheck && pnpm lint` before committing
- Do not expose server-side API keys; all `IMAGE_*` env vars are server-only

## Build Requirements

- Node.js 18+
- pnpm (required package manager)
- TypeScript strict mode enabled
- ESLint and TypeScript errors block builds (`ignoreBuildErrors: false`)
