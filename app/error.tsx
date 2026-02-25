'use client';

import { useEffect } from 'react';
import { AlertCircle, RefreshCw, Home } from 'lucide-react';
import { useRouter } from 'next/navigation';

export default function Error({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  const router = useRouter();

  useEffect(() => {
    // 记录错误到监控服务（例如 Sentry）
    console.error('全局错误边界捕获:', error);
  }, [error]);

  return (
    <div className="min-h-screen bg-obsidian flex items-center justify-center p-4">
      <div className="max-w-md w-full">
        <div className="bg-white/5 backdrop-blur-md rounded-sm shadow-2xl p-8 border border-white/10">
          {/* 错误图标 */}
          <div className="w-16 h-16 bg-red-500/10 rounded-full flex items-center justify-center mx-auto mb-6">
            <AlertCircle className="w-8 h-8 text-red-400" />
          </div>

          {/* 错误标题 */}
          <h1 className="text-2xl font-display font-medium text-alabaster tracking-wider text-center mb-3">
            出错了！
          </h1>

          {/* 错误描述 */}
          <p className="text-pearl/60 font-light text-center mb-6 leading-relaxed">
            {getErrorMessage(error)}
          </p>

          {/* 错误详情（开发环境） */}
          {process.env.NODE_ENV === 'development' && (
            <div className="mb-6 p-4 bg-black/40 rounded-sm border border-white/10">
              <p className="text-xs font-mono text-pearl break-all">
                {error.message}
              </p>
              {error.digest && (
                <p className="text-xs text-pearl/40 mt-2">
                  错误ID: {error.digest}
                </p>
              )}
            </div>
          )}

          {/* 操作按钮 */}
          <div className="flex flex-col sm:flex-row gap-3">
            <button
              onClick={reset}
              className="flex-1 px-6 py-3 bg-gold text-obsidian rounded-sm hover:shadow-[0_0_15px_rgba(200,160,100,0.3)] transition-all duration-500 font-medium tracking-widest text-xs uppercase flex items-center justify-center gap-2"
            >
              <RefreshCw className="w-4 h-4" />
              重试
            </button>
            <button
              onClick={() => router.push('/')}
              className="flex-1 px-6 py-3 bg-white/5 text-alabaster rounded-sm hover:bg-white/10 transition-all duration-500 font-medium tracking-widest text-xs uppercase flex items-center justify-center gap-2 border border-white/10"
            >
              <Home className="w-4 h-4" />
              返回首页
            </button>
          </div>
        </div>

        {/* 帮助提示 */}
        <p className="text-center text-pearl/40 font-light tracking-wide text-xs mt-8">
          如果问题持续存在，请联系
          <a href="mailto:support@example.com" className="text-gold hover:underline ml-1">
            客服支持
          </a>
        </p>
      </div>
    </div>
  );
}

// 用户友好的错误消息
function getErrorMessage(error: Error): string {
  const message = error.message.toLowerCase();

  if (message.includes('network') || message.includes('fetch')) {
    return '网络连接出现问题，请检查您的网络连接后重试。';
  }

  if (message.includes('unauthorized') || message.includes('auth')) {
    return '您的登录已过期，请重新登录。';
  }

  if (message.includes('not found') || message.includes('404')) {
    return '请求的资源不存在，请返回首页重试。';
  }

  if (message.includes('timeout')) {
    return '请求超时，请稍后重试。';
  }

  if (message.includes('insufficient') || message.includes('credits')) {
    return '积分不足，请先购买积分。';
  }

  // 默认错误消息
  return '抱歉，系统遇到了一个意外错误。我们正在努力修复，请稍后重试。';
}

