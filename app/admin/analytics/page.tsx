"use client";

import { useEffect, useState } from 'react';
import { AdminLayout } from '@/components/admin/AdminLayout';
import { useAuth } from '@/contexts/AuthContext';
import {
  Users,
  Layers,
  CreditCard,
  TrendingUp,
  Star,
  ArrowRight,
  Loader2,
} from 'lucide-react';
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  PieChart,
  Pie,
  Cell,
  LineChart,
  Line,
} from 'recharts';
import type { PieLabelRenderProps } from 'recharts';

interface AnalyticsData {
  overview: {
    totalUsers: number;
    totalGenerations: number;
    completedGenerations: number;
    totalOrders: number;
    recentUsers: number;
    recentGenerations: number;
  };
  funnel: {
    registered: number;
    firstGeneration: number;
    paid: number;
  };
  templateHotlist: Array<{
    template_id: string;
    name: string;
    domain: string;
    count: number;
  }>;
  domainDistribution: Array<{
    domain: string;
    count: number;
  }>;
  dailyRegistrations: Array<{ date: string; count: number }>;
  dailyGenerations: Array<{ date: string; count: number }>;
  feedback: {
    averageRating: number | null;
    totalFeedbacks: number;
  };
}

const CHART_COLORS = [
  '#C8A064', '#8B7355', '#D4AF37', '#B8860B',
  '#DAA520', '#CD853F', '#DEB887', '#F5DEB3',
];

