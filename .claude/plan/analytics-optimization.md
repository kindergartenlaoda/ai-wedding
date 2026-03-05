# 管理后台分析页面优化 - 技术实施计划

## 一、项目概览

### 当前状态分析
- **文件位置**: `/Users/zhangyanhua/AI/ai-wedding/app/admin/analytics/page.tsx` (373行)
- **技术栈**: Next.js 14 + React 18 + TypeScript + Recharts + TailwindCSS
- **数据源**: `/Users/zhangyanhua/AI/ai-wedding/app/api/admin/analytics/route.ts`
- **类型定义**: `/Users/zhangyanhua/AI/ai-wedding/app/types/analytics.ts`
- **现有问题**:
  - 硬编码的金色系配色方案（8个金色变体）不适合多领域区分
  - 固定30天时间范围，无法灵活查询
  - 概览卡片缺少趋势指示和可视化
  - 无图表交互工具（下载、全屏等）
  - 无空状态和骨架屏处理

### 优化目标
按三个阶段实施UI/UX设计方案，遵循项目规范：
- 单文件不超过500行（需拆分组件）
- 无 `any` 类型
- 类型定义独立到 `types.ts`
- 使用 Lucide 图标（无 emoji）

---

## 二、文件结构规划

### 2.1 新增组件目录结构
```
app/components/admin/analytics/
├── types.ts                          # 分析页面专用类型定义
├── AnalyticsOverviewCards.tsx        # 概览卡片组件（带趋势）
├── AnalyticsTimeRangeSelector.tsx    # 时间范围选择器
├── AnalyticsChartToolbar.tsx         # 图表工具栏（下载/全屏）
├── AnalyticsPieChart.tsx             # 领域分布饼图（语义化配色）
├── AnalyticsLineChart.tsx            # 趋势折线图
├── AnalyticsBarChart.tsx             # 模板热度柱状图
├── AnalyticsFunnelChart.tsx          # 转化漏斗图
├── AnalyticsEmptyState.tsx           # 空状态组件
└── AnalyticsSkeletonLoader.tsx       # 骨架屏加载器
```

### 2.2 新增 Hooks
```
app/hooks/
├── useAnalytics.ts                   # 分析数据获取（支持时间范围）
├── useTimeRange.ts                   # 时间范围状态管理
└── useChartExport.ts                 # 图表导出功能
```

### 2.3 新增类型定义
```
app/types/
└── analytics.ts                      # 扩展现有类型（新增趋势、时间范围）
```

### 2.4 API 路由改动
```
app/api/admin/analytics/
└── route.ts                          # 支持查询参数：startDate, endDate
```

### 2.5 工具函数
```
app/lib/
├── domain-colors.ts                  # 领域语义化配色映射
└── chart-utils.ts                    # 图表工具函数（导出、格式化）
```

---

## 三、分阶段实施计划

### 第一阶段：核心功能重构（预估 8-10 小时）

#### 任务 1.1：类型系统扩展
**文件**: `app/types/analytics.ts`

**新增类型**:
```typescript
export type TimeRangePreset = 'today' | '7d' | '30d' | '90d' | 'custom';

export interface TimeRange {
  startDate: Date;
  endDate: Date;
  preset: TimeRangePreset;
}

export interface TrendData {
  value: number;
  change: number;        // 变化值
  changePercent: number; // 变化百分比
  trend: 'up' | 'down' | 'stable';
}

export interface AnalyticsOverviewEnhanced extends AnalyticsOverview {
  totalUsersTrend: TrendData;
  totalGenerationsTrend: TrendData;
  completedGenerationsTrend: TrendData;
  totalOrdersTrend: TrendData;
}
```

**依赖**: 无

---

#### 任务 1.2：领域配色系统
**文件**: `app/lib/domain-colors.ts`

**实现内容**:
```typescript
import type { Domain } from '@/types/domain';

export const DOMAIN_COLORS: Record<Domain, string> = {
  wedding: '#C8A064',    // 金色
  children: '#FF6B9D',   // 粉色
  id_photo: '#4A90E2',   // 蓝色
  artistic: '#9B59B6',   // 紫色
  portrait: '#E67E22',   // 橙色
  anime: '#FF5252',      // 红色
  landscape: '#27AE60',  // 绿色
  product: '#95A5A6',    // 灰色
};

export function getDomainColor(domain: Domain): string {
  return DOMAIN_COLORS[domain] || '#C8A064';
}

export function getDomainColorArray(): string[] {
  return Object.values(DOMAIN_COLORS);
}
```

**依赖**: `app/types/domain.ts`

---

#### 任务 1.3：时间范围选择器组件
**文件**: `app/components/admin/analytics/AnalyticsTimeRangeSelector.tsx`

**功能**:
- 快捷选项：今日、7天、30天、90天
- 自定义日期范围选择（使用 shadcn/ui DatePicker）
- 状态管理通过 props 传递

