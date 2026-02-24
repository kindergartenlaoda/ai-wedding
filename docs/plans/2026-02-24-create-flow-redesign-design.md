# Create Flow Redesign: Immersive StepFlow

> Date: 2026-02-24
> Status: Approved
> Scope: Full chain from Homepage CTA to Generation Results

## Problem

The Hero animation promises a 3-step magic experience (Upload -> Style -> Masterpiece), but the actual create flow is a fragmented, form-based experience with 9 interruption points across 3 separate routes. The visual language breaks completely between the cinematic Hero and the utilitarian CreatePage.

Current pain points:
- 3 conflicting routes: `/create?templateId=xxx`, `/create/[domain]`, homepage CTA -> `/templates`
- identify-image blocks upload serially (user waits per photo)
- Credits use "deduct first, refund on failure" model (data loss risk)
- projectName, shareToGallery, and other form fields add friction before the core action

## Decision

**Approach A: Immersive StepFlow** -- Merge the entire creation flow into a single full-screen stepped component sharing visual DNA with the Hero animation. URL parameters sync step state for browser back/forward support.

## Route Architecture

### Unified Route

```
/create                        -> StepFlow (Step 1: choose domain)
/create?domain=wedding         -> StepFlow (Step 2: choose template, filtered)
/create?template=xxx           -> StepFlow (Step 3: upload photos)
/create?template=xxx&step=generate -> StepFlow (Step 4: generating)
```

### Backward Compatibility

```
/create?templateId=xxx  ->  redirect to /create?template=xxx
/create/[domain]        ->  redirect to /create?domain=[domain]
```

`/templates` page remains as a standalone browse entry. Template card CTAs link to `/create?template=xxx`.

Homepage CTA "开启创作" links to `/create` directly (no longer to `/templates`).

## Component Tree

```
app/create/page.tsx              -> StepFlow container
  StepFlow.tsx                   -> State machine + step routing
    StepDomain.tsx               -> Step 1: Domain selection grid
    StepStyle.tsx                -> Step 2: Template selection
    StepUpload.tsx               -> Step 3: Photo upload with parallel identify
    StepGenerate.tsx             -> Step 4: Generation + results (two phases)
    StepProgress.tsx             -> Top progress indicator (shared across steps)

app/components/shared-animations/  -> Extracted from HeroProcessAnimation
    ScanningLine.tsx             -> Gold horizontal scanning line
    UploadBox.tsx                -> Dashed upload area with pulse
    StyleTagPanel.tsx            -> Style tag overlay with highlight
    SuccessBadge.tsx             -> "杰作已成" completion badge
```

## State Machine

```typescript
// app/types/step-flow.ts

type StepFlowState =
  | { step: 'domain'; domain: null }
  | { step: 'style'; domain: GenerationDomain; template: null }
  | { step: 'upload'; domain: GenerationDomain; template: Template; photos: PhotoState[] }
  | { step: 'generate'; domain: GenerationDomain; template: Template; photos: ValidatedPhoto[]; progress: GenerationProgress }
  | { step: 'result'; domain: GenerationDomain; template: Template; images: string[]; generationId: string | null }
  | { step: 'error'; error: string; retryFrom: 'generate' }

interface PhotoState {
  id: string;
  dataUrl: string;
  minioUrl?: string;
  uploadStatus: 'uploading' | 'uploaded' | 'failed';
  identifyStatus: 'pending' | 'identifying' | 'valid' | 'invalid' | 'error';
  identifyDescription?: string;
  quality?: QualityResult;
}

type ValidatedPhoto = PhotoState & { identifyStatus: 'valid'; minioUrl: string };
```

### State Transitions

```
domain --select--> style --select--> upload --barrier--> generate --done--> result
  ^                  ^                  ^                    |
  +------------------+------------------+                    |
         browser back / progress click                       v
                                                   error --retry--> generate
```

### Barrier Check (before entering Step 4)

