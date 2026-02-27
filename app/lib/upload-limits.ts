/**
 * Upload rate limiting and concurrency control configuration
 */

/**
 * Maximum concurrent uploads allowed
 * Prevents memory exhaustion from simultaneous large file uploads
 */
export const MAX_CONCURRENT_UPLOADS = 3;

/**
 * Upload timeout in milliseconds (2 minutes)
 * If an upload takes longer than this, it will be aborted
 */
export const UPLOAD_TIMEOUT_MS = 2 * 60 * 1000;

/**
 * Rate limit: maximum uploads per user per time window
 */
export const RATE_LIMIT = {
  /** Maximum uploads per window */
  MAX_UPLOADS: 10,

  /** Time window in milliseconds (1 minute) */
  WINDOW_MS: 60 * 1000,
} as const;

/**
 * Memory thresholds for upload monitoring
 */
export const MEMORY_THRESHOLDS = {
  /** Warn if memory usage exceeds this percentage */
  WARNING_PERCENT: 80,

  /** Reject uploads if memory usage exceeds this percentage */
  CRITICAL_PERCENT: 90,
} as const;
