"use client";

import { Calendar } from 'lucide-react';
import type { TimeRange, TimeRangePreset } from '@/types/analytics';

interface AnalyticsTimeRangeSelectorProps {
  value: TimeRange;
  onChange: (range: TimeRange) => void;
}

const PRESETS: Array<{ label: string; value: TimeRangePreset; days: number }> = [
  { label: '今日', value: 'today', days: 0 },
  { label: '7天', value: '7d', days: 7 },
  { label: '30天', value: '30d', days: 30 },
  { label: '90天', value: '90d', days: 90 },
];

export function AnalyticsTimeRangeSelector({ value, onChange }: AnalyticsTimeRangeSelectorProps) {
  const handlePresetClick = (preset: TimeRangePreset, days: number) => {
    const endDate = new Date();
    const startDate = new Date();

    if (preset === 'today') {
      startDate.setHours(0, 0, 0, 0);
      endDate.setHours(23, 59, 59, 999);
    } else {
      // Subtract days to get the start date (inclusive of today)
      startDate.setDate(startDate.getDate() - (days - 1));
      startDate.setHours(0, 0, 0, 0);
      endDate.setHours(23, 59, 59, 999);
    }

    onChange({
      startDate,
      endDate,
      preset,
    });
  };

  return (
    <div className="flex items-center gap-2">
      <Calendar className="w-4 h-4 text-primary" />
      <div className="flex gap-2 p-1 bg-muted rounded-lg">
        {PRESETS.map((preset) => (
          <button
            key={preset.value}
            onClick={() => handlePresetClick(preset.value, preset.days)}
            className={`
              px-3 py-1.5 text-xs font-medium rounded-md transition-all
              ${
                value.preset === preset.value
                  ? 'bg-background text-foreground shadow-sm'
                  : 'text-muted-foreground hover:text-foreground hover:bg-background/50'
              }
            `}
          >
            {preset.label}
          </button>
        ))}
      </div>
    </div>
  );
}
