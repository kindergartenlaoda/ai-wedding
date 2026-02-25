/**
 * 前端日志工具（仅开发环境）
 *
 * 使用方式：
 * ```typescript
 * import { devLog } from '@/lib/client-logger';
 *
 * devLog.log('用户操作:', action);
 * devLog.warn('警告信息');
 * devLog.error('错误:', error);
 * ```
 *
 * 特点：
 * - 开发环境：所有日志正常输出
 * - 生产环境：只输出 error 级别日志
 * - 零依赖：直接使用浏览器 console API
 */

export const devLog = {
  /**
   * 调试日志（仅开发环境）
   */
  log: (...args: unknown[]): void => {
    if (process.env.NODE_ENV === 'development') {
      console.log(...args);
    }
  },

  /**
   * 警告日志（仅开发环境）
   */
  warn: (...args: unknown[]): void => {
    if (process.env.NODE_ENV === 'development') {
      console.warn(...args);
    }
  },

  /**
   * 错误日志（始终输出）
   */
  error: (...args: unknown[]): void => {
    console.error(...args);
  },

  /**
   * 信息日志（仅开发环境）
   */
  info: (...args: unknown[]): void => {
    if (process.env.NODE_ENV === 'development') {
      console.info(...args);
    }
  },

  /**
   * 调试日志（仅开发环境）
   */
  debug: (...args: unknown[]): void => {
    if (process.env.NODE_ENV === 'development') {
      console.debug(...args);
    }
  },
};

/**
 * 默认导出（兼容性）
 */
export default devLog;
