/**
 * 通用参数验证工具函数
 * 用于 API 路由的输入验证
 */

/**
 * 验证并规范化分页参数
 * @param pageRaw - 原始页码
 * @param limitRaw - 原始每页数量
 * @param maxLimit - 最大每页数量限制（默认 100）
 * @returns 规范化后的分页参数
 */
export function validatePaginationParams(
  pageRaw: string | null,
  limitRaw: string | null,
  maxLimit = 100
): { page: number; limit: number; offset: number } {
  const page = Math.max(1, parseInt(pageRaw || '1') || 1);
  const limitParsed = parseInt(limitRaw || '20') || 20;
  const limit = Math.max(1, Math.min(limitParsed, maxLimit));
  const offset = (page - 1) * limit;

  return { page, limit, offset };
}

/**
 * 验证环境变量是否为 mock 模式
 * @returns true 如果是 mock 模式
 */
export function isMockPaymentMode(): boolean {
  const paymentProvider = process.env.PAYMENT_PROVIDER || 'mock';
  return paymentProvider === 'mock';
}

/**
 * 验证是否为开发环境
 * @returns true 如果是开发环境
 */
export function isDevelopmentMode(): boolean {
  return process.env.NODE_ENV === 'development';
}

/**
 * 验证字符串是否为有效的 CUID
 * @param id - 待验证的 ID
 * @returns true 如果是有效的 CUID 格式
 */
export function isValidCuid(id: string): boolean {
  // CUID 格式：c + 时间戳 + 计数器 + 指纹 + 随机数
  // 长度通常为 25 个字符，以 'c' 开头
  return /^c[a-z0-9]{24}$/.test(id);
}

/**
 * 安全地解析 JSON，失败时返回默认值
 * @param jsonString - JSON 字符串
 * @param defaultValue - 解析失败时的默认值
 * @returns 解析后的对象或默认值
 */
export function safeJsonParse<T>(jsonString: string, defaultValue: T): T {
  try {
    return JSON.parse(jsonString) as T;
  } catch {
    return defaultValue;
  }
}
