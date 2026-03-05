"use client";

import { TrendingUp, TrendingDown, Minus, Users, Layers, CreditCard, type LucideIcon } from 'lucide-react';
import type { AnalyticsOverview, TrendData } from '@/types/analytics';

interface CardData {
  label: string;
  value: number;
  sub: string;
  icon: LucideIcon;
  trend?: TrendData;
}

interface AnalyticsOverviewCardsProps {
  data: AnalyticsOverview;
  trends?: {
    totalUsersTrend?: TrendData;
    totalGenerationsTrend?: TrendData;
    completedGenerationsTrend?: TrendData;
    totalOrdersTrend?: TrendData;
  };
  loading?: boolean;
}

function TrendIndicator({ trend }: { trend: TrendData }) {
  const isPositive = trend.trend === 'up';
  const isNeutral = trend.trend === 'stable';

  const Icon = isNeutral ? Minus : isPositive ? TrendingUp : TrendingDown;
  const colorClass = isNeutral
    ? 'text-pearl/40'
    : isPositive
    ? 'text-green-400'
    : 'text-red-400';

  return (
    <div className={`flex items-center gap-1 text-xs ${colorClass}`}>
      <Icon className="w-3 h-3" />
      <span>{Math.abs(trend.changePercent).toFixed(1)}%</span>
    </div>
  );
}

export function AnalyticsOverviewCards({ data, trends, loading }: AnalyticsOverviewCardsProps) {
  if (loading) {
    return (
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        {[...Array(4)].map((_, i) => (
          <div key={i} className="p-5 bg-white/5 border border-white/10 rounded-sm animate-pulse">
            <div className="h-4 bg-white/10 rounded mb-3 w-24" />
            <div className="h-8 bg-white/10 rounded mb-2 w-16" />
            <div className="h-3 bg-white/10 rounded w-20" />
          </div>
        ))}
      </div>
    );
  }

  const cards: CardData[] = [
    {
      label: '总用户数',
      value: data.totalUsers,
      sub: `近7天 +${data.recentUsers}`,
      icon: Users,
      trend: trends?.totalUsersTrend,
    },
    {
      label: '总生成数',
      value: data.totalGenerations,
      sub: `近7天 +${data.recentGenerations}`,
      icon: Layers,
      trend: trends?.totalGenerationsTrend,
    },
    {
      label: '完成生成',
      value: data.completedGenerations,
      sub: `完成率 ${data.totalGenerations > 0 ? Math.round((data.completedGenerations / data.totalGenerations) * 100) : 0}%`,
      icon: TrendingUp,
      trend: trends?.completedGenerationsTrend,
    },
    {
      label: '付费订单',
      value: data.totalOrders,
      sub: `转化率 ${data.totalUsers > 0 ? ((data.totalOrders / data.totalUsers) * 100).toFixed(1) : 0}%`,
      icon: CreditCard,
      trend: trends?.totalOrdersTrend,
    },
  ];

  return (
    <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
      {cards.map((card) => (
        <div
          key={card.label}
          className="p-5 bg-white/5 border border-white/10 rounded-sm hover:bg-white/[0.07] transition-colors"
        >
          <div className="flex items-center justify-between mb-3">
            <div className="flex items-center gap-2">
              <card.icon className="w-4 h-4 text-gold" />
              <span className="text-xs text-pearl/60 tracking-wider uppercase">
                {card.label}
              </span>
            </div>
            {card.trend && <TrendIndicator trend={card.trend} />}
          </div>
          <p className="text-3xl font-display font-medium text-alabaster mb-1 tabular-nums">
            {card.value.toLocaleString()}
          </p>
          <p className="text-xs text-pearl/40">{card.sub}</p>
        </div>
      ))}
    </div>
  );
}
