'use client';

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
    const data: { error?: string } = await response.json().catch(() => ({ error: '未知错误' }));
    throw new Error(data.error || `识别请求失败: ${response.status}`);
  }

  const result = await response.json();
  const first = result.results?.[0] as
    | { success: boolean; hasPerson: boolean; description: string }
    | undefined;

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
    const data: { url?: string } = await res.json();
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
    async (files: FileList | File[]) => {
      abortRef.current = false;

      const remaining = maxPhotos - currentPhotos.length;
      const filesToProcess = Array.from(files).slice(0, remaining);
      if (filesToProcess.length === 0) return;

      const newPhotos: PhotoState[] = [];
      const entries: Array<{ photo: PhotoState }> = [];

      for (const file of filesToProcess) {
        const dataUrl = await fileToDataUrl(file);
        const photo: PhotoState = {
          id: generatePhotoId(),
          dataUrl,
          uploadStatus: 'uploading',
          identifyStatus: 'pending',
        };
        newPhotos.push(photo);
        entries.push({ photo });
      }

      dispatch({ type: 'ADD_PHOTOS', photos: newPhotos });

      for (const { photo } of entries) {
        if (abortRef.current) break;

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
                identifyDescription:
                  err instanceof Error ? err.message : '识别失败',
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
