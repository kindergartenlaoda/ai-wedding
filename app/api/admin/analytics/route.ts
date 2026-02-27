import { NextRequest, NextResponse } from 'next/server';
import { requireAdmin } from '@/lib/auth-admin';
import { prisma } from '@/lib/prisma';

/**
 * GET /api/admin/analytics
 * Admin analytics dashboard data.
 */
export async function GET(req: NextRequest) {
  const adminResult = await requireAdmin(req);
  if (adminResult instanceof Response) return adminResult;

  const now = new Date();
  const thirtyDaysAgo = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);
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
    prisma.$queryRaw<Array<{ date: string; count: bigint }>>`
      SELECT DATE(created_at) as date, COUNT(*)::bigint as count
      FROM users
      WHERE created_at >= ${thirtyDaysAgo}
      GROUP BY DATE(created_at)
      ORDER BY date ASC
    `,
    prisma.$queryRaw<Array<{ date: string; count: bigint }>>`
      SELECT DATE(created_at) as date, COUNT(*)::bigint as count
      FROM generations
      WHERE created_at >= ${thirtyDaysAgo}
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

  return NextResponse.json({
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
    domainDistribution: domainDistribution.map((d) => ({
      domain: d.domain,
      count: d._count.id,
    })),
    dailyRegistrations: dailyRegistrations.map((d) => ({
      date: String(d.date).slice(0, 10),
      count: Number(d.count),
    })),
    dailyGenerations: dailyGenerations.map((d) => ({
      date: String(d.date).slice(0, 10),
      count: Number(d.count),
    })),
    feedback: {
      averageRating: feedbackStats._avg.rating,
      totalFeedbacks: feedbackStats._count,
    },
  });
}
