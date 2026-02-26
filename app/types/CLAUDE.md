[Root](../../CLAUDE.md) > [app](../) > **types**

# Types Module

> 变更记录 (Changelog)
> - **2026-02-24T14:27:17** -- 初始化扫描，识别 14 个类型定义文件。

## Module Responsibilities

Centralized TypeScript type definitions shared across the application. All business types must be defined here, never inline in business files.

## Type File Index

| File | Key Types | Description |
|------|-----------|-------------|
| `database.ts` | `Profile`, `Template`, `PromptConfig`, `Project`, `Generation`, `Order`, `Favorite`, `ProjectWithTemplate`, `GenerationWithRelations`, `GalleryItem`, `SystemAnnouncement` | Core database entity types for client-side use |
| `domain.ts` | `GenerationDomain`, `DomainInfo`, `DOMAIN_CONFIG`, `GENERATION_DOMAINS` | Domain system: 8 domains with icons, colors, descriptions |
| `generation.ts` | `GenerationInput`, `GenerationProgress`, `GenerationResult` | Generation flow types |
| `status.ts` | `ProjectStatus`, `GenerationStatus` | Status enums |
| `photo.ts` | Photo-related types | Photo upload/selection types |
| `image.ts` | Image-related types | Image processing types |
| `pricing.ts` | Pricing-related types | Pricing plan definitions |
| `share.ts` | Share-related types | Social sharing types |
| `storage.ts` | Storage-related types | MinIO storage types |
| `filters.ts` | Filter types | Template/project filter types |
| `prompt.ts` | Prompt-related types | Prompt generation types |
| `model-config.ts` | Model config types | AI model configuration types |
| `admin.ts` | Admin-related types | Admin panel types |
| `next-auth.d.ts` | NextAuth module augmentation | Extends NextAuth session with `user.id` |

## Coding Conventions

- All types use explicit TypeScript definitions (no `any`)
- Types are organized by domain concern
- `database.ts` mirrors Prisma schema but uses snake_case for client compatibility
- `domain.ts` defines the 8-domain system used throughout the app
- `next-auth.d.ts` augments NextAuth module types

## Key Relationships

- `database.ts` types are consumed by hooks, components, and API routes
- `domain.ts` `GENERATION_DOMAINS` array is the source of truth for valid domains
- `generation.ts` types drive the generation flow in hooks and services
- `status.ts` types are used by `database.ts` composite types

## Related Files

- `prisma/schema.prisma` - Server-side database schema (source of truth)
- `app/lib/validations.ts` - Zod schemas that validate against these types
- `app/hooks/types.ts` - Hook-specific type definitions
- `app/components/GenerateSinglePage/types.ts` - Component-local types