**Props 接口**:
```typescript
interface AnalyticsTimeRangeSelectorProps {
  value: TimeRange;
  onChange: (range: TimeRange) => void;
}
```

**依赖**:
- `shadcn/ui` 的 `Popover` 和 `Calendar` 组件
- `date-fns` 用于日期计算

---

#### 任务 1.4：概览卡片增强
**文件**: `app/components/admin/analytics/AnalyticsOverviewCards.tsx`

**功能**:
- 显示主要指标数值
- 趋势指示器（↑/↓ + 百分比）
- 迷你折线图（使用 Recharts 的 Sparkline）
- 趋势颜色：上升绿色、下降红色、稳定灰色

**Props 接口**:
```typescript
interface AnalyticsOverviewCardsProps {
  data: AnalyticsOverviewEnhanced;
  loading?: boolean;
}
```

**依赖**:
- `app/types/analytics.ts` (TrendData)
- Recharts 的 `LineChart` 组件

---

#### 任务 1.5：API 路由扩展
**文件**: `app/api/admin/analytics/route.ts`

**改动内容**:
1. 接受查询参数 `startDate` 和 `endDate`
2. 计算趋势数据（对比前一周期）
3. 返回增强的 `AnalyticsOverviewEnhanced` 数据

**查询参数验证**:
```typescript
const searchParams = req.nextUrl.searchParams;
const startDate = searchParams.get('startDate')
  ? new Date(searchParams.get('startDate')!)
  : new Date(Date.now() - 30 * 24 * 60 * 60 * 1000);
const endDate = searchParams.get('endDate')
  ? new Date(searchParams.get('endDate')!)
  : new Date();
```

**趋势计算逻辑**:
```typescript
// 计算前一周期数据
const periodDuration = endDate.getTime() - startDate.getTime();
const prevStartDate = new Date(startDate.getTime() - periodDuration);
const prevEndDate = startDate;

// 对比计算趋势
const totalUsersTrend = calculateTrend(currentUsers, prevUsers);
```

**依赖**:
- `app/types/analytics.ts` (TrendData)
- Prisma 查询优化

---

### 第二阶段：交互与视觉优化（预估 8 小时）

#### 任务 2.1：图表工具栏组件
**文件**: `app/components/admin/analytics/AnalyticsChartToolbar.tsx`

**功能**:
- 下载为 PNG（使用 `html2canvas`）
- 下载为 CSV（数据导出）
- 全屏查看（使用 `screenfull.js` 或原生 Fullscreen API）
- 数据表格视图切换

**Props 接口**:
```typescript
interface AnalyticsChartToolbarProps {
  chartRef: React.RefObject<HTMLDivElement>;
  data: unknown[];
  filename: string;
  onToggleView?: () => void;
}
```

**依赖**:
- `html2canvas` (npm install)
- `file-saver` (npm install)

---

#### 任务 2.2：领域分布饼图重构
**文件**: `app/components/admin/analytics/AnalyticsPieChart.tsx`

**改动内容**:
- 使用 `getDomainColorArray()` 替代硬编码金色系
- 增强 Tooltip 显示（领域名 + 数量 + 百分比）
- 图例交互（点击隐藏/显示）

**Props 接口**:
```typescript
interface AnalyticsPieChartProps {
  data: DomainDistributionItem[];
  loading?: boolean;
}
```

**依赖**:
- `app/lib/domain-colors.ts`

---

#### 任务 2.3：空状态与骨架屏
**文件**:
- `app/components/admin/analytics/AnalyticsEmptyState.tsx`
- `app/components/admin/analytics/AnalyticsSkeletonLoader.tsx`

**空状态组件**:
```typescript
interface AnalyticsEmptyStateProps {
  icon: LucideIcon;
  title: string;
  description?: string;
}
```

**骨架屏组件**:
```typescript
interface AnalyticsSkeletonLoaderProps {
  type: 'card' | 'chart' | 'table';
  count?: number;
}
```

**依赖**:
- `shadcn/ui` 的 `Skeleton` 组件

---

#### 任务 2.4：视觉层次优化
**文件**: `app/admin/analytics/page.tsx`

**改动内容**:
1. 增大概览卡片字号（text-3xl → text-4xl）
2. 添加卡片渐变背景
3. 优化间距（gap-6 → gap-8）
4. 图表容器添加阴影和边框
5. 响应式断点优化

**TailwindCSS 类调整**:
```tsx
// 概览卡片
<div className="p-6 bg-gradient-to-br from-white/5 to-white/[0.02] border border-white/10 rounded-sm shadow-lg shadow-black/20">

// 图表容器
<div className="p-8 bg-white/5 border border-gold/10 rounded-sm shadow-lg shadow-black/20">
```

**依赖**: 无

