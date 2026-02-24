import { Search, Calendar, Filter, X } from 'lucide-react';
import { useState } from 'react';
import type { FilterState } from '@/types/filters';

interface ProjectFiltersProps {
  filters: FilterState;
  onFiltersChange: (filters: FilterState) => void;
  templateNames: string[];
}

export function ProjectFilters({ filters, onFiltersChange, templateNames }: ProjectFiltersProps) {
  const [showAdvanced, setShowAdvanced] = useState(false);

  const handleSearchChange = (searchQuery: string) => {
    onFiltersChange({ ...filters, searchQuery });
  };

  const handleStatusChange = (status: FilterState['status']) => {
    onFiltersChange({ ...filters, status });
  };

  const handleDateRangeChange = (dateRange: FilterState['dateRange']) => {
    onFiltersChange({ ...filters, dateRange });
  };

  const handleTemplateChange = (templateName: string) => {
    onFiltersChange({ ...filters, templateName });
  };

  const hasActiveFilters =
    filters.searchQuery !== '' ||
    filters.status !== 'all' ||
    filters.dateRange !== 'all' ||
    filters.templateName !== '';

  const clearFilters = () => {
    onFiltersChange({
      searchQuery: '',
      status: 'all',
      dateRange: 'all',
      templateName: '',
    });
    setShowAdvanced(false);
  };

  return (
    <div className="bg-stone/5 rounded-sm shadow-sm border border-stone/10 p-6 mb-8">
      <div className="flex flex-col gap-4">
        {/* 搜索栏 */}
        <div className="flex items-center gap-3">
          <div className="flex-1 relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-stone" />
            <input
              type="text"
              placeholder="搜索项目名称或模板..."
              value={filters.searchQuery}
              onChange={(e) => handleSearchChange(e.target.value)}
              className="w-full pl-10 pr-4 py-3 border border-stone/20 bg-alabaster rounded-sm focus:outline-none focus:ring-1 focus:ring-gold focus:border-gold transition-all text-obsidian placeholder-stone/50 font-light"
            />
          </div>

          <button
            onClick={() => setShowAdvanced(!showAdvanced)}
            className={`px-6 py-3 rounded-sm font-medium flex items-center gap-2 transition-all duration-500 uppercase tracking-widest text-xs border ${showAdvanced || hasActiveFilters
                ? 'bg-obsidian text-gold border-obsidian shadow-md'
                : 'bg-transparent text-obsidian border-stone/20 hover:bg-stone/5'
              }`}
          >
            <Filter className="w-5 h-5" />
            高级筛选
          </button>

          {hasActiveFilters && (
            <button
              onClick={clearFilters}
              className="px-6 py-3 bg-red-900/10 text-red-900 rounded-sm font-medium flex items-center gap-2 hover:bg-red-900/20 transition-all duration-500 uppercase tracking-widest text-xs border border-transparent"
            >
              <X className="w-5 h-5" />
              清除
            </button>
          )}
        </div>

        {/* 高级筛选选项 */}
        {showAdvanced && (
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 pt-4 border-t border-stone/10">
            {/* 状态筛选 */}
            <div>
              <label className="block text-xs font-medium text-obsidian uppercase tracking-widest mb-2">项目状态</label>
              <select
                value={filters.status}
                onChange={(e) => handleStatusChange(e.target.value as FilterState['status'])}
                className="w-full px-4 py-3 border border-stone/20 bg-alabaster rounded-sm focus:outline-none focus:ring-1 focus:ring-gold focus:border-gold transition-all text-obsidian font-light text-sm"
              >
                <option value="all">全部状态</option>
                <option value="completed">已完成</option>
                <option value="failed">失败</option>
              </select>
            </div>

            {/* 日期范围 */}
            <div>
              <label className="block text-xs font-medium text-obsidian uppercase tracking-widest mb-2 flex items-center gap-2">
                <Calendar className="w-4 h-4" />
                创建时间
              </label>
              <select
                value={filters.dateRange}
                onChange={(e) => handleDateRangeChange(e.target.value as FilterState['dateRange'])}
                className="w-full px-4 py-3 border border-stone/20 bg-alabaster rounded-sm focus:outline-none focus:ring-1 focus:ring-gold focus:border-gold transition-all text-obsidian font-light text-sm"
              >
                <option value="all">全部时间</option>
                <option value="today">今天</option>
                <option value="week">最近一周</option>
                <option value="month">最近一月</option>
              </select>
            </div>

            {/* 模板筛选 */}
            <div>
              <label className="block text-xs font-medium text-obsidian uppercase tracking-widest mb-2">使用模板</label>
              <select
                value={filters.templateName}
                onChange={(e) => handleTemplateChange(e.target.value)}
                className="w-full px-4 py-3 border border-stone/20 bg-alabaster rounded-sm focus:outline-none focus:ring-1 focus:ring-gold focus:border-gold transition-all text-obsidian font-light text-sm"
              >
                <option value="">全部模板</option>
                {templateNames.map((name) => (
                  <option key={name} value={name}>
                    {name}
                  </option>
                ))}
              </select>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
