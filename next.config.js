/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  // Pino 使用 worker 线程（pino-pretty transport），Next.js 打包会破坏路径解析
  // 将 pino 设为外部包，避免 bundler 处理，解决 "Cannot find module .../vendor-chunks/lib/worker.js" 错误
  experimental: {
    serverComponentsExternalPackages: ['pino', 'pino-pretty'],
  },
  eslint: {
    ignoreDuringBuilds: false,
  },
  typescript: {
    ignoreBuildErrors: false,
  },
  images: {
    remotePatterns: [
      {
        protocol: 'https',
        hostname: 'images.pexels.com',
        pathname: '/**',
      },
      {
        protocol: 'https',
        hostname: '**.supabase.co',
        pathname: '/storage/**',
      },
      {
        protocol: 'https',
        hostname: 'oaidalleapiprodscus.blob.core.windows.net',
        pathname: '/**',
      },
      {
        protocol: 'http',
        hostname: '123.57.16.107',
        port: '9000',
        pathname: '/**',
      },
      {
        protocol: 'https',
        hostname: 'file.302.ai',
        pathname: '/gpt/imgs/**',
      },
      {
        protocol: 'https',
        hostname: 'images.unsplash.com',
        pathname: '/**',
      },
      {
        protocol: 'https',
        hostname: 'files.closeai.fans',
        pathname: '/**',
      },
      {
        protocol: 'http',
        hostname: 'ai-weddings.oss-cn-beijing.aliyuncs.com',
        pathname: '/**',
      },
      {
        protocol: 'https',
        hostname: 'ai-weddings.oss-cn-beijing.aliyuncs.com',
        pathname: '/**',
      },
      {
        protocol: 'http',
        hostname: 'localhost',
        pathname: '/**',
      },
    ],
  },
  // 启用SWC压缩
  swcMinify: true,
  // 压缩响应
  compress: true,
};

module.exports = nextConfig;
