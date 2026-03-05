/**
 * Analytics data types for admin dashboard
 */

export interface AnalyticsOverview {
  totalUsers: number;
  totalGenerations: number;
  completedGenerations: number;
  totalOrders: number;
  recentUsers: number;
  recentGenerations: number;
}

export interface AnalyticsFunnel {
  registered: number;
  firstGeneration: number;
  paid: number;
}

export interface TemplateHotlistItem {
  template_id: string | null;
  name: string;
  domain: string;
  count: number;
}

export interface DomainDistributionItem {
  domain: string;
  count: number;
  [key: string]: string | number;
}

export interface DailyDataPoint {
  date: string;
  count: number;
}

export interface FeedbackStats {
  averageRating: number | null;
  totalFeedbacks: number;
}

export interface AnalyticsData {
  overview: AnalyticsOverview;
  funnel: AnalyticsFunnel;
  templateHotlist: TemplateHotlistItem[];
  domainDistribution: DomainDistributionItem[];
  dailyRegistrations: DailyDataPoint[];
  dailyGenerations: DailyDataPoint[];
  feedback: FeedbackStats;
}

/**
 * Time range presets for analytics filtering
 */
export type TimeRangePreset = 'today' | '7d' | '30d' | '90d' | 'custom';

/**
 * Time range selection state
 */
export interface TimeRange {
  startDate: Date;
  endDate: Date;
  preset: TimeRangePreset;
}

/**
 * Trend data for metrics comparison
 */
export interface TrendData {
  value: number;
  change: number;
  changePercent: number;
  trend: 'up' | 'down' | 'stable';
}

/**
 * Enhanced overview with trend indicators
 */
export interface AnalyticsOverviewEnhanced extends AnalyticsOverview {
  totalUsersTrend?: TrendData;
  totalGenerationsTrend?: TrendData;
  completedGenerationsTrend?: TrendData;
  totalOrdersTrend?: TrendData;
}
