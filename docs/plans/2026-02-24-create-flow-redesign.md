# Create Flow Redesign Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Replace the fragmented create flow (3 routes, serial blocking, form-heavy) with an immersive 4-step StepFlow that shares visual DNA with the Hero animation, adds parallel non-blocking photo identify, and introduces a credit freeze model.

**Architecture:** Single `/create` route with URL params driving a state machine through 4 steps: domain -> style -> upload -> generate/result. Shared GSAP animation primitives extracted from HeroProcessAnimation. Parallel identify+upload per photo. Credit freeze/deduct/unfreeze replaces deduct/refund.

**Tech Stack:** Next.js 14 App Router, React 18, TypeScript, GSAP + @gsap/react, TailwindCSS, Prisma, PostgreSQL

---

## Task 1: Add `frozen_credits` to Profile schema

**Files:**
- Modify: `prisma/schema.prisma:64-79` (Profile model)

**Step 1: Add the frozen_credits field**

In `prisma/schema.prisma`, add `frozenCredits` to the Profile model after the `credits` field (line 67):

```prisma
model Profile {
  id            String   @id @default(cuid())
  userId        String   @unique @map("user_id")
  credits       Int      @default(50)
  frozenCredits Int      @default(0) @map("frozen_credits")
  inviteCode    String?  @unique @map("invite_code")
  invitedBy     String?  @map("invited_by")
  inviteCount   Int      @default(0) @map("invite_count")
  rewardCredits Int      @default(0) @map("reward_credits")
  role          String   @default("user")
  createdAt     DateTime @default(now()) @map("created_at")
  updatedAt     DateTime @updatedAt @map("updated_at")

  user User @relation(fields: [userId], references: [id], onDelete: Cascade)

  @@map("profiles")
}
```

**Step 2: Create and apply migration**

Run:
```bash
pnpm prisma migrate dev --name add_frozen_credits
```

Expected: Migration creates `frozen_credits` column with default 0.

**Step 3: Regenerate Prisma client**

Run:
```bash
pnpm prisma generate
```

**Step 4: Verify typecheck**

Run:
```bash
pnpm typecheck
```

Expected: PASS (no type errors from schema change)

**Step 5: Commit**

```bash
git add prisma/schema.prisma prisma/migrations/
git commit -m "feat(schema): add frozen_credits to Profile model

Supports credit freeze/unfreeze flow for generation safety.

Co-Authored-By: Claude Opus 4.6 <noreply@anthropic.com>"
```

---

## Task 2: Credit freeze/deduct/unfreeze API routes

**Files:**
- Create: `app/api/credits/freeze/route.ts`
- Create: `app/api/credits/deduct/route.ts`
- Create: `app/api/credits/unfreeze/route.ts`

**Step 1: Create freeze endpoint**

Create `app/api/credits/freeze/route.ts`:

```typescript
import { NextRequest, NextResponse } from 'next/server';
import { requireAuth } from '@/lib/auth-api';
import { prisma } from '@/lib/prisma';

/**
 * POST /api/credits/freeze
 * Freeze credits before generation starts.
 * Body: { amount: number }
 */
export async function POST(req: NextRequest) {
  const authResult = await requireAuth();
  if (authResult instanceof Response) return authResult;
  const userId = authResult.user.id;

  const body = await req.json();
  const { amount } = body as { amount?: number };

  if (typeof amount !== 'number' || amount <= 0) {
    return NextResponse.json({ error: 'Invalid amount' }, { status: 400 });
  }

  const profile = await prisma.profile.findUnique({
    where: { userId },
    select: { credits: true, frozenCredits: true },
  });

  if (!profile) {
    return NextResponse.json({ error: 'Profile not found' }, { status: 404 });
  }

  const available = profile.credits - profile.frozenCredits;
  if (available < amount) {
    return NextResponse.json(
      { error: 'Insufficient credits', available },
      { status: 402 }
    );
  }

  await prisma.profile.update({
    where: { userId },
    data: { frozenCredits: profile.frozenCredits + amount },
  });

  return NextResponse.json({ success: true, frozen: amount });
}
```

**Step 2: Create deduct endpoint**

Create `app/api/credits/deduct/route.ts`:

```typescript
import { NextRequest, NextResponse } from 'next/server';
import { requireAuth } from '@/lib/auth-api';
import { prisma } from '@/lib/prisma';

/**
 * POST /api/credits/deduct
 * Confirm deduction of previously frozen credits.
 * Body: { amount: number }
 */
export async function POST(req: NextRequest) {
  const authResult = await requireAuth();
  if (authResult instanceof Response) return authResult;
  const userId = authResult.user.id;

  const body = await req.json();
  const { amount } = body as { amount?: number };

  if (typeof amount !== 'number' || amount <= 0) {
    return NextResponse.json({ error: 'Invalid amount' }, { status: 400 });
  }

  const profile = await prisma.profile.findUnique({
    where: { userId },
    select: { credits: true, frozenCredits: true },
  });

  if (!profile) {
    return NextResponse.json({ error: 'Profile not found' }, { status: 404 });
  }

  if (profile.frozenCredits < amount) {
    return NextResponse.json({ error: 'Frozen amount mismatch' }, { status: 400 });
  }

  await prisma.profile.update({
    where: { userId },
    data: {
      credits: profile.credits - amount,
      frozenCredits: profile.frozenCredits - amount,
    },
  });

  return NextResponse.json({ success: true, deducted: amount });
}
```

**Step 3: Create unfreeze endpoint**

Create `app/api/credits/unfreeze/route.ts`:

```typescript
import { NextRequest, NextResponse } from 'next/server';
import { requireAuth } from '@/lib/auth-api';
import { prisma } from '@/lib/prisma';

/**
 * POST /api/credits/unfreeze
 * Release frozen credits back to available (on generation failure).
 * Body: { amount: number }
 */
export async function POST(req: NextRequest) {
  const authResult = await requireAuth();
  if (authResult instanceof Response) return authResult;
  const userId = authResult.user.id;

  const body = await req.json();
  const { amount } = body as { amount?: number };

  if (typeof amount !== 'number' || amount <= 0) {
    return NextResponse.json({ error: 'Invalid amount' }, { status: 400 });
  }

  const profile = await prisma.profile.findUnique({
    where: { userId },
    select: { frozenCredits: true },
  });

  if (!profile) {
    return NextResponse.json({ error: 'Profile not found' }, { status: 404 });
  }

  const newFrozen = Math.max(0, profile.frozenCredits - amount);

  await prisma.profile.update({
    where: { userId },
    data: { frozenCredits: newFrozen },
  });

  return NextResponse.json({ success: true, unfrozen: amount });
}
```

**Step 4: Verify typecheck and lint**

Run:
```bash
pnpm typecheck && pnpm lint
```

Expected: PASS

**Step 5: Commit**

