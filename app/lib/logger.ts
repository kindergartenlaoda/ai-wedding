/**
 * 结构化日志系统 - 基于 Pino
 *
 * 使用方式：
 * ```typescript
 * import { logger, createRequestLogger, sanitize } from '@/lib/logger';
 *
 * // 基础日志
 * logger.info('User logged in');
 * logger.error({ error, userId }, 'Login failed');
 *
 * // 创建带上下文的子 logger
 * const log = createRequestLogger('generate-image', requestId);
 * log.info({ userId }, '用户认证成功');
 * ```
 */

import pino from 'pino';

// 判断是否为生产环境
const isProduction = process.env.NODE_ENV === 'production';

// 创建基础 logger
export const logger = pino({
  level: process.env.LOG_LEVEL || (isProduction ? 'info' : 'debug'),

  // 开发环境使用 pino-pretty 美化输出
  transport: !isProduction ? {
    target: 'pino-pretty',
    options: {
      colorize: true,
      translateTime: 'SYS:standard',
      ignore: 'pid,hostname',
      singleLine: false,
    }
  } : undefined,

  // 生产环境输出 JSON 格式（便于日志聚合系统解析）
  formatters: isProduction ? {
    level: (label) => {
      return { level: label };
    },
  } : undefined,

  // 基础字段
  base: {
    env: process.env.NODE_ENV,
  },
});

/**
 * 创建带上下文的子 logger
 *
 * @param context - 上下文标识（如 'api:generate-image', 'service:credit'）
 * @param additionalContext - 额外的上下文字段
 */
export function createLogger(context: string, additionalContext?: Record<string, unknown>) {
  return logger.child({
    context,
    ...additionalContext,
  });
}

/**
 * 为 API 请求创建 logger
 *
 * @param route - API 路由（如 'generate-image', 'generate-stream'）
 * @param requestId - 请求 ID
 */
export function createRequestLogger(route: string, requestId: string) {
  return logger.child({
    context: `api:${route}`,
    requestId,
  });
}

/**
 * 脱敏工具函数 - 用于隐藏敏感信息
 */
export const sanitize = {
  /**
   * 脱敏 API Key（只显示前 10 个字符）
   */
  apiKey: (key: string | undefined): string => {
    if (!key) return 'missing';
    return `${key.substring(0, 10)}...`;
  },

  /**
   * 脱敏 Base64 图片（只显示长度）
   */
  base64Image: (dataUrl: string): string => {
    if (dataUrl.startsWith('data:image')) {
      return `data:image/...[base64 ${dataUrl.length} 字符]`;
    }
    return dataUrl;
  },

  /**
   * 脱敏图片数组
   */
  imageArray: (images: string[]): string[] => {
    return images.map(img => sanitize.base64Image(img));
  },

  /**
   * 截断长文本（用于 prompt）
   */
  truncate: (text: string, maxLength = 100): string => {
    if (text.length <= maxLength) return text;
    return `${text.substring(0, maxLength)}... [${text.length} 字符]`;
  },
};

/**
 * 日志级别说明：
 *
 * - trace: 最详细的调试信息（开发环境）
 * - debug: 调试信息（开发环境）
 * - info: 一般信息（生产环境默认）
 * - warn: 警告信息
 * - error: 错误信息
 * - fatal: 致命错误
 *
 * 环境变量配置：
 * - LOG_LEVEL=debug  # 显示所有日志
 * - LOG_LEVEL=info   # 只显示 info 及以上
 * - LOG_LEVEL=error  # 只显示错误
 */
