[Root](../CLAUDE.md) > **prisma**

# Prisma/Data Layer Module

> 变更记录 (Changelog)
> - **2026-02-24T14:27:17** -- 初始化扫描，识别 4 个文件，13 个数据模型。

## Module Responsibilities

Database schema definition, migrations, and seed data for the PostgreSQL database. Uses Prisma ORM with the PrismaPg adapter.

## Files

| File | Description |
|------|-------------|
| `schema.prisma` | Database schema: 13 models, 3 enums, PostgreSQL provider |
| `migrations/20250224000000_init/migration.sql` | Initial migration SQL |
| `seed.ts` | Database seed script (initial templates) |
| `sync-wedding-templates.ts` | Wedding template sync utility |

## Data Models (15)

### Core Models
| Model | Table | Description |
|-------|-------|-------------|
| `User` | `users` | NextAuth users (email, passwordHash) |
| `Profile` | `profiles` | User profile with credits (incl. frozen), invite system, role |
| `Template` | `templates` | AI generation templates (name, category, domain, prompts, pricing) |
| `Project` | `projects` | User photo projects (domain-aware) |
| `Generation` | `generations` | AI generation jobs — unified batch + single via `generation_type` field |
| `GeneratedImage` | `generated_images` | Generated images per generation (preview / high_res) |
| `CreditTransaction` | `credit_transactions` | Credit transaction history (purchase, generation, refund, etc.) |
| `Domain` | `domains` | Domain configuration (slug, name, icon, require_face_detection) |

### Payment & Commerce
| Model | Table | Description |
|-------|-------|-------------|
| `Order` | `orders` | Payment orders (amount, currency, status) |

### Engagement & Analytics
| Model | Table | Description |
|-------|-------|-------------|
| `Favorite` | `favorites` | User-template favorites (unique constraint) |
| `ImageLike` | `image_likes` | Image like tracking |
| `ImageDownload` | `image_downloads` | Download analytics |

### System
| Model | Table | Description |
|-------|-------|-------------|
| `InviteEvent` | `invite_events` | Invite history and audit trail |
| `ModelConfig` | `model_configs` | Dynamic AI model endpoint configuration |
| `SystemAnnouncement` | `system_announcements` | System-wide announcements |

### Enums
| Enum | Values | Description |
|------|--------|-------------|
| `CreditTransactionType` | purchase, generation, refund, invite_reward, system_grant, admin_adjust | Credit tx type |
| `CreditTransactionStatus` | pending, completed, failed, cancelled | Credit tx status |
| `GenerationType` | batch, single | Generation mode |
| `ImageType` | preview, high_res | Generated image quality |
| `ModelConfigType` | generate_image, identify_image, generate_prompts, other | Model capability type |
| `ModelConfigStatus` | active, inactive | Model enable/disable |
| `ModelConfigSource` | openRouter, openAi | AI service provider |

## Key Relationships

```
User 1--1 Profile
User 1--N Project 1--N Generation
User 1--N Generation (single type, no project)
User 1--N Order
User 1--N CreditTransaction
Generation N--1 Template
Generation 1--N GeneratedImage
Generation 1--N ImageDownload, ImageLike
User 1--N Favorite N--1 Template
User 1--N InviteEvent (as inviter/invitee)
User 1--N ModelConfig (createdBy)
```

## Commands

```bash
pnpm prisma migrate deploy   # Apply migrations
pnpm prisma db seed           # Seed initial data
pnpm prisma generate          # Regenerate client (auto on migrate)
pnpm prisma studio            # Open Prisma Studio GUI
```

## Configuration

- Generator output: `../generated/prisma` (gitignored)
- Provider: `postgresql`
- Adapter: PrismaPg (`@prisma/adapter-pg`)
- Client singleton: `app/lib/prisma.ts`

## Testing

- No automated migration tests
- Seed script provides initial development data
- `pnpm verify-db` script checks database permissions

## Related Files

- `app/lib/prisma.ts` - PrismaClient singleton
- `app/types/database.ts` - Client-side type mirrors
- `scripts/verify-db-permissions.ts` - DB permission check
- `scripts/grant-db-permissions.ts` - DB permission grant