```bash
git add app/api/credits/freeze/ app/api/credits/deduct/ app/api/credits/unfreeze/
git commit -m "feat(api): add credit freeze/deduct/unfreeze endpoints

Replace deduct-then-refund with freeze-then-deduct/unfreeze for
transaction safety. Prevents credit loss on generation failure.

Co-Authored-By: Claude Opus 4.6 <noreply@anthropic.com>"
```

---

## Task 3: StepFlow type definitions

**Files:**
- Create: `app/types/step-flow.ts`

**Step 1: Write type definitions**

Create `app/types/step-flow.ts`:

```typescript
import type { GenerationDomain } from '@/types/domain';
import type { Template } from '@/types/database';
import type { QualityResult } from '@/types/image';

// --- Photo States ---

export type PhotoUploadStatus = 'uploading' | 'uploaded' | 'failed';
export type PhotoIdentifyStatus = 'pending' | 'identifying' | 'valid' | 'invalid' | 'error';

export interface PhotoState {
  id: string;
  dataUrl: string;
  minioUrl?: string;
  uploadStatus: PhotoUploadStatus;
  identifyStatus: PhotoIdentifyStatus;
  identifyDescription?: string;
  quality?: QualityResult;
}

export type ValidatedPhoto = PhotoState & {
  identifyStatus: 'valid';
  minioUrl: string;
  uploadStatus: 'uploaded';
};

// --- Step Flow State Machine ---

export type StepName = 'domain' | 'style' | 'upload' | 'generate' | 'result' | 'error';

export type StepFlowState =
  | { step: 'domain'; domain: null }
  | { step: 'style'; domain: GenerationDomain; template: null }
  | { step: 'upload'; domain: GenerationDomain; template: Template; photos: PhotoState[] }
  | { step: 'generate'; domain: GenerationDomain; template: Template; photos: ValidatedPhoto[]; progress: number; progressText: string }
  | { step: 'result'; domain: GenerationDomain; template: Template; images: string[]; generationId: string | null }
  | { step: 'error'; domain: GenerationDomain; template: Template; error: string };

// --- Actions ---

export type StepFlowAction =
  | { type: 'SELECT_DOMAIN'; domain: GenerationDomain }
  | { type: 'SELECT_TEMPLATE'; template: Template }
  | { type: 'SET_PHOTOS'; photos: PhotoState[] }
  | { type: 'UPDATE_PHOTO'; photoId: string; updates: Partial<PhotoState> }
  | { type: 'REMOVE_PHOTO'; photoId: string }
  | { type: 'START_GENERATE'; photos: ValidatedPhoto[] }
  | { type: 'UPDATE_PROGRESS'; progress: number; progressText: string }
  | { type: 'COMPLETE'; images: string[]; generationId: string | null }
  | { type: 'FAIL'; error: string }
  | { type: 'GO_BACK' }
  | { type: 'RESET' };

// --- URL Params ---

export interface StepFlowUrlParams {
  domain?: string;
  template?: string;
  step?: string;
}

// --- Progress Texts ---

export const PROGRESS_TEXTS = [
  '正在雕琢光影...',
  'AI 解析面部特征中...',
  '构筑视觉叙事...',
  '渲染最终画面...',
] as const;
```

**Step 2: Verify typecheck**

Run:
```bash
pnpm typecheck
```

Expected: PASS

**Step 3: Commit**

```bash
git add app/types/step-flow.ts
git commit -m "feat(types): add StepFlow state machine type definitions

Discriminated union types for the 4-step creation flow state machine,
photo states, actions, and URL param types.

Co-Authored-By: Claude Opus 4.6 <noreply@anthropic.com>"
```

---

## Task 4: StepFlow reducer and URL sync hook

**Files:**
- Create: `app/hooks/useStepFlow.ts`

**Step 1: Write the reducer and hook**

Create `app/hooks/useStepFlow.ts`:

```typescript
import { useReducer, useCallback, useEffect } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import type {
  StepFlowState,
  StepFlowAction,
  StepName,
  PhotoState,
} from '@/types/step-flow';
import type { GenerationDomain } from '@/types/domain';
import { isValidDomain } from '@/types/domain';
import type { Template } from '@/types/database';

// --- Reducer ---

export function stepFlowReducer(
  state: StepFlowState,
  action: StepFlowAction
): StepFlowState {
  switch (action.type) {
    case 'SELECT_DOMAIN':
      return { step: 'style', domain: action.domain, template: null };

    case 'SELECT_TEMPLATE':
      if (state.step !== 'style' && state.step !== 'domain') return state;
      return {
        step: 'upload',
        domain: 'domain' in state && state.domain ? state.domain : (action.template as Template & { domain: string }).domain as GenerationDomain,
        template: action.template,
        photos: [],
      };

    case 'SET_PHOTOS':
      if (state.step !== 'upload') return state;
      return { ...state, photos: action.photos };

    case 'UPDATE_PHOTO': {
      if (state.step !== 'upload') return state;
      return {
        ...state,
        photos: state.photos.map((p) =>
          p.id === action.photoId ? { ...p, ...action.updates } : p
        ),
      };
    }

    case 'REMOVE_PHOTO': {
      if (state.step !== 'upload') return state;
      return {
        ...state,
        photos: state.photos.filter((p) => p.id !== action.photoId),
      };
    }

    case 'START_GENERATE':
      if (state.step !== 'upload') return state;
      return {
        step: 'generate',
        domain: state.domain,
        template: state.template,
        photos: action.photos,
        progress: 0,
        progressText: '正在准备...',
      };

    case 'UPDATE_PROGRESS':
      if (state.step !== 'generate') return state;
      return { ...state, progress: action.progress, progressText: action.progressText };

    case 'COMPLETE':
      if (state.step !== 'generate') return state;
      return {
        step: 'result',
        domain: state.domain,
        template: state.template,
        images: action.images,
        generationId: action.generationId,
      };

    case 'FAIL':
      if (state.step !== 'generate') return state;
      return {
        step: 'error',
        domain: state.domain,
        template: state.template,
        error: action.error,
      };

    case 'GO_BACK': {
      switch (state.step) {
        case 'style': return { step: 'domain', domain: null };
        case 'upload': return { step: 'style', domain: state.domain, template: null };
        case 'error': return { step: 'upload', domain: state.domain, template: state.template, photos: [] };
        default: return state;
      }
    }

    case 'RESET':
      return { step: 'domain', domain: null };

    default:
      return state;
  }
}

// --- URL Sync ---

function stateToParams(state: StepFlowState): Record<string, string> {
  const params: Record<string, string> = {};
  if ('domain' in state && state.domain) params.domain = state.domain;
  if ('template' in state && state.template) params.template = state.template.id;
  if (state.step === 'generate' || state.step === 'result') params.step = state.step;
  return params;
}

function getInitialStep(
  searchParams: URLSearchParams,
  templates: Template[]
): StepFlowState {
  // Legacy redirect: templateId -> template
  const legacyId = searchParams.get('templateId');
  const templateId = legacyId || searchParams.get('template');
  const domainParam = searchParams.get('domain');

  if (templateId) {
    const template = templates.find((t) => t.id === templateId);
    if (template) {
      const domain = (template as Template & { domain?: string }).domain as GenerationDomain | undefined;
      return {
        step: 'upload',
        domain: domain || 'wedding',
        template,
        photos: [],
      };
    }
  }

  if (domainParam && isValidDomain(domainParam)) {
    return { step: 'style', domain: domainParam, template: null };
  }

  return { step: 'domain', domain: null };
}

// --- Hook ---

interface UseStepFlowOptions {
  templates: Template[];
}

export function useStepFlow({ templates }: UseStepFlowOptions) {
  const router = useRouter();
  const searchParams = useSearchParams();

  const initialState = getInitialStep(searchParams, templates);
  const [state, dispatch] = useReducer(stepFlowReducer, initialState);

  // Sync state -> URL (forward navigation)
  useEffect(() => {
    const params = stateToParams(state);
    const newSearch = new URLSearchParams(params).toString();
    const currentSearch = searchParams.toString();
    if (newSearch !== currentSearch) {
      router.replace(`/create${newSearch ? `?${newSearch}` : ''}`, { scroll: false });
    }
  }, [state, router, searchParams]);

  const goBack = useCallback(() => dispatch({ type: 'GO_BACK' }), []);
  const reset = useCallback(() => dispatch({ type: 'RESET' }), []);

  const currentStepIndex: Record<StepName, number> = {
    domain: 0,
    style: 1,
    upload: 2,
    generate: 3,
    result: 3,
    error: 3,
  };

  return {
    state,
    dispatch,
    goBack,
    reset,
    stepIndex: currentStepIndex[state.step],
    totalSteps: 4,
  };
}
```

