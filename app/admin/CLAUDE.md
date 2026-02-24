[Root](../../CLAUDE.md) > [app](../) > **admin**

# Admin Pages Module

> 变更记录 (Changelog)
> - **2026-02-24T14:27:17** -- 初始化扫描，识别 5 个 admin 页面。

## Module Responsibilities

Admin-only pages for managing templates, AI model configurations, and system announcements. All pages are client-rendered (`"use client"`) and require admin role verification.

## Pages

| Path | File | Description |
|------|------|-------------|
| `/admin/templates` | `templates/page.tsx` | Template listing with CRUD actions |
| `/admin/templates/new` | `templates/new/page.tsx` | Create new template |
| `/admin/templates/[id]` | `templates/[id]/page.tsx` | Edit existing template |
| `/admin/model-configs` | `model-configs/page.tsx` | AI model configuration management |
| `/admin/announcements` | `announcements/page.tsx` | System announcement management |

## Entry Points

- Each page is a Next.js App Router page component
- Admin auth is verified client-side via `useAuth()` hook (role check)
- API calls go to `app/api/admin/*` routes which enforce `requireAdmin()` server-side

## Key Dependencies

- `app/components/admin/AdminLayout.tsx` - Shared admin layout wrapper
- `app/components/admin/TemplateForm.tsx` - Template create/edit form
- `app/components/admin/ModelConfigForm.tsx` - Model config form
- `app/components/admin/ModelConfigList.tsx` - Model config listing
- `app/api/admin/` - Admin API routes (server-side auth enforcement)

## Auth Pattern

Admin pages use a dual-layer auth approach:
1. **Client-side**: `useAuth()` checks `profile.role === 'admin'` for UI gating
2. **Server-side**: `requireAdmin(req)` in API routes verifies admin role via Prisma

## Testing

- No automated tests for admin pages
- Manual testing required for CRUD operations

## Related Files

- `app/lib/auth-admin.ts` - Admin auth verification
- `app/components/admin/` - Admin UI components
- `app/api/admin/` - Admin API routes