---

### 第三阶段：高级功能（预估 9 小时）

#### 任务 3.1：漏斗图交互增强
**文件**: `app/components/admin/analytics/AnalyticsFunnelChart.tsx`

**功能**:
- 点击漏斗层级打开模态框
- 显示该层级的用户列表（分页）
- 显示转化率百分比

**新增 API**:
```
GET /api/admin/analytics/funnel-users?stage=firstGeneration&page=1&limit=20
```

**Props 接口**:
```typescript
interface AnalyticsFunnelChartProps {
  data: AnalyticsFunnel;
  onStageClick?: (stage: 'registered' | 'firstGeneration' | 'paid') => void;
}
```

**依赖**:
- `shadcn/ui` 的 `Dialog` 组件
- 新增 API 路由

---

#### 任务 3.2：数据导出功能
**文件**: `app/hooks/useChartExport.ts`

**功能**:
- 导出 PDF 报告（包含所有图表截图）
- 导出 CSV（所有数据表）

**Hook 接口**:
```typescript
interface UseChartExportReturn {
  exportToPDF: () => Promise<void>;
  exportToCSV: (data: unknown[], filename: string) => void;
  isExporting: boolean;
}
```

**依赖**:
- `jspdf` (npm install)
- `html2canvas`
- `papaparse` (CSV 生成)

---

#### 任务 3.3：响应式优化
**文件**: `app/admin/analytics/page.tsx`

**改动内容**:
1. 概览卡片：移动端 2 列布局
2. 图表区域：大屏 2 列，中小屏 1 列
3. 漏斗图和饼图：中屏并排显示

**响应式类调整**:
```tsx
// 概览卡片
<div className="grid grid-cols-2 lg:grid-cols-4 gap-6">

// 图表区域
<div className="grid grid-cols-1 xl:grid-cols-2 gap-6">

// 漏斗图和饼图
<div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
```

**依赖**: 无

---

## 四、技术实现方案

### 4.1 时间范围状态管理
使用 React 状态 + URL 查询参数同步：

```typescript
// app/hooks/useTimeRange.ts
export function useTimeRange() {
  const router = useRouter();
  const searchParams = useSearchParams();

  const [timeRange, setTimeRange] = useState<TimeRange>(() => {
    const start = searchParams.get('startDate');
    const end = searchParams.get('endDate');
    const preset = searchParams.get('preset') as TimeRangePreset || '30d';

    return {
      startDate: start ? new Date(start) : getPresetStartDate(preset),
      endDate: end ? new Date(end) : new Date(),
      preset,
    };
  });

  const updateTimeRange = (range: TimeRange) => {
    setTimeRange(range);
    router.push(`?startDate=${range.startDate.toISOString()}&endDate=${range.endDate.toISOString()}&preset=${range.preset}`);
  };

  return { timeRange, updateTimeRange };
}
```

---

### 4.2 趋势数据计算
在 API 路由中实现：

```typescript
function calculateTrend(current: number, previous: number): TrendData {
  const change = current - previous;
  const changePercent = previous > 0 ? (change / previous) * 100 : 0;

  let trend: 'up' | 'down' | 'stable' = 'stable';
  if (Math.abs(changePercent) > 1) {
    trend = changePercent > 0 ? 'up' : 'down';
  }

  return {
    value: current,
    change,
    changePercent,
    trend,
  };
}
```

---

### 4.3 图表导出实现
使用 `html2canvas` 截图 + `jspdf` 生成 PDF：

```typescript
// app/hooks/useChartExport.ts
export function useChartExport() {
  const [isExporting, setIsExporting] = useState(false);

  const exportToPDF = async () => {
    setIsExporting(true);
    try {
      const pdf = new jsPDF('p', 'mm', 'a4');
      const charts = document.querySelectorAll('[data-chart]');

      for (let i = 0; i < charts.length; i++) {
        const canvas = await html2canvas(charts[i] as HTMLElement);
        const imgData = canvas.toDataURL('image/png');

        if (i > 0) pdf.addPage();
        pdf.addImage(imgData, 'PNG', 10, 10, 190, 0);
      }

      pdf.save('analytics-report.pdf');
    } finally {
      setIsExporting(false);
    }
  };

  const exportToCSV = (data: unknown[], filename: string) => {
    const csv = Papa.unparse(data);
    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
    saveAs(blob, `${filename}.csv`);
  };

  return { exportToPDF, exportToCSV, isExporting };
}
```

---

### 4.4 组件拆分策略
主页面 `page.tsx` 保持简洁（< 200 行），职责：
- 数据获取（使用 `useAnalytics` hook）
- 布局结构
- 组件组合

所有图表和卡片逻辑封装到独立组件：
- `AnalyticsOverviewCards` (概览卡片)
- `AnalyticsFunnelChart` (漏斗图)
- `AnalyticsPieChart` (饼图)
- `AnalyticsLineChart` (折线图)
- `AnalyticsBarChart` (柱状图)

