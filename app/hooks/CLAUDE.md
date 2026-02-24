[Root](../../CLAUDE.md) > [app](../) > **hooks**

# Hooks Module

> 变更记录 (Changelog)
> - **2026-02-24T14:27:17** -- 初始化扫描，识别 20 个 custom hooks。

## Module Responsibilities

Custom React hooks encapsulating data fetching, state management, and business logic for the platform's client-side features.

## Hook Index

### Data Fetching Hooks
| Hook | Description |
|------|-------------|
| `useProjects` | Fetch user projects with generations (sorted DESC) |
| `useTemplates` | Fetch active templates with optional favorites |
| `useFavorites` | Manage user template favorites (add/remove) |
| `useImageLikes` | Track image likes/unlikes |
| `useEngagementStats` | Aggregate likes + downloads statistics |
| `useSingleGenerations` | Fetch single generation history |
| `useAnnouncement` | Fetch active system announcements |
| `useAvailableSources` | Fetch available AI model sources |

### Generation Flow Hooks
| Hook | Description |
|------|-------------|
| `useImageGeneration` | Orchestrate full generation flow (guest/auth) |
| `useStreamImageGeneration` | Handle streaming SSE image generation |
| `useGenerationPolling` | Poll generation status until complete |
| `usePromptGeneration` | AI-driven prompt generation |
| `useImageIdentification` | AI image identification flow |

### UI State Hooks
| Hook | Description |
|------|-------------|
| `usePhotoUpload` | Handle photo file upload with compression |
| `usePhotoSelection` | Manage photo selection state |
| `useImageUpload` | Upload images to MinIO storage |
| `useTemplateSelection` | Template selection and state |
| `useDashboardActions` | Dashboard action handlers (share, delete, etc.) |
| `useDashboardModals` | Dashboard modal visibility state |

### Types
| File | Description |
|------|-------------|
| `types.ts` | Shared hook type definitions |

## Key Patterns

- All hooks follow the `use{Feature}` naming convention
- Data fetching hooks return `{ data, loading, error, refresh }` pattern
- Generation hooks use progress callbacks: `onProgress(stage, percent)`
- Auth-aware: hooks check session before making authenticated API calls

## Key Dependencies

- `app/lib/api-client.ts` - Client-side API wrapper
- `app/lib/generation-service.ts` - Generation orchestration
- `app/contexts/AuthContext.tsx` - Auth state via `useAuth()`
- `app/types/` - Shared type definitions

## Testing

- No automated hook tests currently
- Hooks are exercised through manual UI testing

## Related Files

- `app/components/` - Components that consume these hooks
- `app/lib/api-client.ts` - API client used by data hooks
- `app/types/generation.ts` - Generation types
- `app/types/database.ts` - Database entity types