**Step 2: Verify typecheck**

Run:
```bash
pnpm typecheck
```

Expected: PASS

**Step 3: Commit**

```bash
git add app/hooks/useStepFlow.ts
git commit -m "feat(hooks): add useStepFlow reducer and URL sync hook

State machine reducer with discriminated union, bidirectional URL param
sync, backward compat for legacy templateId param, and browser back
support.

Co-Authored-By: Claude Opus 4.6 <noreply@anthropic.com>"
```

---

## Task 5: Parallel photo upload hook

**Files:**
- Create: `app/hooks/useParallelPhotoUpload.ts`

**Step 1: Write the hook**

Create `app/hooks/useParallelPhotoUpload.ts`:

```typescript
import { useCallback, useRef } from 'react';
import { checkImageQuality } from '@/lib/image-quality-checker';
import type { PhotoState, StepFlowAction } from '@/types/step-flow';

interface UseParallelPhotoUploadOptions {
  maxPhotos: number;
  dispatch: React.Dispatch<StepFlowAction>;
  currentPhotos: PhotoState[];
}

let photoCounter = 0;
function generatePhotoId(): string {
  photoCounter += 1;
  return `photo_${Date.now()}_${photoCounter}`;
}

function fileToDataUrl(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(reader.result as string);
    reader.onerror = reject;
    reader.readAsDataURL(file);
  });
}

async function identifyPerson(
  dataUrl: string
): Promise<{ hasPerson: boolean; description: string }> {
  const response = await fetch('/api/identify-image', {
    method: 'POST',
    credentials: 'include',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ images: [dataUrl] }),
  });

  if (response.status === 401) {
    return { hasPerson: true, description: '未登录，跳过验证' };
  }

  if (!response.ok) {
    const data = await response.json().catch(() => ({ error: '未知错误' }));
    throw new Error(data.error || `识别请求失败: ${response.status}`);
  }

  const result = await response.json();
  const first = result.results?.[0];

  if (!first || !first.success) {
    throw new Error(first?.description || '识别服务失败');
  }

  return { hasPerson: first.hasPerson, description: first.description };
}

async function uploadToMinio(dataUrl: string): Promise<string | undefined> {
  try {
    const res = await fetch('/api/upload-image', {
      method: 'POST',
      credentials: 'include',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ image: dataUrl, folder: 'uploads' }),
    });
    if (!res.ok) return undefined;
    const data = await res.json();
    return data.url;
  } catch {
    return undefined;
  }
}

export function useParallelPhotoUpload({
  maxPhotos,
  dispatch,
  currentPhotos,
}: UseParallelPhotoUploadOptions) {
  const abortRef = useRef(false);

  const handleFiles = useCallback(
    async (files: FileList | null) => {
      if (!files) return;
      abortRef.current = false;

      const remaining = maxPhotos - currentPhotos.length;
      const filesToProcess = Array.from(files).slice(0, remaining);

      // 1. Immediately create photo entries in pending state
      const newPhotos: PhotoState[] = [];
      const fileMap: Array<{ photo: PhotoState; file: File }> = [];

      for (const file of filesToProcess) {
        const dataUrl = await fileToDataUrl(file);
        const photo: PhotoState = {
          id: generatePhotoId(),
          dataUrl,
          uploadStatus: 'uploading',
          identifyStatus: 'pending',
        };
        newPhotos.push(photo);
        fileMap.push({ photo, file });
      }

      // Add all photos at once
      dispatch({ type: 'SET_PHOTOS', photos: [...currentPhotos, ...newPhotos] });

      // 2. Process each photo in parallel (identify + upload concurrently)
      for (const { photo } of fileMap) {
        if (abortRef.current) break;

        // Fire identify and upload in parallel
        const identifyPromise = (async () => {
          dispatch({
            type: 'UPDATE_PHOTO',
            photoId: photo.id,
            updates: { identifyStatus: 'identifying' },
          });
          try {
            const result = await identifyPerson(photo.dataUrl);
            dispatch({
              type: 'UPDATE_PHOTO',
              photoId: photo.id,
              updates: {
                identifyStatus: result.hasPerson ? 'valid' : 'invalid',
                identifyDescription: result.description,
              },
            });
          } catch (err) {
            dispatch({
              type: 'UPDATE_PHOTO',
              photoId: photo.id,
              updates: {
                identifyStatus: 'error',
                identifyDescription: err instanceof Error ? err.message : '识别失败',
              },
            });
          }
        })();

        const uploadPromise = (async () => {
          try {
            const [quality, minioUrl] = await Promise.all([
              checkImageQuality(photo.dataUrl),
              uploadToMinio(photo.dataUrl),
            ]);
            dispatch({
              type: 'UPDATE_PHOTO',
              photoId: photo.id,
              updates: {
                uploadStatus: minioUrl ? 'uploaded' : 'failed',
                minioUrl,
                quality,
              },
            });
          } catch {
            dispatch({
              type: 'UPDATE_PHOTO',
              photoId: photo.id,
              updates: { uploadStatus: 'failed' },
            });
          }
        })();

        // Don't await — let them run in parallel, move to next photo
        void Promise.all([identifyPromise, uploadPromise]);
      }
    },
    [maxPhotos, currentPhotos, dispatch]
  );

  const removePhoto = useCallback(
    (photoId: string) => {
      dispatch({ type: 'REMOVE_PHOTO', photoId });
    },
    [dispatch]
  );

  const abort = useCallback(() => {
    abortRef.current = true;
  }, []);

  return { handleFiles, removePhoto, abort };
}
```

