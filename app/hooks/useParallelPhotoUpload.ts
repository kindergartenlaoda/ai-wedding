'use client';

import { useCallback, useRef } from 'react';
import { checkImageQuality } from '@/lib/image-quality-checker';
import type { PhotoState, StepFlowAction } from '@/types/step-flow';

interface UseParallelPhotoUploadOptions {
  maxPhotos: number;
  dispatch: React.Dispatch<StepFlowAction>;
  currentPhotos: PhotoState[];
  requireFaceDetection: boolean;
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
  const res = await fetch('/api/identify-image', {
    method: 'POST',
    credentials: 'include',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ images: [dataUrl] }),
  });

  if (!res.ok) {
    const data: { error?: string } = await res.json().catch(() => ({}));
    throw new Error(data.error || '识别服务异常');
  }

  const data: {
    success?: boolean;
    results?: Array<{
      success: boolean;
      hasPerson: boolean;
      description: string
    }>
  } = await res.json();

  const result = data.results?.[0];

  // 如果单张图片识别失败（success=false），抛出错误而非返回 hasPerson=false
  if (result && !result.success) {
    throw new Error(result.description || '识别服务失败');
  }

  return {
    hasPerson: result?.hasPerson ?? false,
    description: result?.description ?? '识别失败',
  };
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
  requireFaceDetection,
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
          // 如果不需要人脸识别，直接标记为 valid
          if (!requireFaceDetection) {
            dispatch({
              type: 'UPDATE_PHOTO',
              photoId: photo.id,
              updates: { identifyStatus: 'valid' },
            });
            return;
          }

          // 需要人脸识别，执行真实 API 调用
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
    [maxPhotos, currentPhotos, dispatch, requireFaceDetection]
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
