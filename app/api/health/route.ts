import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';

export const dynamic = 'force-dynamic';

/**
 * Health Check API - 验证应用和数据库状态
 * 用于 Docker 健康检查和监控系统
 */
export async function GET() {
  const timestamp = new Date().toISOString();

  if (process.env.LOCAL_ADMIN_MODE === 'true') {
    return NextResponse.json({
      status: 'healthy',
      timestamp,
      services: {
        app: 'running',
        database: 'optional-local-mode'
      }
    });
  }

  try {
    // 验证数据库连接（执行简单查询）
    await prisma.$queryRaw`SELECT 1 as health_check`;

    return NextResponse.json({
      status: 'healthy',
      timestamp,
      services: {
        app: 'running',
        database: 'connected'
      }
    });
  } catch (error) {
    // 数据库连接失败，返回 503 Service Unavailable
    const errorMessage = error instanceof Error ? error.message : 'Unknown database error';

    console.error('[Health Check] Database connection failed:', errorMessage);

    return NextResponse.json({
      status: 'unhealthy',
      timestamp,
      services: {
        app: 'running',
        database: 'disconnected'
      },
      error: errorMessage
    }, {
      status: 503
    });
  }
}