---

## 五、API 接口改动

### 5.1 现有接口扩展
**路由**: `GET /api/admin/analytics`

**新增查询参数**:
```typescript
interface AnalyticsQueryParams {
  startDate?: string;  // ISO 8601 格式
  endDate?: string;    // ISO 8601 格式
}
```

**响应数据扩展**:
```typescript
interface AnalyticsResponse extends AnalyticsData {
  overview: AnalyticsOverviewEnhanced;  // 包含趋势数据
  timeRange: {
    startDate: string;
    endDate: string;
  };
}
```

---

### 5.2 新增接口
**路由**: `GET /api/admin/analytics/funnel-users`

**查询参数**:
```typescript
interface FunnelUsersQueryParams {
  stage: 'registered' | 'firstGeneration' | 'paid';
  page: number;
  limit: number;
}
```

**响应数据**:
```typescript
interface FunnelUsersResponse {
  users: Array<{
    id: string;
    email: string;
    created_at: string;
    last_generation_at?: string;
    total_orders?: number;
  }>;
  total: number;
  page: number;
  limit: number;
}
```

---

## 六、依赖包安装

```bash
# 图表导出
pnpm add html2canvas jspdf file-saver papaparse

# 类型定义
pnpm add -D @types/papaparse

# 日期处理（如果未安装）
pnpm add date-fns

# shadcn/ui 组件（如果未安装）
pnpm dlx shadcn@latest add calendar popover dialog skeleton
```

---

## 七、测试与验证

### 7.1 功能验证清单
- [ ] 时间范围选择器正常工作，所有图表联动更新
- [ ] 概览卡片显示趋势指示器和迷你折线图
- [ ] 领域分布饼图使用语义化配色
- [ ] 图表工具栏可以下载 PNG 和 CSV
- [ ] 空状态和骨架屏正常显示
- [ ] 漏斗图点击可以查看用户列表
- [ ] PDF 导出包含所有图表
- [ ] 响应式布局在移动端正常

### 7.2 性能优化建议
1. **图表懒加载**: 使用 `React.lazy()` 延迟加载图表组件
2. **数据缓存**: 使用 SWR 或 React Query 缓存 API 响应
3. **虚拟滚动**: 用户列表超过 100 条时使用 `react-window`
4. **防抖**: 时间范围选择器使用 `useDebouncedValue`

---

## 八、实施时间表

| 阶段 | 任务 | 预估时间 | 依赖 |
|------|------|---------|------|
| **第一阶段** | 类型系统扩展 | 1h | 无 |
| | 领域配色系统 | 2h | 无 |
| | 时间范围选择器 | 3h | shadcn/ui |
| | 概览卡片增强 | 2h | 类型扩展 |
| | API 路由扩展 | 2h | 无 |
| **第二阶段** | 图表工具栏 | 3h | html2canvas |
| | 饼图重构 | 2h | 领域配色 |
| | 空状态与骨架屏 | 2h | 无 |
| | 视觉层次优化 | 1h | 无 |
| **第三阶段** | 漏斗图交互 | 4h | 新增 API |
| | 数据导出 | 3h | jsPDF |
| | 响应式优化 | 2h | 无 |
| **总计** | | **27h** | |

---

## 九、潜在挑战与解决方案

### 9.1 挑战：动态领域配色映射复杂
**解决方案**:
- 在 `domains` 表中预定义 `chart_color` 字段（hex 格式）
- 或使用固定的 `DOMAIN_COLORS` 映射表（推荐，更简单）

### 9.2 挑战：PDF 导出图表质量差
**解决方案**:
- 使用 `html2canvas` 的 `scale: 2` 选项提高分辨率
- 或使用 Recharts 的 `toDataURL()` 方法直接导出 SVG

### 9.3 挑战：时间范围查询性能问题
**解决方案**:
- 在 `created_at` 字段上添加数据库索引
- 使用 Prisma 的 `gte` 和 `lte` 优化查询
- 考虑添加数据聚合表（按天/周/月预聚合）

### 9.4 挑战：单文件超过 500 行
**解决方案**:
- 严格按照组件拆分策略执行
- 主页面只保留布局和数据获取逻辑
- 所有图表逻辑封装到独立组件

---

## 十、后续优化方向

1. **实时数据更新**: 使用 WebSocket 或 Server-Sent Events 实现实时刷新
2. **数据对比模式**: 支持选择两个时间段进行对比分析
3. **自定义仪表盘**: 用户可以拖拽调整图表顺序和显示/隐藏
4. **数据钻取**: 点击图表数据点可以查看详细信息
5. **告警系统**: 关键指标异常时发送通知

---

**计划制定完成，等待用户确认后开始实施。**