export default function AdminAnalyticsPage() {
  const { profile } = useAuth();
  const [data, setData] = useState<AnalyticsData | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (profile?.role !== 'admin') return;

    fetch('/api/admin/analytics', { credentials: 'include' })
      .then((res) => res.json())
      .then((d: AnalyticsData) => setData(d))
      .catch(() => {})
      .finally(() => setLoading(false));
  }, [profile?.role]);

  if (profile?.role !== 'admin') {
    return (
      <AdminLayout>
        <div className="text-center py-20 text-pearl/60">无权访问</div>
      </AdminLayout>
    );
  }

  if (loading) {
    return (
      <AdminLayout>
        <div className="flex items-center justify-center py-20">
          <Loader2 className="w-8 h-8 animate-spin text-gold" />
        </div>
      </AdminLayout>
    );
  }

  if (!data) {
    return (
      <AdminLayout>
        <div className="text-center py-20 text-pearl/60">加载数据失败</div>
      </AdminLayout>
    );
  }

  const funnelData = [
    { name: '注册用户', value: data.funnel.registered },
    { name: '首次生成', value: data.funnel.firstGeneration },
    { name: '付费用户', value: data.funnel.paid },
  ];

  return (
    <AdminLayout>
      <div className="space-y-8">
        <h1 className="text-2xl font-display font-medium text-alabaster tracking-wider">
          数据分析
        </h1>

        {/* Overview Cards */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
          {[
            {
              label: '总用户数',
              value: data.overview.totalUsers,
              sub: `近7天 +${data.overview.recentUsers}`,
              icon: Users,
            },
            {
              label: '总生成数',
              value: data.overview.totalGenerations,
              sub: `近7天 +${data.overview.recentGenerations}`,
              icon: Layers,
            },
            {
              label: '完成生成',
              value: data.overview.completedGenerations,
              sub: `完成率 ${data.overview.totalGenerations > 0 ? Math.round((data.overview.completedGenerations / data.overview.totalGenerations) * 100) : 0}%`,
              icon: TrendingUp,
            },
            {
              label: '付费订单',
              value: data.overview.totalOrders,
              sub: data.feedback.averageRating
                ? `平均评分 ${data.feedback.averageRating.toFixed(1)}`
                : `${data.feedback.totalFeedbacks} 条反馈`,
              icon: CreditCard,
            },
          ].map((card) => (
            <div
              key={card.label}
              className="p-5 bg-white/5 border border-white/10 rounded-sm"
            >
              <div className="flex items-center gap-2 mb-3">
                <card.icon className="w-4 h-4 text-gold" />
                <span className="text-xs text-pearl/60 tracking-wider uppercase">
                  {card.label}
                </span>
              </div>
              <p className="text-2xl font-display font-medium text-alabaster">
                {card.value.toLocaleString()}
              </p>
              <p className="text-xs text-pearl/40 mt-1">{card.sub}</p>
            </div>
          ))}
        </div>

        {/* Funnel + Domain Distribution */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* User Funnel */}
          <div className="p-6 bg-white/5 border border-white/10 rounded-sm">
            <h2 className="text-sm font-display font-medium text-alabaster tracking-wider uppercase mb-6">
              用户转化漏斗
            </h2>
            <div className="space-y-4">
              {funnelData.map((step, idx) => {
                const maxVal = funnelData[0].value || 1;
                const pct = Math.round((step.value / maxVal) * 100);
                return (
                  <div key={step.name}>
                    <div className="flex justify-between text-xs mb-1">
                      <span className="text-pearl/60 tracking-wider">{step.name}</span>
                      <span className="text-alabaster font-medium">
                        {step.value.toLocaleString()} ({pct}%)
                      </span>
                    </div>
                    <div className="h-8 bg-black/40 rounded-sm overflow-hidden">
                      <div
                        className="h-full bg-gradient-to-r from-gold/80 to-gold/40 rounded-sm transition-all duration-700 flex items-center justify-end pr-2"
                        style={{ width: `${Math.max(pct, 2)}%` }}
                      >
                        {idx < funnelData.length - 1 && (
                          <ArrowRight className="w-3 h-3 text-obsidian/60" />
                        )}
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

          {/* Domain Distribution */}
          <div className="p-6 bg-white/5 border border-white/10 rounded-sm">
            <h2 className="text-sm font-display font-medium text-alabaster tracking-wider uppercase mb-6">
              领域偏好分布
            </h2>
            {data.domainDistribution.length > 0 ? (
              <ResponsiveContainer width="100%" height={220}>
                <PieChart>
                  <Pie
                    data={data.domainDistribution}
                    dataKey="count"
                    nameKey="domain"
                    cx="50%"
                    cy="50%"
                    outerRadius={80}
                    label={(props: PieLabelRenderProps) => {
                      const domain = String(props.name ?? '');
                      const pct = typeof props.percent === 'number' ? props.percent : 0;
                      return `${domain} ${(pct * 100).toFixed(0)}%`;
                    }}
                  >
                    {data.domainDistribution.map((_, idx) => (
                      <Cell
                        key={idx}
                        fill={CHART_COLORS[idx % CHART_COLORS.length]}
                      />
                    ))}
                  </Pie>
                  <Tooltip
                    contentStyle={{
                      background: '#1a1a1a',
                      border: '1px solid rgba(255,255,255,0.1)',
                      borderRadius: '2px',
                    }}
                  />
                </PieChart>
              </ResponsiveContainer>
            ) : (
              <p className="text-pearl/40 text-center py-10">暂无数据</p>
            )}
          </div>
        </div>

        {/* Daily Trends */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <div className="p-6 bg-white/5 border border-white/10 rounded-sm">
            <h2 className="text-sm font-display font-medium text-alabaster tracking-wider uppercase mb-6">
              每日注册趋势（30天）
            </h2>
            {data.dailyRegistrations.length > 0 ? (
              <ResponsiveContainer width="100%" height={200}>
                <LineChart data={data.dailyRegistrations}>
                  <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.05)" />
                  <XAxis
                    dataKey="date"
                    tick={{ fontSize: 10, fill: 'rgba(255,255,255,0.4)' }}
                    tickFormatter={(v: string) => v.slice(5)}
                  />
                  <YAxis tick={{ fontSize: 10, fill: 'rgba(255,255,255,0.4)' }} />
                  <Tooltip
                    contentStyle={{
                      background: '#1a1a1a',
                      border: '1px solid rgba(255,255,255,0.1)',
                      borderRadius: '2px',
                    }}
                  />
                  <Line
                    type="monotone"
                    dataKey="count"
                    stroke="#C8A064"
                    strokeWidth={2}
                    dot={{ r: 3, fill: '#C8A064' }}
                  />
                </LineChart>
              </ResponsiveContainer>
            ) : (
              <p className="text-pearl/40 text-center py-10">暂无数据</p>
            )}
          </div>

          <div className="p-6 bg-white/5 border border-white/10 rounded-sm">
            <h2 className="text-sm font-display font-medium text-alabaster tracking-wider uppercase mb-6">
              每日生成趋势（30天）
            </h2>
            {data.dailyGenerations.length > 0 ? (
              <ResponsiveContainer width="100%" height={200}>
                <LineChart data={data.dailyGenerations}>
                  <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.05)" />
                  <XAxis
                    dataKey="date"
                    tick={{ fontSize: 10, fill: 'rgba(255,255,255,0.4)' }}
                    tickFormatter={(v: string) => v.slice(5)}
                  />
                  <YAxis tick={{ fontSize: 10, fill: 'rgba(255,255,255,0.4)' }} />
                  <Tooltip
                    contentStyle={{
                      background: '#1a1a1a',
                      border: '1px solid rgba(255,255,255,0.1)',
                      borderRadius: '2px',
                    }}
                  />
                  <Line
                    type="monotone"
                    dataKey="count"
                    stroke="#DAA520"
                    strokeWidth={2}
                    dot={{ r: 3, fill: '#DAA520' }}
                  />
                </LineChart>
              </ResponsiveContainer>
            ) : (
              <p className="text-pearl/40 text-center py-10">暂无数据</p>
            )}
          </div>
        </div>

        {/* Template Hotlist */}
        <div className="p-6 bg-white/5 border border-white/10 rounded-sm">
          <h2 className="text-sm font-display font-medium text-alabaster tracking-wider uppercase mb-6">
            <Star className="w-4 h-4 inline-block mr-2 text-gold" />
            模板热度 TOP 10
          </h2>
          {data.templateHotlist.length > 0 ? (
            <ResponsiveContainer width="100%" height={300}>
              <BarChart
                data={data.templateHotlist}
                layout="vertical"
                margin={{ left: 120 }}
              >
                <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.05)" />
                <XAxis type="number" tick={{ fontSize: 10, fill: 'rgba(255,255,255,0.4)' }} />
                <YAxis
                  type="category"
                  dataKey="name"
                  tick={{ fontSize: 11, fill: 'rgba(255,255,255,0.6)' }}
                  width={110}
                />
                <Tooltip
                  contentStyle={{
                    background: '#1a1a1a',
                    border: '1px solid rgba(255,255,255,0.1)',
                    borderRadius: '2px',
                  }}
                />
                <Bar dataKey="count" fill="#C8A064" radius={[0, 4, 4, 0]} />
              </BarChart>
            </ResponsiveContainer>
          ) : (
            <p className="text-pearl/40 text-center py-10">暂无数据</p>
          )}
        </div>
      </div>
    </AdminLayout>
  );
}