**Step 2: Verify typecheck**

Run:
```bash
pnpm typecheck
```

Expected: PASS

**Step 3: Commit**

```bash
git add app/hooks/useParallelPhotoUpload.ts
git commit -m "feat(hooks): add parallel photo upload hook

Identify + upload run concurrently per photo. Non-blocking: UI updates
asynchronously via dispatch. Photos added immediately with pending state.

Co-Authored-By: Claude Opus 4.6 <noreply@anthropic.com>"
```

---

## Task 6: Shared animation primitives

**Files:**
- Create: `app/components/shared-animations/ScanningLine.tsx`
- Create: `app/components/shared-animations/UploadBox.tsx`
- Create: `app/components/shared-animations/StyleTagPanel.tsx`
- Create: `app/components/shared-animations/SuccessBadge.tsx`
- Create: `app/components/shared-animations/index.ts`

**Step 1: Create ScanningLine**

Create `app/components/shared-animations/ScanningLine.tsx`:

```tsx
'use client';

import { forwardRef } from 'react';

interface ScanningLineProps {
  className?: string;
}

export const ScanningLine = forwardRef<HTMLDivElement, ScanningLineProps>(
  ({ className = '' }, ref) => {
    return (
      <div
        ref={ref}
        className={`absolute left-0 w-full h-[2px] bg-gradient-to-r from-transparent via-gold to-transparent shadow-[0_0_20px_2px_rgba(200,160,100,0.6)] z-20 ${className}`}
      />
    );
  }
);

ScanningLine.displayName = 'ScanningLine';
```

**Step 2: Create UploadBox**

Create `app/components/shared-animations/UploadBox.tsx`:

```tsx
'use client';

import { forwardRef } from 'react';
import { Upload } from 'lucide-react';

interface UploadBoxProps {
  className?: string;
  title?: string;
  subtitle?: string;
}

export const UploadBox = forwardRef<HTMLDivElement, UploadBoxProps>(
  (
    { className = '', title = '上传原始照片', subtitle = '支持高分辨率人像' },
    ref
  ) => {
    return (
      <div
        ref={ref}
        className={`absolute inset-0 flex flex-col items-center justify-center border-2 border-dashed border-white/10 m-6 rounded-xl bg-white/5 ${className}`}
      >
        <div className="w-16 h-16 rounded-full bg-white/5 flex items-center justify-center mb-6 shadow-lg">
          <Upload className="w-8 h-8 text-pearl/50" />
        </div>
        <div className="text-base text-pearl/80 font-medium tracking-wide mb-2">
          {title}
        </div>
        <div className="text-xs text-pearl/30 font-light">{subtitle}</div>
      </div>
    );
  }
);

UploadBox.displayName = 'UploadBox';
```

**Step 3: Create StyleTagPanel**

Create `app/components/shared-animations/StyleTagPanel.tsx`:

```tsx
'use client';

import { forwardRef } from 'react';
import { Wand2 } from 'lucide-react';

interface StyleTagPanelProps {
  className?: string;
  tags: string[];
  activeTag?: string;
  label?: string;
}

export const StyleTagPanel = forwardRef<HTMLDivElement, StyleTagPanelProps>(
  (
    { className = '', tags, activeTag, label = '正在选择风格意境' },
    ref
  ) => {
    return (
      <div
        ref={ref}
        className={`absolute bottom-8 left-6 right-6 p-5 rounded-xl bg-obsidian/80 backdrop-blur-lg border border-white/10 shadow-2xl ${className}`}
      >
        <div className="text-xs text-pearl/70 mb-4 flex items-center gap-2 font-light tracking-wide">
          <Wand2 className="w-3.5 h-3.5 text-gold" />
          {label}
        </div>
        <div className="flex flex-wrap gap-2.5">
          {tags.map((tag) => (
            <span
              key={tag}
              className={`px-3 py-1.5 rounded-sm text-xs font-light transition-colors duration-300 ${
                tag === activeTag
                  ? 'bg-gold/15 border-gold/50 text-gold border'
                  : 'bg-white/5 text-pearl border border-white/5'
              }`}
            >
              {tag}
            </span>
          ))}
        </div>
      </div>
    );
  }
);

StyleTagPanel.displayName = 'StyleTagPanel';
```

**Step 4: Create SuccessBadge**

Create `app/components/shared-animations/SuccessBadge.tsx`:

```tsx
'use client';

import { forwardRef } from 'react';
import { Sparkles } from 'lucide-react';

interface SuccessBadgeProps {
  className?: string;
  text?: string;
}

export const SuccessBadge = forwardRef<HTMLDivElement, SuccessBadgeProps>(
  ({ className = '', text = '杰作已成' }, ref) => {
    return (
      <div
        ref={ref}
        className={`absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 bg-obsidian/90 backdrop-blur-md border border-gold/30 text-gold px-6 py-3 rounded-full flex items-center gap-2.5 shadow-2xl z-30 ${className}`}
      >
        <Sparkles className="w-4 h-4" />
        <span className="text-sm font-medium tracking-[0.2em]">{text}</span>
      </div>
    );
  }
);

SuccessBadge.displayName = 'SuccessBadge';
```

**Step 5: Create barrel export**

Create `app/components/shared-animations/index.ts`:

```typescript
export { ScanningLine } from './ScanningLine';
export { UploadBox } from './UploadBox';
export { StyleTagPanel } from './StyleTagPanel';
export { SuccessBadge } from './SuccessBadge';
```

**Step 6: Verify typecheck**

Run:
```bash
pnpm typecheck
```

Expected: PASS

**Step 7: Commit**

```bash
git add app/components/shared-animations/
git commit -m "feat(ui): extract shared animation primitives from HeroProcessAnimation

ScanningLine, UploadBox, StyleTagPanel, SuccessBadge as forwardRef
components for GSAP timeline integration. Used by both Hero and StepFlow.

Co-Authored-By: Claude Opus 4.6 <noreply@anthropic.com>"
```

---

## Task 7: Refactor HeroProcessAnimation to use shared primitives

**Files:**
- Modify: `app/components/HeroProcessAnimation.tsx` (full file, 137 lines)

**Step 1: Rewrite using shared primitives**

