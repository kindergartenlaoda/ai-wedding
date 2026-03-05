import { BarChart, Bar, PieChart, Pie, Cell, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from 'recharts';
import { useMemo } from 'react';

interface Project {
  id: string;
  created_at: string;
  generation?: {
    status: string;
  } | null;
  status: string;
}

interface ProjectStatsChartProps {
  projects: Project[];
}

export function ProjectStatsChart({ projects }: ProjectStatsChartProps) {
  // 按状态统计
  const statusStats = useMemo(() => {
    const stats = {
      completed: 0,
      failed: 0,
    };

    projects.forEach(project => {
      const status = project.generation?.status || project.status;
      if (status === 'completed') stats.completed++;
      else if (status === 'failed') stats.failed++;
    });

    return [
      { name: '已完成', value: stats.completed, color: '#C8A064' }, // Gold
      { name: '失败', value: stats.failed, color: '#3f3f46' }, // Darker stone for failure 
    ].filter(item => item.value > 0);
  }, [projects]);

  // 按日期统计（最近7天）
  const dateStats = useMemo(() => {
    const days = 7;
    const stats: Record<string, number> = {};
    const today = new Date();

    // 初始化最近7天
    for (let i = days - 1; i >= 0; i--) {
      const date = new Date(today);
      date.setDate(date.getDate() - i);
      const dateStr = `${date.getMonth() + 1}月${date.getDate()}日`;
      stats[dateStr] = 0;
    }

    // 统计每天的项目数
    projects.forEach(project => {
      const created = new Date(project.created_at);
      const diffDays = Math.floor((today.getTime() - created.getTime()) / (1000 * 60 * 60 * 24));

      if (diffDays < days) {
        const dateStr = `${created.getMonth() + 1}月${created.getDate()}日`;
        if (stats[dateStr] !== undefined) {
          stats[dateStr]++;
        }
      }
    });

    return Object.entries(stats).map(([date, count]) => ({
      date,
      count,
    }));
  }, [projects]);

  const totalProjects = projects.length;

  if (totalProjects === 0) {
    return (
      <div className="text-center py-12 text-pearl/60 font-light tracking-wide text-sm">
        暂无数据可显示
      </div>
    );
  }

  return (
    <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
      {/* 状态分布饼图 */}
      <div className="bg-white/5 rounded-sm shadow-sm border border-white/10 p-8">
        <h3 className="text-lg font-medium font-display text-alabaster uppercase tracking-widest mb-6">项目状态分布</h3>
        <ResponsiveContainer width="100%" height={300}>
          <PieChart>
            <Pie
              data={statusStats}
              cx="50%"
              cy="50%"
              labelLine={false}
              label
              outerRadius={80}
              fill="#8884d8"
              dataKey="value"
            >
              {statusStats.map((entry, index) => (
                <Cell key={`cell-${index}`} fill={entry.color} />
              ))}
            </Pie>
            <Tooltip formatter={(value: number | undefined) => [`${value ?? 0} 个`, '数量']} />
          </PieChart>
        </ResponsiveContainer>

        {/* 图例 */}
        <div className="mt-4 grid grid-cols-2 gap-2">
          {statusStats.map((item) => (
            <div key={item.name} className="flex items-center gap-2">
              <div
                className="w-3 h-3 rounded-full"
                style={{ backgroundColor: item.color }}
              />
              <span className="text-sm font-light text-pearl/60 tracking-wide">
                {item.name}: {item.value}
              </span>
            </div>
          ))}
        </div>
      </div>

      {/* 最近7天创建趋势 */}
      <div className="bg-white/5 rounded-sm shadow-sm border border-white/10 p-8">
        <h3 className="text-lg font-medium font-display text-alabaster uppercase tracking-widest mb-6">最近7天创建趋势</h3>
        <ResponsiveContainer width="100%" height={300}>
          <BarChart data={dateStats}>
            <CartesianGrid strokeDasharray="3 3" />
            <XAxis
              dataKey="date"
              tick={{ fontSize: 12 }}
              angle={-15}
              textAnchor="end"
              height={60}
            />
            <YAxis />
            <Tooltip />
            <Legend />
            <Bar
              dataKey="count"
              name="项目数"
              fill="#C8A064"
              radius={[2, 2, 0, 0]}
            />
          </BarChart>
        </ResponsiveContainer>

        <div className="mt-6 text-sm font-light text-pearl/60 tracking-wide text-center">
          总计：{totalProjects} 个项目
        </div>
      </div>
    </div>
  );
}
