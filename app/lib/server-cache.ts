/**
 * 服务端内存缓存 - 用于短 TTL 缓存热读数据
 *
 * 设计原则：
 * 1. 短 TTL（10-30s）避免数据过期问题
 * 2. 写入时主动失效相关缓存
 * 3. 限制缓存条目数量防止内存泄漏
 */

type CacheEntry<T> = {
  value: T;
  expiresAt: number;
};

const cacheStore = new Map<string, CacheEntry<unknown>>();
const MAX_CACHE_ENTRIES = 1000;

function cleanupExpired(now: number) {
  for (const [key, entry] of cacheStore.entries()) {
    if (entry.expiresAt <= now) {
      cacheStore.delete(key);
    }
  }
}

export function getCache<T>(key: string): T | null {
  const now = Date.now();
  const entry = cacheStore.get(key);
  if (!entry) return null;
  if (entry.expiresAt <= now) {
    cacheStore.delete(key);
    return null;
  }
  return entry.value as T;
}

export function setCache<T>(key: string, value: T, ttlMs: number): void {
  const now = Date.now();
  cleanupExpired(now);

  if (cacheStore.size >= MAX_CACHE_ENTRIES) {
    const firstKey = cacheStore.keys().next().value as string | undefined;
    if (firstKey) cacheStore.delete(firstKey);
  }

  cacheStore.set(key, {
    value,
    expiresAt: now + ttlMs,
  });
}

export function invalidateCacheByPrefix(prefix: string): void {
  for (const key of cacheStore.keys()) {
    if (key.startsWith(prefix)) {
      cacheStore.delete(key);
    }
  }
}
