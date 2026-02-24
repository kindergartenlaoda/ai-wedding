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
  | { type: 'ADD_PHOTOS'; photos: PhotoState[] }
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
