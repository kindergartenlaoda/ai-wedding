"use client";

import { useEffect, useState } from 'react';
import { AdminLayout } from '@/components/admin/AdminLayout';
import { useAuth } from '@/contexts/AuthContext';
import { AnalyticsTimeRangeSelector } from '@/components/admin/analytics/AnalyticsTimeRangeSelector';
import { AnalyticsOverviewCards } from '@/components/admin/analytics/AnalyticsOverviewCards';
import {
  Star,
  Loader2,
  AlertCircle,
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
import type { AnalyticsData, TimeRange } from '@/types/analytics';
import { getDomainColorArray } from '@/lib/domain-colors';

const CHART_COLORS = getDomainColorArray();

export default function AdminAnalyticsPage() {
  const { profile } = useAuth();
  const [data, setData] = useState<AnalyticsData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [timeRange, setTimeRange] = useState<TimeRange>({
    startDate: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000),
    endDate: new Date(),
    preset: '30d',
  });

  useEffect(() => {
    if (profile?.role !== 'admin') return;

    setLoading(true);
    setError(null);

    const controller = new AbortController();

    const params = new URLSearchParams({
      startDate: timeRange.startDate.toISOString(),
      endDate: timeRange.endDate.toISOString(),
    });

    fetch(`/api/admin/analytics?${params}`, {
      credentials: 'include',
      signal: controller.signal,
    })
      .then((res) => {
        if (!res.ok) throw new Error('获取数据失败');
        return res.json();
      })
      .then((d: AnalyticsData) => {
        setData(d);
        setError(null);
      })
      .catch((err) => {
        if (err.name === 'AbortError') return;
        setError(err instanceof Error ? err.message : '加载数据失败');
      })
      .finally(() => setLoading(false));

    return () => controller.abort();
  }, [profile?.role, timeRange]);

  if (profile?.role !== 'admin') {
    return (
      <AdminLayout>
        <div className="text-center py-20 text-muted-foreground">无权访问</div>
      </AdminLayout>
    );
  }

  if (loading) {
    return (
      <AdminLayout>
        <div className="flex items-center justify-center py-20">
          <Loader2 className="w-8 h-8 animate-spin text-primary" />
        </div>
      </AdminLayout>
    );
  }

  if (error || !data) {
    return (
      <AdminLayout>
        <div className="flex flex-col items-center justify-center py-20 text-muted-foreground">
          <AlertCircle className="w-12 h-12 mb-4 text-destructive" />
          <p className="text-lg">{error || '加载数据失败'}</p>
          <button
            onClick={() => window.location.reload()}
            className="mt-4 px-4 py-2 bg-primary text-primary-foreground hover:bg-primary/90 rounded-md transition-colors"
          >
            重新加载
          </button>
        </div>
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
        <div className="flex items-center justify-between">
          <h1 className="text-2xl font-bold tracking-tight text-foreground">
            数据分析
          </h1>
          <AnalyticsTimeRangeSelector value={timeRange} onChange={setTimeRange} />
        </div>

        {/* Overview Cards */}
        <AnalyticsOverviewCards data={data.overview} loading={loading} />

        {/* Funnel + Domain Distribution */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* User Funnel */}
          <div className="p-6 bg-card border border-border rounded-lg shadow-sm">
            <h2 className="text-sm font-semibold text-muted-foreground uppercase tracking-wider mb-6">
              用户转化漏斗
            </h2>
            <div className="space-y-4">
              {funnelData.map((step) => {
                const maxVal = funnelData[0].value || 1;
                const pct = Math.round((step.value / maxVal) * 100);
                return (
                  <div key={step.name}>
                    <div className="flex justify-between text-xs mb-2">
                      <span className="text-muted-foreground font-medium">{step.name}</span>
                      <span className="text-foreground font-bold">
                        {step.value.toLocaleString()} ({pct}%)
                      </span>
                    </div>
                    <div className="h-2 bg-muted rounded-full overflow-hidden">
                      <div
                        className="h-full bg-primary rounded-full transition-all duration-700"
                        style={{ width: `${Math.max(pct, 2)}%` }}
                      />
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

          {/* Domain Distribution */}
          <div className="p-6 bg-card border border-border rounded-lg shadow-sm">
            <h2 className="text-sm font-semibold text-muted-foreground uppercase tracking-wider mb-6">
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
                        key={`cell-${idx}`}
                        fill={CHART_COLORS[idx % CHART_COLORS.length]}
                      />
                    ))}
                  </Pie>
                  <Tooltip
                    contentStyle={{
                      background: 'hsl(var(--card))',
                      border: '1px solid hsl(var(--border))',
                      borderRadius: 'var(--radius)',
                      color: 'hsl(var(--foreground))',
                    }}
                  />
                </PieChart>
              </ResponsiveContainer>
            ) : (
              <p className="text-muted-foreground text-center py-10">暂无数据</p>
            )}
          </div>
        </div>

        {/* Daily Trends */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <div className="p-6 bg-card border border-border rounded-lg shadow-sm">
            <h2 className="text-sm font-semibold text-muted-foreground uppercase tracking-wider mb-6">
              每日注册趋势（30天）
            </h2>
            {data.dailyRegistrations.length > 0 ? (
              <ResponsiveContainer width="100%" height={200}>
                <LineChart data={data.dailyRegistrations}>
                  <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" vertical={false} />
                  <XAxis
                    dataKey="date"
                    tick={{ fontSize: 12, fill: 'hsl(var(--muted-foreground))' }}
                    tickFormatter={(v: string) => v.slice(5)}
                    axisLine={false}
                    tickLine={false}
                    dy={10}
                  />
                  <YAxis 
                    tick={{ fontSize: 12, fill: 'hsl(var(--muted-foreground))' }} 
                    axisLine={false}
                    tickLine={false}
                    dx={-10}
                  />
                  <Tooltip
                    contentStyle={{
                      background: 'hsl(var(--card))',
                      border: '1px solid hsl(var(--border))',
                      borderRadius: 'var(--radius)',
                      color: 'hsl(var(--foreground))',
                    }}
                  />
                  <Line
                    type="monotone"
                    dataKey="count"
                    stroke="hsl(var(--primary))"
                    strokeWidth={2}
                    dot={{ r: 3, fill: 'hsl(var(--primary))' }}
                    activeDot={{ r: 5, strokeWidth: 0 }}
                  />
                </LineChart>
              </ResponsiveContainer>
            ) : (
              <p className="text-muted-foreground text-center py-10">暂无数据</p>
            )}
          </div>

          <div className="p-6 bg-card border border-border rounded-lg shadow-sm">
            <h2 className="text-sm font-semibold text-muted-foreground uppercase tracking-wider mb-6">
              每日生成趋势（30天）
            </h2>
            {data.dailyGenerations.length > 0 ? (
              <ResponsiveContainer width="100%" height={200}>
                <LineChart data={data.dailyGenerations}>
                  <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" vertical={false} />
                  <XAxis
                    dataKey="date"
                    tick={{ fontSize: 12, fill: 'hsl(var(--muted-foreground))' }}
                    tickFormatter={(v: string) => v.slice(5)}
                    axisLine={false}
                    tickLine={false}
                    dy={10}
                  />
                  <YAxis 
                    tick={{ fontSize: 12, fill: 'hsl(var(--muted-foreground))' }} 
                    axisLine={false}
                    tickLine={false}
                    dx={-10}
                  />
                  <Tooltip
                    contentStyle={{
                      background: 'hsl(var(--card))',
                      border: '1px solid hsl(var(--border))',
                      borderRadius: 'var(--radius)',
                      color: 'hsl(var(--foreground))',
                    }}
                  />
                  <Line
                    type="monotone"
                    dataKey="count"
                    stroke="hsl(var(--accent))"
                    strokeWidth={2}
                    dot={{ r: 3, fill: 'hsl(var(--accent))' }}
                    activeDot={{ r: 5, strokeWidth: 0 }}
                  />
                </LineChart>
              </ResponsiveContainer>
            ) : (
              <p className="text-muted-foreground text-center py-10">暂无数据</p>
            )}
          </div>
        </div>

        {/* Template Hotlist */}
        <div className="p-6 bg-card border border-border rounded-lg shadow-sm">
          <h2 className="text-sm font-semibold text-muted-foreground uppercase tracking-wider mb-6 flex items-center">
            <Star className="w-4 h-4 mr-2 text-accent" />
            模板热度 TOP 10
          </h2>
          {data.templateHotlist.length > 0 ? (
            <ResponsiveContainer width="100%" height={300}>
              <BarChart
                data={data.templateHotlist}
                layout="vertical"
                margin={{ left: 120, right: 20 }}
              >
                <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" horizontal={false} />
                <XAxis 
                  type="number" 
                  tick={{ fontSize: 12, fill: 'hsl(var(--muted-foreground))' }} 
                  axisLine={false}
                  tickLine={false}
                />
                <YAxis
                  type="category"
                  dataKey="name"
                  tick={{ fontSize: 12, fill: 'hsl(var(--foreground))', fontWeight: 500 }}
                  width={110}
                  axisLine={false}
                  tickLine={false}
                />
                <Tooltip
                  contentStyle={{
                    background: 'hsl(var(--card))',
                    border: '1px solid hsl(var(--border))',
                    borderRadius: 'var(--radius)',
                    color: 'hsl(var(--foreground))',
                  }}
                  cursor={{ fill: 'hsl(var(--muted)/0.2)' }}
                />
                <Bar dataKey="count" fill="hsl(var(--primary))" radius={[0, 4, 4, 0]} barSize={20} />
              </BarChart>
            </ResponsiveContainer>
          ) : (
            <p className="text-muted-foreground text-center py-10">暂无数据</p>
          )}
        </div>
      </div>
    </AdminLayout>
  );
}