1. At least 1 photo with `identifyStatus === 'valid'`
2. Zero photos with `identifyStatus === 'invalid'` (must delete invalid ones first)
3. All photos have `uploadStatus === 'uploaded'`
4. User is authenticated (show AuthModal if not)
5. Credits >= template.price_credits (redirect to pricing if insufficient)

### URL Sync

A `useStepFlowUrl` hook provides bidirectional sync between state and `searchParams`:
- Forward: dispatch action -> update state -> `router.replace` with new params
- Backward: `popstate` event -> restore state from searchParams

## Identify Flow Redesign

### Current (Serial Blocking)

```
photo -> identify() --wait-- -> upload() --wait-- -> next photo
```

### New (Parallel Non-Blocking)

```
photo -> [identify() | upload()]  -> async UI update (checkmark/warning on card)
```

- identify and upload run concurrently per photo
- Results update photo cards asynchronously (green check / red warning overlay)
- User can continue uploading while earlier photos are being processed
- Barrier check at Step 3 -> Step 4 transition ensures all photos are validated

### Degradation

If identify API fails entirely, photos are marked `identifyStatus: 'error'` with a soft warning. User can choose to proceed (skip validation) or retry.

## Credits: Freeze Model

### Current Problem

```
createGeneration(deduct credits) -> generate -> failure -> refund(credits)
                                                            ^ this can also fail
```

### New Model

```
freezeCredits(amount) -> generate -> success -> deductFrozenCredits()
                                  -> failure -> unfreezCredits()
```

### Database Change

```prisma
model profiles {
  // existing fields...
  frozen_credits  Int @default(0)
}
```

Available credits = `credits - frozen_credits`

### New API Endpoints

```
POST /api/credits/freeze    { amount, generation_id }
POST /api/credits/deduct    { generation_id }
POST /api/credits/unfreeze  { generation_id }
```

Backend timeout job: auto-unfreeze credits frozen > 10 minutes (safety net).

## Step UI Design

### Step 1: Domain Selection (StepDomain)

- Dark background (obsidian), full-screen
- 2x4 grid (desktop), single column (mobile)
- Each domain card: full-bleed image + icon + title + hover description
- Reuses `DOMAIN_CONFIG` and `DOMAIN_IMAGES` from HomePage
- Animation: FadeIn stagger, selected card scales up + others fade out -> transition to Step 2

### Step 2: Template Selection (StepStyle)

- Dark background, 3-column template grid
- Reuses card design from `CreateDomainPageContent`
- Selected template: gold border + `StyleTagPanel`-style highlight pulse
- Insufficient credits: lock overlay on card
- Bottom fixed bar: selected template info + "下一步" button
- Animation: selection triggers Hero-style gold pulse on preview image

### Step 3: Photo Upload (StepUpload)

- Light background (alabaster), centered layout
- Main upload area: reuses `UploadBox` shared primitive (dashed border + Upload icon)
- Photo thumbnails grid with per-photo status indicators:
  - Uploading: spinning ring
  - Identifying: subtle pulse
  - Valid: green check
  - Invalid: red X + description
- Bottom fixed bar: `N photos ready` + "开始创作" button
- No projectName field (auto-generated as `{templateName} . {timestamp}`)
- No shareToGallery checkbox (moved to result page)

### Step 4: Generation + Results (StepGenerate)

**Phase A: Generating** (dark, immersive)
- Background: user's first photo, blurred + darkened
- Foreground: `ScanningLine` animates top to bottom (gold)
- Progress text: "正在雕琢光影..." / "AI 解析面部特征中..." / "构筑视觉叙事..."
- No user interaction needed

**Phase B: Completion** (transition)
- `ScanningLine` fades out
- Result images fade in (Hero-style autoAlpha transition)
- `SuccessBadge` ("杰作已成") pops up with `back.out(2)` ease
- Brief hold, then transition to results layout

**Phase C: Results** (light)
- Result images grid (reuses `GenerationResults` card design)
- Actions: download, favorite, share to gallery, view full-size
- Editable project name (auto-generated, modifiable)
- Navigation: back to dashboard, create another

## Shared Animation Primitives