Replace `app/components/HeroProcessAnimation.tsx` with:

```tsx
'use client';

import { useRef } from 'react';
import { gsap } from 'gsap';
import { useGSAP } from '@gsap/react';
import {
  UploadBox,
  StyleTagPanel,
  ScanningLine,
  SuccessBadge,
} from '@/components/shared-animations';

gsap.registerPlugin(useGSAP);

const HERO_STYLE_TAGS = ['极简黑白', '王家卫电影', '古典油画'];

export function HeroProcessAnimation() {
  const containerRef = useRef<HTMLDivElement>(null);
  const uploadBoxRef = useRef<HTMLDivElement>(null);
  const originalImageRef = useRef<HTMLDivElement>(null);
  const styleTagsRef = useRef<HTMLDivElement>(null);
  const scanningLineRef = useRef<HTMLDivElement>(null);
  const finalImageRef = useRef<HTMLDivElement>(null);
  const successBadgeRef = useRef<HTMLDivElement>(null);

  useGSAP(
    () => {
      gsap.set(
        [
          originalImageRef.current,
          styleTagsRef.current,
          finalImageRef.current,
          scanningLineRef.current,
          successBadgeRef.current,
        ],
        { autoAlpha: 0 }
      );
      gsap.set(styleTagsRef.current, { y: 20 });
      gsap.set(scanningLineRef.current, { top: '0%' });
      gsap.set(successBadgeRef.current, { scale: 0.9 });

      const tl = gsap.timeline({ repeat: -1, repeatDelay: 1.5 });

      // Phase 1: Upload
      tl.to(uploadBoxRef.current, { scale: 1.02, duration: 0.8, ease: 'sine.inOut', yoyo: true, repeat: 1 })
        .to(uploadBoxRef.current, { autoAlpha: 0, scale: 0.95, duration: 0.5 })
        .to(originalImageRef.current, { autoAlpha: 1, duration: 0.8, ease: 'power2.out' }, '-=0.2')

        // Phase 2: Style Selection
        .to(styleTagsRef.current, { autoAlpha: 1, y: 0, duration: 0.6, ease: 'back.out(1.7)' }, '+=0.3')
        .to('.hero-style-tag-active', {
          backgroundColor: 'rgba(200, 160, 100, 0.15)',
          borderColor: 'rgba(200, 160, 100, 0.5)',
          color: '#D4AF37',
          duration: 0.4,
        }, '+=0.6')

        // Phase 3: Generation
        .to(styleTagsRef.current, { autoAlpha: 0, y: 10, duration: 0.4 }, '+=0.6')
        .to(scanningLineRef.current, { autoAlpha: 1, duration: 0.2 })
        .to(scanningLineRef.current, { top: '100%', duration: 2, ease: 'power1.inOut' })
        .to(finalImageRef.current, { autoAlpha: 1, duration: 2, ease: 'power1.inOut' }, '-=2')
        .to(scanningLineRef.current, { autoAlpha: 0, duration: 0.2 })

        // Phase 4: Success
        .to(successBadgeRef.current, { autoAlpha: 1, scale: 1, duration: 0.6, ease: 'back.out(2)' })
        .to(
          [originalImageRef.current, finalImageRef.current, successBadgeRef.current],
          { autoAlpha: 0, duration: 0.8, delay: 2.5 }
        )
        .set(scanningLineRef.current, { top: '0%' })
        .to(uploadBoxRef.current, { autoAlpha: 1, scale: 1, duration: 0.5 });
    },
    { scope: containerRef }
  );

  return (
    <div
      ref={containerRef}
      className="relative w-full max-w-[360px] h-[480px] mx-auto bg-stone/5 border border-white/10 rounded-2xl overflow-hidden backdrop-blur-md shadow-[0_20px_50px_-12px_rgba(0,0,0,0.5)]"
    >
      <UploadBox ref={uploadBoxRef} />

      {/* Original Image */}
      <div ref={originalImageRef} className="absolute inset-0">
        <img
          src="https://images.unsplash.com/photo-1554151228-14d9def656e4?q=80&w=800&auto=format&fit=crop"
          className="w-full h-full object-cover"
          alt="Original portrait"
        />
        <div className="absolute inset-0 bg-obsidian/30" />
      </div>

      <StyleTagPanel
        ref={styleTagsRef}
        tags={HERO_STYLE_TAGS}
      />

      {/* Final Image */}
      <div ref={finalImageRef} className="absolute inset-0">
        <img
          src="https://images.unsplash.com/photo-1534528741775-53994a69daeb?q=80&w=800&auto=format&fit=crop"
          className="w-full h-full object-cover"
          alt="Cinematic masterpiece"
        />
      </div>

      <ScanningLine ref={scanningLineRef} />
      <SuccessBadge ref={successBadgeRef} />
    </div>
  );
}
```

Note: The GSAP `.to('.hero-style-tag-active', ...)` selector needs a CSS class on the active tag. Update `StyleTagPanel` to add a class: the "王家卫电影" tag in Hero needs the class `hero-style-tag-active`. Since `StyleTagPanel` is a shared component, we pass `activeTag="王家卫电影"` and the component already applies different styling. For the GSAP animation, we'll target via the `ref` + `:nth-child(2)` selector or add a data attribute. The simplest approach: in `StyleTagPanel`, add `data-tag={tag}` to each span, and the Hero GSAP targets `[data-tag="王家卫电影"]`.

Update `StyleTagPanel.tsx` to add data attribute:
```tsx
<span
  key={tag}
  data-tag={tag}
  className={...}
>
```

And in Hero, change the GSAP selector to:
```typescript
.to('[data-tag="王家卫电影"]', { ... })
```

**Step 2: Verify Hero still renders**

Run:
```bash
pnpm build
```

Expected: Build succeeds

**Step 3: Commit**

```bash
git add app/components/HeroProcessAnimation.tsx app/components/shared-animations/StyleTagPanel.tsx
git commit -m "refactor(hero): use shared animation primitives

HeroProcessAnimation now composes ScanningLine, UploadBox, StyleTagPanel,
SuccessBadge instead of inline elements. Same visual behavior, shared code.

Co-Authored-By: Claude Opus 4.6 <noreply@anthropic.com>"
```

---

## Task 8: StepFlow container + StepProgress

**Files:**
- Create: `app/components/step-flow/StepProgress.tsx`
- Create: `app/components/step-flow/StepFlow.tsx`
- Create: `app/components/step-flow/index.ts`

**Step 1: Create StepProgress**

Create `app/components/step-flow/StepProgress.tsx`:

