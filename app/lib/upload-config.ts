/**
 * Shared upload configuration constants
 * Used across client and server components for consistency
 */

export const UPLOAD_CONFIG = {
  /** Maximum file size in bytes (10MB) */
  MAX_SIZE: 10 * 1024 * 1024,

  /** Human-readable max size text */
  MAX_SIZE_TEXT: '10MB',

  /** Allowed MIME types */
  ALLOWED_TYPES: ['image/jpeg', 'image/jpg', 'image/png', 'image/webp'] as const,

  /** Human-readable allowed types text */
  ALLOWED_TYPES_TEXT: 'JPG, PNG, WebP',

  /** Maximum image dimensions (pixels) */
  MAX_PIXELS: 4096 * 4096,
} as const;

/**
 * Validate file size
 */
export function validateFileSize(size: number): { valid: boolean; error?: string } {
  if (size > UPLOAD_CONFIG.MAX_SIZE) {
    return {
      valid: false,
      error: `文件过大，最大支持 ${UPLOAD_CONFIG.MAX_SIZE_TEXT}`,
    };
  }
  return { valid: true };
}

/**
 * Validate file type
 */
export function validateFileType(type: string): { valid: boolean; error?: string } {
  if (!UPLOAD_CONFIG.ALLOWED_TYPES.includes(type as any)) {
    return {
      valid: false,
      error: `不支持的文件类型，仅支持 ${UPLOAD_CONFIG.ALLOWED_TYPES_TEXT}`,
    };
  }
  return { valid: true };
}

/**
 * Validate file (size + type)
 */
export function validateFile(file: File): { valid: boolean; error?: string } {
  const sizeValidation = validateFileSize(file.size);
  if (!sizeValidation.valid) return sizeValidation;

  const typeValidation = validateFileType(file.type);
  if (!typeValidation.valid) return typeValidation;

  return { valid: true };
}
