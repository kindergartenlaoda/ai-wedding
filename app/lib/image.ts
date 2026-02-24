/**
 * 客户端图片生成调用工具（调用本地 Next.js API 路由，安全不暴露密钥）。
 * 返回 URL 列表或 base64 列表，取决于服务端 response_format。
 */
import type { GenerateOptions } from '@/types/image';

export async function generateImage(prompt: string, options: GenerateOptions = {}) {
  const res = await fetch('/api/generate-image', {
    method: 'POST',
    credentials: 'include',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ prompt, ...options }),
  });

  const json = await res.json();
  if (!res.ok) {
    const msg = json?.error || '生成失败';
    throw new Error(typeof msg === 'string' ? msg : JSON.stringify(msg));
  }

  // 兼容返回结构：{ data: { data: [...] } }（服务端已包裹）
  const items = json?.data?.data || [];
  return items as Array<{ url?: string; b64_json?: string; data_url?: string; mime?: string }>;
}