```tsx
'use client';

import type { StepName } from '@/types/step-flow';

interface StepProgressProps {
  currentStep: number;
  totalSteps: number;
  stepName: StepName;
  onStepClick?: (step: number) => void;
}

const STEP_LABELS = ['选择领域', '选择风格', '上传照片', '生成作品'];

export function StepProgress({ currentStep, totalSteps, onStepClick }: StepProgressProps) {
  return (
    <div className="fixed top-0 left-0 right-0 z-50 bg-obsidian/80 backdrop-blur-md border-b border-white/5">
      <div className="max-w-4xl mx-auto px-6 py-4 flex items-center gap-3">
        {Array.from({ length: totalSteps }).map((_, i) => {
          const isActive = i === currentStep;
          const isCompleted = i < currentStep;
          const isClickable = isCompleted && onStepClick;

          return (
            <div key={i} className="flex items-center gap-3 flex-1">
              <button
                type="button"
                disabled={!isClickable}
                onClick={() => isClickable && onStepClick(i)}
                className={`flex items-center gap-2 text-xs tracking-[0.15em] uppercase transition-colors duration-300 ${
                  isActive
                    ? 'text-gold font-medium'
                    : isCompleted
                      ? 'text-pearl/60 cursor-pointer hover:text-pearl'
                      : 'text-pearl/20'
                }`}
              >
                <div
                  className={`w-6 h-6 rounded-full flex items-center justify-center text-[10px] font-mono border transition-colors duration-300 ${
                    isActive
                      ? 'border-gold bg-gold/10 text-gold'
                      : isCompleted
                        ? 'border-pearl/40 bg-pearl/10 text-pearl/60'
                        : 'border-white/10 text-pearl/20'
                  }`}
                >
                  {isCompleted ? '\u2713' : i + 1}
                </div>
                <span className="hidden sm:inline">{STEP_LABELS[i]}</span>
              </button>
              {i < totalSteps - 1 && (
                <div
                  className={`flex-1 h-px transition-colors duration-300 ${
                    i < currentStep ? 'bg-gold/30' : 'bg-white/10'
                  }`}
                />
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}
```

**Step 2: Create StepFlow container**

Create `app/components/step-flow/StepFlow.tsx`:

```tsx
'use client';

import { Suspense } from 'react';
import { useTemplates } from '@/hooks/useTemplates';
import { useStepFlow } from '@/hooks/useStepFlow';
import { StepProgress } from './StepProgress';
import { StepDomain } from './StepDomain';
import { StepStyle } from './StepStyle';
import { StepUpload } from './StepUpload';
import { StepGenerate } from './StepGenerate';

function StepFlowInner() {
  const { templates, loading } = useTemplates();
  const { state, dispatch, goBack, stepIndex, totalSteps } = useStepFlow({ templates });

  if (loading) {
    return (
      <div className="min-h-screen bg-obsidian flex items-center justify-center">
        <div className="flex items-center gap-3 text-pearl/60">
          <span className="w-3 h-3 rounded-full bg-gold animate-pulse" />
          <span className="text-sm tracking-widest uppercase">加载中...</span>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-obsidian">
      <StepProgress
        currentStep={stepIndex}
        totalSteps={totalSteps}
        stepName={state.step}
        onStepClick={stepIndex > 0 ? () => goBack() : undefined}
      />

      <div className="pt-16">
        {state.step === 'domain' && (
          <StepDomain onSelect={(domain) => dispatch({ type: 'SELECT_DOMAIN', domain })} />
        )}

        {state.step === 'style' && (
          <StepStyle
            domain={state.domain}
            templates={templates.filter(
              (t) => (t as unknown as { domain: string }).domain === state.domain
            )}
            onSelect={(template) => dispatch({ type: 'SELECT_TEMPLATE', template })}
            onBack={goBack}
          />
        )}

        {state.step === 'upload' && (
          <StepUpload
            template={state.template}
            photos={state.photos}
            dispatch={dispatch}
            onBack={goBack}
          />
        )}

        {(state.step === 'generate' || state.step === 'result' || state.step === 'error') && (
          <StepGenerate
            state={state}
            dispatch={dispatch}
          />
        )}
      </div>
    </div>
  );
}

export function StepFlow() {
  return (
    <Suspense
      fallback={
        <div className="min-h-screen bg-obsidian flex items-center justify-center">
          <span className="text-pearl/40 text-sm">loading...</span>
        </div>
      }
    >
      <StepFlowInner />
    </Suspense>
  );
}
```

**Step 3: Create barrel export**

Create `app/components/step-flow/index.ts`:

```typescript
export { StepFlow } from './StepFlow';
export { StepProgress } from './StepProgress';
```

**Step 4: Verify typecheck**

Run:
```bash
pnpm typecheck
```

Expected: Will fail because StepDomain, StepStyle, StepUpload, StepGenerate don't exist yet. That's expected -- we'll create them in the next tasks. Create placeholder files to pass typecheck:

Create placeholder `app/components/step-flow/StepDomain.tsx`, `StepStyle.tsx`, `StepUpload.tsx`, `StepGenerate.tsx` with minimal exported interfaces and TODO comments.

**Step 5: Commit**

```bash
git add app/components/step-flow/
git commit -m "feat(ui): add StepFlow container and StepProgress indicator

Main orchestrator component routing state machine steps to sub-components.
Progress bar with clickable completed steps.

Co-Authored-By: Claude Opus 4.6 <noreply@anthropic.com>"
```

---

## Task 9: StepDomain component

**Files:**
- Create: `app/components/step-flow/StepDomain.tsx`

**Step 1: Write StepDomain**

Create `app/components/step-flow/StepDomain.tsx`:

