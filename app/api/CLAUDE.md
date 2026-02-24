[Root](../../CLAUDE.md) > [app](../) > **api**

# API Routes Module

> 变更记录 (Changelog)
> - **2026-02-24T14:27:17** -- 初始化扫描，识别 41 个 API route handler。

## Module Responsibilities

Server-side API route handlers for the ai-wedding platform. All routes run exclusively on the server and never expose API keys or secrets to the client. Routes are organized by domain concern: image generation, auth, CRUD, payments, admin, and analytics.

## Entry Points

- Each route is a `route.ts` file exporting HTTP method handlers (`GET`, `POST`, `PATCH`, `DELETE`)
- Entry pattern: `app/api/{resource}/route.ts` or `app/api/{resource}/[id]/route.ts`

## API Categories

### Image Generation (5 routes)
| Route | Methods | Auth | Description |
|-------|---------|------|-------------|
| `generate-image/route.ts` | POST | requireAuth | Standard OpenAI/DALL-E generation |
| `generate-stream/route.ts` | POST | requireAuth | Streaming SSE generation (chat mode) |
| `generate-single/route.ts` | POST | requireAuth | Simplified single-image generation |
| `generate-prompts/route.ts` | POST | requireAuth | AI prompt generation |
| `identify-image/route.ts` | POST | requireAuth | AI image identification |

### Auth & Profile (4 routes)
| Route | Methods | Auth | Description |
|-------|---------|------|-------------|
| `auth/[...nextauth]/route.ts` | GET, POST | public | NextAuth handler |
| `auth/register/route.ts` | POST | public | User registration |
| `profile/route.ts` | GET | requireAuth | User profile fetch |
| `invite/claim/route.ts` | POST | requireAuth | Claim invite code |

### CRUD (11 routes)
| Route | Methods | Auth | Description |
|-------|---------|------|-------------|
| `projects/route.ts` | GET, POST | requireAuth | Project list/create |
| `projects/[id]/route.ts` | GET, PATCH, DELETE | requireAuth | Project detail |
| `generations/route.ts` | GET, POST | requireAuth | Generation list/create |
| `generations/[id]/route.ts` | GET, PATCH | requireAuth | Generation detail/update |
| `generations/[id]/share/route.ts` | POST | requireAuth | Share to gallery |
| `templates/route.ts` | GET | public | Template listing |
| `favorites/route.ts` | GET, POST, DELETE | requireAuth | Favorites |
| `gallery/route.ts` | GET | public | Public gallery |
| `single-generations/route.ts` | POST | requireAuth | Create single gen |
| `single-generations/list/route.ts` | GET | requireAuth | List single gens |
| `single-generations/[id]/route.ts` | GET, DELETE | requireAuth | Single gen detail |

### Orders/Payments (4 routes)
| Route | Methods | Auth | Description |
|-------|---------|------|-------------|
| `orders/create/route.ts` | POST | requireAuth | Create order |
| `orders/validate/route.ts` | POST | requireAuth | Validate order |
| `orders/mock/confirm/route.ts` | POST | requireAuth | Mock payment (dev) |
| `orders/webhook/stripe/route.ts` | POST | webhook-secret | Stripe webhook |
| `credits/refund/route.ts` | POST | requireAuth | Credit refund |

### Admin (6 routes)
| Route | Methods | Auth | Description |
|-------|---------|------|-------------|
| `admin/templates/route.ts` | GET, POST | requireAdmin | Template CRUD |
| `admin/templates/[id]/route.ts` | GET, PATCH, DELETE | requireAdmin | Template detail |
| `admin/model-configs/route.ts` | GET, POST | requireAdmin | Model config CRUD |
| `admin/model-configs/[id]/route.ts` | GET, PATCH, DELETE | requireAdmin | Model config detail |
| `admin/announcements/route.ts` | GET, POST, PATCH | requireAdmin | Announcements |
| `admin/upload-template-image/route.ts` | POST | requireAdmin | Template image upload |

### Public/Analytics (6 routes)
| Route | Methods | Auth | Description |
|-------|---------|------|-------------|
| `model-configs/active/route.ts` | GET | public | Active model configs |
| `model-sources/available/route.ts` | GET | public | Available sources |
| `image-likes/route.ts` | GET, POST, DELETE | requireAuth | Image likes |
| `engagement-stats/route.ts` | GET | requireAuth | Engagement stats |
| `images/track-download/route.ts` | POST | requireAuth | Download tracking |
| `announcements/route.ts` | GET | public | Public announcements |

## Key Dependencies

- `@/lib/auth-api` - `requireAuth()` for user authentication
- `@/lib/auth-admin` - `requireAdmin()` for admin routes
- `@/lib/prisma` - Database access via Prisma
- `@/lib/validations` - Zod schemas for request validation
- `@/lib/minio-client` - MinIO storage for image uploads

## Data Model

All routes interact with Prisma models defined in `prisma/schema.prisma`. Key relationships:
- User -> Profile (1:1)
- User -> Projects -> Generations (1:N:N)
- Generation -> Template (N:1)
- User -> Orders (1:N)

## Testing

- No automated API tests currently
- Validation via Zod schemas provides runtime safety
- `pnpm typecheck` ensures type correctness

## Related Files

- `app/lib/auth-api.ts` - Auth helpers
- `app/lib/auth-admin.ts` - Admin auth helpers
- `app/lib/validations.ts` - Zod validation schemas
- `app/lib/prisma.ts` - Prisma client singleton
- `app/lib/minio-client.ts` - MinIO storage client
- `app/lib/generation-service.ts` - Generation orchestration