Extracted from `HeroProcessAnimation.tsx` into `app/components/shared-animations/`:

| Component | Props | Hero Usage | StepFlow Usage |
|-----------|-------|------------|----------------|
| `UploadBox` | `ref`, `className` | Layer 1: dashed box + pulse | Step 3: empty upload area |
| `StyleTagPanel` | `ref`, `tags[]`, `activeTag?` | Layer 3: style tag overlay | Step 2: selection highlight |
| `ScanningLine` | `ref`, `className` | Layer 4: gold scan line | Step 4: generation progress |
| `SuccessBadge` | `ref`, `text`, `className` | Layer 5: completion badge | Step 4: generation complete |

Each component exposes a `ref` for GSAP timeline integration. Hero and StepFlow each compose their own timelines using these primitives.

**Refactored Hero** composes shared primitives instead of inline elements.

## Error Handling

| Scenario | Handling |
|----------|----------|
| identify API timeout/failure | Photo marked `error`, soft warning, allow skip (degradation) |
| Photo has no person | Photo marked `invalid`, red overlay, barrier check blocks Step 4 |
| MinIO upload failure | Fallback to dataUrl, no blocking |
| generate-stream failure | Step 4 shows error state + "重新生成" button, triggers credit unfreeze |
| Credit freeze failure | Toast "系统繁忙", stay on Step 3 |
| Network disconnection | Global toast, Step 4 supports retry |

## Edge Cases

| Case | Handling |
|------|----------|
| Direct entry `/create?template=xxx` | Skip Step 1/2, start at Step 3 |
| Direct entry `/create?domain=wedding` | Skip Step 1, start at Step 2 |
| Browser back | URL params restore previous step state |
| Page refresh during generation | Generation task lost; frozen credits auto-unfreeze via backend timeout (10min) |
| Legacy URL `/create?templateId=xxx` | Redirect to `/create?template=xxx` |
| Legacy URL `/create/[domain]` | Redirect to `/create?domain=[domain]` |

## Files Affected

### New Files
- `app/components/StepFlow.tsx` -- Main container + state machine
- `app/components/step-flow/StepDomain.tsx`
- `app/components/step-flow/StepStyle.tsx`
- `app/components/step-flow/StepUpload.tsx`
- `app/components/step-flow/StepGenerate.tsx`
- `app/components/step-flow/StepProgress.tsx`
- `app/components/shared-animations/ScanningLine.tsx`
- `app/components/shared-animations/UploadBox.tsx`
- `app/components/shared-animations/StyleTagPanel.tsx`
- `app/components/shared-animations/SuccessBadge.tsx`
- `app/components/shared-animations/index.ts`
- `app/types/step-flow.ts` -- State machine types
- `app/hooks/useStepFlow.ts` -- State machine reducer + URL sync
- `app/hooks/useParallelPhotoUpload.ts` -- Parallel identify + upload logic
- `app/api/credits/freeze/route.ts`
- `app/api/credits/deduct/route.ts`
- `app/api/credits/unfreeze/route.ts`

### Modified Files
- `app/create/page.tsx` -- Replace with StepFlow container
- `app/create/[domain]/page.tsx` -- Redirect to `/create?domain=xxx`
- `app/components/HeroProcessAnimation.tsx` -- Refactor to use shared primitives
- `app/components/HomePage.tsx` -- CTA links to `/create`
- `app/hooks/usePhotoUpload.ts` -- Refactor to parallel mode (or replace with useParallelPhotoUpload)
- `app/lib/generation-service.ts` -- Integrate credit freeze/deduct/unfreeze
- `prisma/schema.prisma` -- Add `frozen_credits` to profiles

### Potentially Removable (after migration)
- `app/components/CreatePage.tsx` -- Replaced by StepFlow
- `app/components/CreateDomainPageContent.tsx` -- Replaced by StepFlow
- `app/components/GenerationProgress.tsx` -- Replaced by StepGenerate Phase A
- `app/hooks/useImageGeneration.ts` -- Logic absorbed into useStepFlow