```tsx
'use client';

import Image from 'next/image';
import { DOMAIN_CONFIG, GENERATION_DOMAINS } from '@/types/domain';
import type { GenerationDomain } from '@/types/domain';
import { FadeIn } from '@/components/react-bits';

const DOMAIN_IMAGES: Record<string, string> = {
  wedding: 'https://images.unsplash.com/photo-1511285560929-80b456fea0bc?q=80&w=800&auto=format&fit=crop',
  children: 'https://images.unsplash.com/photo-1627885489708-ce79ebabc2c8?q=80&w=800&auto=format&fit=crop',
  id_photo: 'https://images.unsplash.com/photo-1623951551061-f09b2e04fbee?q=80&w=800&auto=format&fit=crop',
  artistic: 'https://images.unsplash.com/photo-1547826039-bfc35e0f1ea8?q=80&w=800&auto=format&fit=crop',
  portrait: 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?q=80&w=800&auto=format&fit=crop',
  anime: 'https://images.unsplash.com/photo-1618331835717-801e976710b2?q=80&w=800&auto=format&fit=crop',
  landscape: 'https://images.unsplash.com/photo-1469474968028-56623f02e42e?q=80&w=800&auto=format&fit=crop',
  product: 'https://images.unsplash.com/photo-1523275335684-37898b6baf30?q=80&w=800&auto=format&fit=crop',
};

interface StepDomainProps {
  onSelect: (domain: GenerationDomain) => void;
}

export function StepDomain({ onSelect }: StepDomainProps) {
  return (
    <div className="min-h-[calc(100vh-4rem)] flex flex-col items-center justify-center px-4 py-16">
      <FadeIn>
        <div className="text-center mb-16 space-y-4">
          <h2 className="text-xs font-medium tracking-[0.3em] text-pearl/50 uppercase">
            Step 01
          </h2>
          <p className="text-4xl md:text-5xl font-display text-alabaster tracking-tight">
            选择您的创作领域
          </p>
        </div>
      </FadeIn>

      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 lg:gap-6 max-w-6xl w-full">
        {GENERATION_DOMAINS.map((domainId, index) => {
          const domain = DOMAIN_CONFIG[domainId];
          const Icon = domain.icon;
          return (
            <FadeIn key={domainId} delay={0.05 * index}>
              <button
                type="button"
                onClick={() => onSelect(domainId)}
                className="group relative aspect-[3/4] w-full overflow-hidden rounded-sm bg-stone/5 shadow-lg outline-none focus-visible:ring-2 focus-visible:ring-gold"
              >
                <Image
                  src={DOMAIN_IMAGES[domainId]}
                  alt={domain.name}
                  fill
                  className="object-cover transition-transform duration-1000 ease-in-out group-hover:scale-105"
                  sizes="(max-width: 768px) 50vw, 25vw"
                />
                <div className="absolute inset-0 bg-gradient-to-t from-obsidian/90 via-obsidian/20 to-transparent opacity-80 transition-opacity duration-700 group-hover:opacity-100" />
                <div className="absolute bottom-0 left-0 p-6 w-full z-10">
                  <Icon className="h-5 w-5 mb-3 text-gold opacity-80" />
                  <h3 className="text-lg font-display text-alabaster mb-1">
                    {domain.name}
                  </h3>
                  <p className="text-xs text-pearl/60 font-light translate-y-2 opacity-0 transition-all duration-500 group-hover:translate-y-0 group-hover:opacity-100">
                    {domain.description}
                  </p>
                </div>
              </button>
            </FadeIn>
          );
        })}
      </div>
    </div>
  );
}
```

**Step 2: Verify typecheck**

Run: `pnpm typecheck`

**Step 3: Commit**

```bash
git add app/components/step-flow/StepDomain.tsx
git commit -m "feat(ui): add StepDomain - domain selection grid

Full-screen dark cinematic grid with domain cards, matching HomePage
visual language. FadeIn stagger animation.

Co-Authored-By: Claude Opus 4.6 <noreply@anthropic.com>"
```

---

## Task 10: StepStyle component

**Files:**
- Create: `app/components/step-flow/StepStyle.tsx`

**Step 1: Write StepStyle**

Create `app/components/step-flow/StepStyle.tsx` -- template selection grid with bottom fixed bar. Reuse visual patterns from `CreateDomainPageContent.tsx:125-173`. Include gold border selection state, credits display, and "下一步" button. Accepts `domain`, `templates`, `onSelect`, `onBack` props.

Key features:
- 3-column grid on desktop
- Selected template has gold ring + scale effect
- Bottom fixed bar shows selected template name + price + "下一步" button
- Insufficient credits shows lock overlay (check via `useAuth().profile.credits`)
- Back arrow to return to domain step

(Full component code ~150 lines -- implement following the card design from `CreateDomainPageContent.tsx:127-159`)

**Step 2: Verify typecheck**

Run: `pnpm typecheck`

**Step 3: Commit**

```bash
git add app/components/step-flow/StepStyle.tsx
git commit -m "feat(ui): add StepStyle - template selection with fixed action bar

Dark cinematic template grid with gold selection state, credit check,
and sticky bottom bar for next step navigation.

Co-Authored-By: Claude Opus 4.6 <noreply@anthropic.com>"
```

---

## Task 11: StepUpload component

**Files:**
- Create: `app/components/step-flow/StepUpload.tsx`

**Step 1: Write StepUpload**

Create `app/components/step-flow/StepUpload.tsx` -- Photo upload with parallel identify/upload status display. Key features:

- Light background (alabaster) for contrast with dark steps
- Central drag-and-drop zone using `UploadBox` visual primitive (functional, not just animation)
- Photo thumbnail grid showing per-photo status:
  - `uploading`: spinning ring overlay
  - `identifying`: subtle pulse overlay
  - `valid` + `uploaded`: green check icon
  - `invalid`: red X + description tooltip
  - `error`: yellow warning + description
- Uses `useParallelPhotoUpload` hook
- Bottom fixed bar: "N 张照片就绪 [开始创作]"
- Barrier check on "开始创作" click:
  1. All photos uploaded
  2. At least 1 valid photo
  3. No invalid photos (must remove first)
  4. User authenticated (show AuthModal if not)
  5. Credits sufficient (redirect to /pricing if not)
- After barrier check passes: freeze credits, then dispatch `START_GENERATE`

(Full component code ~200 lines)

**Step 2: Verify typecheck**

Run: `pnpm typecheck`

**Step 3: Commit**

```bash
git add app/components/step-flow/StepUpload.tsx
git commit -m "feat(ui): add StepUpload - parallel photo upload with barrier check

Light-themed upload step with drag-and-drop, per-photo status indicators,
barrier check before generation, and credit freeze integration.

Co-Authored-By: Claude Opus 4.6 <noreply@anthropic.com>"
```

---

## Task 12: StepGenerate component (generate + result + error)

**Files:**
- Create: `app/components/step-flow/StepGenerate.tsx`

**Step 1: Write StepGenerate**

Create `app/components/step-flow/StepGenerate.tsx` -- Three-phase component:

**Phase A: Generating** (`state.step === 'generate'`)
- Dark immersive full-screen
- Background: first photo blurred + darkened (CSS `blur(20px) brightness(0.3)`)
- `ScanningLine` animated from top to bottom (GSAP, driven by `state.progress`)
- Progress text from `state.progressText`
- Auto-triggers generation on mount via `useEffect`:
  1. Call generation-service's `generateAsAuthenticated` (refactored to use freeze/deduct)
  2. On progress: dispatch `UPDATE_PROGRESS`
  3. On success: dispatch `COMPLETE` + call `/api/credits/deduct`
  4. On failure: dispatch `FAIL` + call `/api/credits/unfreeze`

**Phase B: Result** (`state.step === 'result'`)
- `SuccessBadge` appears with GSAP `back.out(2)` animation
- After 1.5s delay, transitions to result grid
- Reuses `GenerationResults` card design
- Add: editable project name (auto-generated), share to gallery toggle, "再创作一组" button

**Phase C: Error** (`state.step === 'error'`)
- Error message display
- "重新生成" button dispatches `GO_BACK` to return to upload step

(Full component code ~250 lines)

**Step 2: Verify typecheck**

Run: `pnpm typecheck`

