[Root](../../CLAUDE.md) > [app](../) > **lib**

# Lib/Services Module

> 变更记录 (Changelog)
> - **2026-02-24T14:27:17** -- 初始化扫描，识别 32 个 utility/service 文件。

## Module Responsibilities

Shared utility functions, service modules, and business logic used across API routes and client components. Each file follows single-responsibility principle.

## Service Index

### Auth Layer
| File | Description |
|------|-------------|
| `auth.ts` | NextAuth configuration (authOptions, credentials provider) |
| `auth-api.ts` | Server-side auth helpers: `getSessionUser()`, `requireAuth()` |
| `auth-admin.ts` | Admin verification: `verifyAdmin()`, `requireAdmin()` |

### Image Generation
| File | Description |
|------|-------------|
| `generation-service.ts` | Generation orchestration: `generateAsGuest()`, `generateAsAuthenticated()`, `markGenerationFailed()` |
| `image-stream.ts` | SSE stream parsing for chat completions |
| `image.ts` | Image utility functions |
| `mock-generator.ts` | Mock image generator for guest/dev mode |

### Prompt Strategies (`prompt-strategies/`)
| File | Description |
|------|-------------|
| `types.ts` | `PromptStrategy` interface definition |
| `index.ts` | `getPromptStrategy(domain)` dispatcher |
| `wedding.ts` | Wedding domain strategy |
| `children.ts` | Children domain strategy |
| `id_photo.ts` | ID photo domain strategy |
| `artistic.ts` | Artistic domain strategy |
| `portrait.ts` | Portrait domain strategy |
| `anime.ts` | Anime domain strategy |
| `landscape.ts` | Landscape domain strategy |
| `product.ts` | Product domain strategy |

### Storage
| File | Description |
|------|-------------|
| `minio-client.ts` | MinIO S3-compatible storage client |
| `image-compress.ts` | Client-side image compression (before upload) |

### Image Quality
| File | Description |
|------|-------------|
| `image-quality-checker.ts` | Validate image resolution, format, size |
| `image-rating.ts` | Image quality scoring system |

### Validation
| File | Description |
|------|-------------|
| `validations.ts` | Zod schemas: SignUp, SignIn, CreateProject, GenerateImage, CreateOrder, TrackDownload, Pagination, Search, TemplateFilter |

### Data & State
| File | Description |
|------|-------------|
| `prisma.ts` | PrismaClient singleton (PrismaPg adapter) |
| `api-client.ts` | Client-side fetch helpers for API routes |
| `status.ts` | Generation/project status types and helpers |

### Utilities
| File | Description |
|------|-------------|
| `utils.ts` | `cn()` (clsx+twMerge), date formatting, general utils |
| `constants.ts` | Application constants (GITHUB_REPO_URL, SOCIAL_LINKS) |
| `time.ts` | Time formatting utilities |
| `errors.ts` | Custom error classes |
| `logger.ts` | Structured logging utility |

### Business Logic
| File | Description |
|------|-------------|
| `pricing-recommender.ts` | Dynamic pricing recommendation |
| `share-card.ts` | Social media share card generation |

## Key Patterns

- `requireAuth()` returns `{ user }` or `Response` (401) -- use with `instanceof Response` check
- `requireAdmin()` returns `{ profile }` or `Response` (401/403)
- `prisma` is a singleton; import from `@/lib/prisma`
- Zod validation: `validateData(schema, data)` returns `{ success, data }` or `{ success, error }`
- Prompt strategy: `getPromptStrategy(domain)` returns domain-specific prompt generator

## Testing

- No automated unit tests for lib functions currently
- Zod schemas provide runtime validation safety
- Type safety enforced via TypeScript strict mode

## Related Files

- `app/api/` - API routes that consume these services
- `app/hooks/` - Client hooks that use api-client
- `app/types/` - Shared type definitions
- `prisma/schema.prisma` - Database schema used by Prisma client
