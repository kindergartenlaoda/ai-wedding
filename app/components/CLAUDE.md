[Root](../../CLAUDE.md) > [app](../) > **components**

# Components Module

> 变更记录 (Changelog)
> - **2026-02-24T14:27:17** -- 初始化扫描，识别 72 个组件文件。

## Module Responsibilities

All UI components for the platform: page-level components, reusable widgets, admin panels, Dashboard sub-system, and shadcn/ui primitives.

## Component Categories

### Page Components (top-level, used by route pages)
| File | Description |
|------|-------------|
| `HomePage.tsx` | Landing page with hero, features, process animation |
| `HeroProcessAnimation.tsx` | GSAP-powered hero animation |
| `DashboardPage.tsx` | User dashboard (projects + single generations) |
| `CreatePage.tsx` | Domain selection for project creation |
| `CreateDomainPageContent.tsx` | Domain-specific creation flow |
| `GenerateSinglePage.tsx` | Single image generation page |
| `TemplatesPage.tsx` | Template gallery with domain filtering |
| `PricingPage.tsx` | Pricing plans and credits |
| `ResultsPage.tsx` | Generation results viewer |
| `TestimonialsPage.tsx` | Testimonials page |
| `GeneratePromptsPage.tsx` | AI prompt generation tool |

### Dashboard Sub-System (`Dashboard/`)
| File | Description |
|------|-------------|
| `DashboardHeader.tsx` | Dashboard header with stats |
| `DashboardTabs.tsx` | Tab navigation (projects / single generations) |
| `ProjectList.tsx` | Project grid/list view |
| `ProjectCard.tsx` | Individual project card |
| `SingleGenerationList.tsx` | Single generation history list |
| `EmptyState.tsx` | Empty state placeholder |
| `index.ts` | Barrel export |

### GenerateSinglePage Sub-System (`GenerateSinglePage/`)
| File | Description |
|------|-------------|
| `GenerationSettings.tsx` | Generation parameter controls |
| `TemplateSelector.tsx` | Template picker for single gen |
| `ImageUploadSection.tsx` | Photo upload area |
| `ImageResultSection.tsx` | Generated image display |
| `ImagePreviewModal.tsx` | Full-screen image preview |
| `types.ts` | Local type definitions |

### Admin Components (`admin/`)
| File | Description |
|------|-------------|
| `AdminLayout.tsx` | Admin page layout wrapper |
| `TemplateForm.tsx` | Template create/edit form |
| `PromptConfigEditor.tsx` | Prompt configuration editor |
| `PromptListEditor.tsx` | Multi-prompt list editor |
| `ModelConfigForm.tsx` | Model config create/edit form |
| `ModelConfigList.tsx` | Model config listing |
| `ImageUploadField.tsx` | Image upload form field |

### Photo Upload System (`photo-uploader/`)
| File | Description |
|------|-------------|
| `PhotoUploadGuide.tsx` | Upload guidelines display |
| `PhotoUploadZone.tsx` | Drag-and-drop upload zone |
| `SortablePhoto.tsx` | Sortable photo thumbnail (dnd-kit) |

### Reusable UI Components
| File | Description |
|------|-------------|
| `AuthModal.tsx` | Sign-in / sign-up modal |
| `Header.tsx` | Global header/navigation |
| `AnnouncementBanner.tsx` | System announcement banner |
| `Toast.tsx` | Toast notification |
| `ConfirmDialog.tsx` | Confirmation dialog |
| `ShareModal.tsx` | Social sharing modal |
| `ImagePreviewModal.tsx` | Full-screen image preview |
| `ImageCompareSlider.tsx` | Before/after image slider |
| `PhotoGuideModal.tsx` | Photo upload guidelines |
| `PhotoUploader.tsx` | Photo upload component |
| `ProjectActionsMenu.tsx` | Project context menu |
| `ProjectDetailModal.tsx` | Project detail overlay |
| `ProjectEditModal.tsx` | Project edit form |
| `ProjectFilters.tsx` | Project filter controls |
| `ProjectProgress.tsx` | Generation progress indicator |
| `ProjectStatsChart.tsx` | Stats chart (Recharts) |
| `StatCard.tsx` | Statistics card |
| `SingleGenerationCard.tsx` | Single gen result card |
| `SingleGenerationDetailModal.tsx` | Single gen detail overlay |
| `GenerationResults.tsx` | Generation result display |
| `GenerationProgress.tsx` | Progress bar for generation |
| `GeneratingTips.tsx` | Tips during generation |
| `GenerationNotification.tsx` | Generation status notification |
| `Providers.tsx` | NextAuth SessionProvider wrapper |

### React-Bits Library (`react-bits/`)
| File | Description |
|------|-------------|
| `animations/FadeIn.tsx` | Fade-in animation wrapper |
| `backgrounds/GradientBackground.tsx` | Gradient background |
| `components/GlassCard.tsx` | Glassmorphism card |
| `components/SpotlightCard.tsx` | Spotlight hover card |
| `text-animations/GradientText.tsx` | Gradient text animation |
| `index.ts` | Barrel export |

### shadcn/ui Primitives (`ui/`)
button, card, card-skeleton, input, label, select, switch, textarea, alert-dialog, skeleton, loading, progress-bar

## Key Dependencies

- `lucide-react` - Icons (no emoji)
- `@dnd-kit/*` - Drag-and-drop for photo sorting
- `gsap` + `@gsap/react` - GSAP animations
- `recharts` - Dashboard charts
- `react-masonry-css` - Masonry layout for gallery
- `split-type` - Text splitting for animations

## Coding Conventions

- Use `"use client"` directive for interactive components
- shadcn/ui components in `ui/` directory
- Types in local `types.ts` or `app/types/`
- Max 500 lines per file; extract sub-components
- No emoji; use Lucide icons

## Related Files

- `app/hooks/` - Custom hooks used by components
- `app/contexts/AuthContext.tsx` - Auth context
- `app/lib/utils.ts` - `cn()` utility for class merging
- `app/types/database.ts` - Core data types
