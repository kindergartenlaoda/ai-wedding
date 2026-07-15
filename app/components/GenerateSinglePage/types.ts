export interface ImageGenerationSettings {
  facePreservation: 'high' | 'medium' | 'low';
  creativityLevel: 'conservative' | 'balanced' | 'creative';
  imageQuality: 'auto' | 'low' | 'medium' | 'high';
  imageSize: 'auto' | '1024x1024' | '1536x1024' | '1024x1536';
}

export interface ImageUploadState {
  originalImage: string | null;
  originalImageFile: File | null;
  uploadedImageUrl: string | null;
  isDragging: boolean;
  isValidatingImage: boolean;
}

export interface GenerationState {
  isGenerating: boolean;
  generatedImage: string | null;
  streamingContent: string;
}

export interface PreviewState {
  previewImage: string | null;
  previewTitle: string;
}
