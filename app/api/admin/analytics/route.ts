import { NextRequest, NextResponse } from 'next/server';
import { requireAdmin } from '@/lib/auth-admin';
import { prisma } from '@/lib/prisma';
import type { AnalyticsData } from '@/types/analytics';

/**
 * GET /api/admin/analytics
 * Admin analytics dashboard data.
 */
export async function GET(req: NextRequest) {
  const adminResult = await requireAdmin(req);
  if (adminResult instanceof Response) return adminResult;

  try {
    // Parse query parameters for time range
    const searchParams = req.nextUrl.searchParams;
    const startDateParam = searchParams.get('startDate');
    const endDateParam = searchParams.get('endDate');

    const now = new Date();
    const endDate = endDateParam ? new Date(endDateParam) : now;
    const startDate = startDateParam
      ? new Date(startDateParam)
      : new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);

    // Validate dates
    if (isNaN(startDate.getTime()) || isNaN(endDate.getTime())) {
      return NextResponse.json(
        { error: '无效的日期参数' },
        { status: 400 }
      );
    }

    if (startDate > endDate) {
      return NextResponse.json(
        { error: '开始日期不能晚于结束日期' },
        { status: 400 }
      );
    }

    // Limit maximum time range to 365 days
    const maxDays = 365;
    const daysDiff = Math.ceil((endDate.getTime() - startDate.getTime()) / (1000 * 60 * 60 * 24));
    if (daysDiff > maxDays) {
      return NextResponse.json(
        { error: `时间范围不能超过 ${maxDays} 天` },
        { status: 400 }
      );
    }

    const sevenDaysAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);

    const [
      totalUsers,
      totalGenerations,
      completedGenerations,
      totalOrders,
      recentUsers,
      recentGenerations,
      usersWithGenerations,
      paidUsers,
      templateUsage,
      domainDistribution,
      dailyRegistrations,
      dailyGenerations,
      feedbackStats,
    ] = await Promise.all([
      prisma.users.count(),
      prisma.generations.count(),
      prisma.generations.count({ where: { status: 'completed' } }),
      prisma.orders.count({ where: { status: 'completed' } }),
      prisma.users.count({ where: { created_at: { gte: sevenDaysAgo } } }),
      prisma.generations.count({ where: { created_at: { gte: sevenDaysAgo } } }),
      prisma.generations.groupBy({
        by: ['user_id'],
        _count: true,
      }).then((r) => r.length),
      prisma.orders.groupBy({
        by: ['user_id'],
        where: { status: 'completed' },
        _count: true,
      }).then((r) => r.length),
      prisma.generations.groupBy({
        by: ['template_id'],
        where: { template_id: { not: null }, status: 'completed' },
        _count: { id: true },
        orderBy: { _count: { id: 'desc' } },
        take: 10,
      }),
      prisma.generations.groupBy({
        by: ['domain'],
        where: { status: 'completed' },
        _count: { id: true },
        orderBy: { _count: { id: 'desc' } },
      }),
      prisma.$queryRaw<Array<{ date: Date; count: bigint }>>`
        SELECT DATE(created_at) as date, COUNT(*)::bigint as count
        FROM users
        WHERE created_at >= ${startDate} AND created_at <= ${endDate}
        GROUP BY DATE(created_at)
        ORDER BY date ASC
      `,
      prisma.$queryRaw<Array<{ date: Date; count: bigint }>>`
        SELECT DATE(created_at) as date, COUNT(*)::bigint as count
        FROM generations
        WHERE created_at >= ${startDate} AND created_at <= ${endDate}
        GROUP BY DATE(created_at)
        ORDER BY date ASC
      `,
      prisma.generation_feedbacks.aggregate({
        _avg: { rating: true },
        _count: true,
      }),
    ]);

    const templateIds = templateUsage
      .map((t) => t.template_id)
      .filter((id): id is string => id !== null);

    const templates = templateIds.length > 0
      ? await prisma.templates.findMany({
          where: { id: { in: templateIds } },
          select: { id: true, name: true, domain: true },
        })
      : [];

    const templateMap = new Map(templates.map((t) => [t.id, t]));

    const analyticsData: AnalyticsData = {
      overview: {
        totalUsers,
        totalGenerations,
        completedGenerations,
        totalOrders,
        recentUsers,
        recentGenerations,
      },
      funnel: {
        registered: totalUsers,
        firstGeneration: usersWithGenerations,
        paid: paidUsers,
      },
      templateHotlist: templateUsage.map((t) => ({
        template_id: t.template_id,
        name: templateMap.get(t.template_id ?? '')?.name || '未知模板',
        domain: templateMap.get(t.template_id ?? '')?.domain || 'unknown',
        count: t._count.id,
      })),
      domainDistribution: domainDistribution
        .filter((d) => d.domain !== null && d._count?.id !== undefined)
        .map((d) => ({
          domain: d.domain as string,
          count: d._count!.id,
        })),
      dailyRegistrations: dailyRegistrations.map((d) => ({
        date: d.date instanceof Date ? d.date.toISOString().slice(0, 10) : String(d.date).slice(0, 10),
        count: Number(d.count),
      })),
      dailyGenerations: dailyGenerations.map((d) => ({
        date: d.date instanceof Date ? d.date.toISOString().slice(0, 10) : String(d.date).slice(0, 10),
        count: Number(d.count),
      })),
      feedback: {
        averageRating: feedbackStats._avg.rating,
        totalFeedbacks: typeof feedbackStats._count === 'number'
          ? feedbackStats._count
          : (feedbackStats._count as Record<string, number>).rating || 0,
      },
    };

    return NextResponse.json(analyticsData);
  } catch (error) {
    console.error('Analytics fetch error:', error);
    return NextResponse.json(
      { error: '获取分析数据失败' },
      { status: 500 }
    );
  }
}