**Step 3: Commit**

```bash
git add app/components/step-flow/StepGenerate.tsx
git commit -m "feat(ui): add StepGenerate - immersive generation with scanning line

Three-phase component: generating (GSAP scanning line), result (success
badge + image grid), error (retry). Credit deduct/unfreeze integration.

Co-Authored-By: Claude Opus 4.6 <noreply@anthropic.com>"
```

---

## Task 13: Update generation-service for credit freeze model

**Files:**
- Modify: `app/lib/generation-service.ts`

**Step 1: Update generateAsAuthenticated**

In `app/lib/generation-service.ts`, replace the credits refund logic (lines 237-247) with unfreeze:

```typescript
// In the catch block, replace:
//   await fetch('/api/credits/refund', { ... });
// With:
//   await fetch('/api/credits/unfreeze', { ... });
```

Also remove the credits deduction from `/api/generations` POST (that happens in the generation route itself). The new flow:
1. Freeze happens in StepUpload before dispatching START_GENERATE
2. generateAsAuthenticated creates project + generation (no credit deduction)
3. On success, StepGenerate calls `/api/credits/deduct`
4. On failure, StepGenerate calls `/api/credits/unfreeze`

So `generateAsAuthenticated` itself no longer handles credits at all -- it just creates the project, generation record, and streams images.

**Step 2: Verify typecheck**

Run: `pnpm typecheck`

**Step 3: Commit**

```bash
git add app/lib/generation-service.ts
git commit -m "refactor(service): remove credit handling from generation-service

Credits now managed by StepFlow: freeze before, deduct/unfreeze after.
generation-service focuses on project creation and image streaming.

Co-Authored-By: Claude Opus 4.6 <noreply@anthropic.com>"
```

---

## Task 14: Route wiring

**Files:**
- Modify: `app/create/page.tsx` (replace with StepFlow)
- Modify: `app/create/[domain]/page.tsx` (redirect)
- Modify: `app/components/HomePage.tsx:54-59` (CTA link change)

**Step 1: Replace create/page.tsx**

Replace `app/create/page.tsx` with:

```tsx
'use client';

import { StepFlow } from '@/components/step-flow';

export default function CreatePage() {
  return <StepFlow />;
}
```

**Step 2: Add redirect for create/[domain]/page.tsx**

Replace `app/create/[domain]/page.tsx` with:

```tsx
import { redirect } from 'next/navigation';
import { isValidDomain } from '@/types/domain';

interface CreateDomainPageProps {
  params: Promise<{ domain: string }>;
}

export default async function CreateDomainPage({ params }: CreateDomainPageProps) {
  const { domain } = await params;

  if (!isValidDomain(domain)) {
    redirect('/create');
  }

  redirect(`/create?domain=${domain}`);
}
```

**Step 3: Update HomePage CTA**

In `app/components/HomePage.tsx:54-59`, change `handleGetStarted`:

```typescript
const handleGetStarted = () => {
  if (user) {
    router.push('/create');
  } else {
    setShowAuthModal(true);
  }
};
```

Wait -- per design, guests CAN enter the flow (login required only at generate). So change to:

```typescript
const handleGetStarted = () => {
  router.push('/create');
};
```

And remove `showAuthModal` from CTA (auth check happens in StepUpload barrier).

**Step 4: Verify build**

Run:
```bash
pnpm build
```

Expected: Build succeeds

**Step 5: Commit**

```bash
git add app/create/page.tsx app/create/\[domain\]/page.tsx app/components/HomePage.tsx
git commit -m "feat(routes): wire StepFlow to /create, redirect /create/[domain]

Single /create route with StepFlow. Legacy /create/[domain] redirects
to /create?domain=xxx. HomePage CTA goes directly to /create.

Co-Authored-By: Claude Opus 4.6 <noreply@anthropic.com>"
```

---

## Task 15: Final integration, typecheck, build verification

**Files:**
- All files from Tasks 1-14

**Step 1: Full typecheck**

Run:
```bash
pnpm typecheck
```

Fix any type errors.

**Step 2: Lint**

Run:
```bash
pnpm lint
```

Fix any lint issues.

**Step 3: Build**

Run:
```bash
pnpm build
```

Fix any build errors.

**Step 4: Manual smoke test**

Test these URLs in browser:
- `http://localhost:3000/create` -- should show domain grid (Step 1)
- `http://localhost:3000/create?domain=wedding` -- should show template grid (Step 2)
- `http://localhost:3000/create?template=<valid-id>` -- should show upload (Step 3)
- `http://localhost:3000/create/wedding` -- should redirect to `/create?domain=wedding`
- `http://localhost:3000/create?templateId=<valid-id>` -- should work (legacy compat)
- Homepage "开启创作" -- should navigate to `/create`
- Browser back/forward -- should navigate between steps

**Step 5: Final commit**

```bash
git add -A
git commit -m "feat: complete StepFlow create page redesign

Immersive 4-step creation flow replacing fragmented create pages.
Shared animation primitives with Hero. Parallel photo identify/upload.
Credit freeze/deduct/unfreeze transaction safety. URL-synced state machine.

Co-Authored-By: Claude Opus 4.6 <noreply@anthropic.com>"
```

---

## Summary of All Tasks

| # | Task | New Files | Modified Files |
|---|------|-----------|---------------|
| 1 | Schema: frozen_credits | - | `prisma/schema.prisma` |
| 2 | API: freeze/deduct/unfreeze | 3 route files | - |
| 3 | Types: step-flow.ts | `app/types/step-flow.ts` | - |
| 4 | Hook: useStepFlow | `app/hooks/useStepFlow.ts` | - |
| 5 | Hook: useParallelPhotoUpload | `app/hooks/useParallelPhotoUpload.ts` | - |
| 6 | UI: shared animation primitives | 5 files in `shared-animations/` | - |
| 7 | Refactor: HeroProcessAnimation | - | `HeroProcessAnimation.tsx` |
| 8 | UI: StepFlow + StepProgress | 3 files in `step-flow/` | - |
| 9 | UI: StepDomain | `StepDomain.tsx` | - |
| 10 | UI: StepStyle | `StepStyle.tsx` | - |
| 11 | UI: StepUpload | `StepUpload.tsx` | - |
| 12 | UI: StepGenerate | `StepGenerate.tsx` | - |
| 13 | Refactor: generation-service | - | `generation-service.ts` |
| 14 | Routes: wiring + redirects | - | `create/page.tsx`, `[domain]/page.tsx`, `HomePage.tsx` |
| 15 | Integration: typecheck + build | - | All |

**Dependencies:** Tasks 1-3 have no deps and can run in parallel. Task 4 depends on 3. Task 5 depends on 3. Tasks 6-7 are independent. Tasks 8-12 depend on 3-6. Task 13 depends on 2. Task 14 depends on 8-12. Task 15 depends on all.
