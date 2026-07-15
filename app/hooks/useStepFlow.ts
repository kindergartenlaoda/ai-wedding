'use client';

import { useReducer, useCallback, useEffect, useRef } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import type {
  StepFlowState,
  StepFlowAction,
  StepName,
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

    case 'SELECT_TEMPLATE': {
      const domain =
        state.step === 'style' && state.domain
          ? state.domain
          : (action.template.domain as GenerationDomain);
      return {
        step: 'upload',
        domain,
        template: action.template,
        photos: [],
      };
    }

    case 'ADD_PHOTOS':
      if (state.step !== 'upload') return state;
      return { ...state, photos: [...state.photos, ...action.photos] };

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
        imageCount: action.imageCount || 1,
        additionalPrompt: action.additionalPrompt,
        progress: 0,
        progressText: '正在准备...',
      };

    case 'UPDATE_PROGRESS':
      if (state.step !== 'generate') return state;
      return {
        ...state,
        progress: action.progress,
        progressText: action.progressText,
      };

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
        case 'style':
          return { step: 'domain', domain: null };
        case 'upload':
          return { step: 'style', domain: state.domain, template: null };
        case 'error':
          return {
            step: 'upload',
            domain: state.domain,
            template: state.template,
            photos: [],
          };
        default:
          return state;
      }
    }

    case 'RESET':
      return { step: 'domain', domain: null };

    default:
      return state;
  }
}

// --- Draft Persistence ---

const DRAFT_KEY = 'step-flow-draft';

interface DraftState {
  domain: string | null;
  templateId: string | null;
  step: StepName;
}

function saveDraft(state: StepFlowState): void {
  if (typeof window === 'undefined') return;
  // Only save for domain/style/upload steps (not generate/result/error)
  if (state.step === 'generate' || state.step === 'result' || state.step === 'error') {
    return;
  }
  const draft: DraftState = {
    domain: 'domain' in state && state.domain ? state.domain : null,
    templateId: 'template' in state && state.template ? state.template.id : null,
    step: state.step,
  };
  try {
    localStorage.setItem(DRAFT_KEY, JSON.stringify(draft));
  } catch {
    // ignore quota errors
  }
}

function loadDraft(): DraftState | null {
  if (typeof window === 'undefined') return null;
  try {
    const raw = localStorage.getItem(DRAFT_KEY);
    if (!raw) return null;
    return JSON.parse(raw) as DraftState;
  } catch {
    return null;
  }
}

function clearDraft(): void {
  if (typeof window === 'undefined') return;
  try {
    localStorage.removeItem(DRAFT_KEY);
  } catch {
    // ignore
  }
}

// --- URL Sync Helpers ---

function stateToSearchString(state: StepFlowState): string {
  const params = new URLSearchParams();
  if ('domain' in state && state.domain) params.set('domain', state.domain);
  if ('template' in state && state.template) params.set('template', state.template.id);
  if (state.step === 'generate' || state.step === 'result') params.set('step', state.step);
  return params.toString();
}

function getInitialState(
  searchParams: URLSearchParams,
  templates: Template[]
): StepFlowState {
  const legacyId = searchParams.get('templateId');
  const templateId = legacyId || searchParams.get('template');
  const domainParam = searchParams.get('domain');

  // URL params take priority
  if (templateId) {
    const template = templates.find((t) => t.id === templateId);
    if (template) {
      const domain = (template.domain ?? domainParam) as GenerationDomain;
      return { step: 'upload', domain, template, photos: [] };
    }
  }

  if (domainParam && isValidDomain(domainParam)) {
    return { step: 'style', domain: domainParam, template: null };
  }

  // Check draft if no URL params
  const draft = loadDraft();
  if (draft) {
    if (draft.templateId && templates.length > 0) {
      const template = templates.find((t) => t.id === draft.templateId);
      if (template) {
        const domain = (template.domain ?? draft.domain) as GenerationDomain;
        return { step: 'upload', domain, template, photos: [] };
      }
    }
    if (draft.domain && isValidDomain(draft.domain)) {
      return { step: 'style', domain: draft.domain, template: null };
    }
  }

  return { step: 'domain', domain: null };
}

// --- Hook ---

interface UseStepFlowOptions {
  templates: Template[];
}

const STEP_INDEX: Record<StepName, number> = {
  domain: 0,
  style: 1,
  upload: 2,
  generate: 3,
  result: 3,
  error: 3,
};

export function useStepFlow({ templates }: UseStepFlowOptions) {
  const router = useRouter();
  const searchParams = useSearchParams();
  const isInitialMount = useRef(true);
  const hasInitializedFromUrl = useRef(false);

  const initialState = getInitialState(searchParams, templates);
  const [state, dispatch] = useReducer(stepFlowReducer, initialState);

  // Re-initialize from URL when templates load
  useEffect(() => {
    if (hasInitializedFromUrl.current || templates.length === 0) return;

    const legacyId = searchParams.get('templateId');
    const templateId = legacyId || searchParams.get('template');

    if (templateId && state.step === 'domain') {
      const template = templates.find((t) => t.id === templateId);
      if (template) {
        hasInitializedFromUrl.current = true;
        dispatch({ type: 'SELECT_TEMPLATE', template });
      }
    }
  }, [templates, searchParams, state.step]);

  useEffect(() => {
    if (isInitialMount.current) {
      isInitialMount.current = false;
      return;
    }

    // Save draft on state change
    saveDraft(state);

    // Clear draft when generation completes or resets
    if (state.step === 'result' || (state.step === 'domain' && !state.domain)) {
      clearDraft();
    }

    const newSearch = stateToSearchString(state);
    const currentSearch = searchParams.toString();
    if (newSearch !== currentSearch) {
      router.replace(`/create${newSearch ? `?${newSearch}` : ''}`, {
        scroll: false,
      });
    }
  }, [state, router, searchParams]);

  const goBack = useCallback(() => dispatch({ type: 'GO_BACK' }), []);
  const reset = useCallback(() => dispatch({ type: 'RESET' }), []);

  return {
    state,
    dispatch,
    goBack,
    reset,
    stepIndex: STEP_INDEX[state.step],
    totalSteps: 4,
  };
}
