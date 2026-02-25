"use client";

import { Button } from '@/components/ui/button';
import { Edit, Trash2, Power, PowerOff, Copy, Check } from 'lucide-react';
import type { ModelConfig } from '@/types/model-config';
import { useState } from 'react';
import { cn } from '@/lib/utils';

interface ModelConfigListProps {
  configs: ModelConfig[];
  onEdit: (config: ModelConfig) => void;
  onDelete: (id: string) => void;
  onToggleStatus: (config: ModelConfig) => void;
}

const TYPE_LABELS: Record<string, string> = {
  'generate-image': '图片生成',
  'other': '其他',
};

const STATUS_LABELS: Record<string, string> = {
  'active': '激活',
  'inactive': '停用',
};

const SOURCE_LABELS: Record<string, string> = {
  'openAi': 'OpenAI',
  'openRouter': 'OpenRouter',
  '302': '302.AI',
};

export function ModelConfigList({ configs, onEdit, onDelete, onToggleStatus }: ModelConfigListProps) {
  const [copiedId, setCopiedId] = useState<string | null>(null);

  const handleCopyApiKey = async (config: ModelConfig) => {
    try {
      // 这里显示的是脱敏的 API Key，实际复制需要从详情接口获取
      // 为了简化，这里只是示例
      const apiKeyMasked = (config as unknown as { api_key_masked?: string }).api_key_masked || '***';
      await navigator.clipboard.writeText(apiKeyMasked);
      setCopiedId(config.id);
      setTimeout(() => setCopiedId(null), 2000);
    } catch (err) {
      console.error('复制失败:', err);
    }
  };

  if (configs.length === 0) {
    return (
      <div className="py-12 text-center text-muted-foreground">
        暂无配置，创建你的第一个模型配置吧。
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {configs.map((config) => {
        const apiKeyMasked = (config as unknown as { api_key_masked?: string }).api_key_masked || '***';
        const isActive = config.status === 'active';

        return (
          <div
            key={config.id}
            className={cn(
              "flex flex-col gap-6 p-6 rounded-xl border transition-all duration-300",
              isActive
                ? "border-primary/50 bg-primary/5 shadow-[0_0_15px_rgba(160,140,100,0.05)] text-foreground"
                : "bg-card hover:border-primary/20 hover:shadow-md text-card-foreground"
            )}
          >
            {/* Header: Title & Badges */}
            <div className="flex justify-between items-start gap-4">
              <div className="space-y-3">
                <div className="flex flex-wrap items-center gap-3">
                  <h3 className="text-xl font-bold tracking-tight">{config.name}</h3>
                  <div className="flex flex-wrap items-center gap-2">
                    <span
                      className={cn(
                        "px-2.5 py-0.5 text-[10px] font-medium rounded-full border",
                        isActive
                          ? "bg-primary/10 text-primary border-primary/20"
                          : "bg-muted text-muted-foreground border-transparent"
                      )}
                    >
                      {STATUS_LABELS[config.status]}
                    </span>
                    <span className="px-2.5 py-0.5 text-[10px] font-medium bg-secondary text-secondary-foreground border rounded-full">
                      {TYPE_LABELS[config.type] || config.type}
                    </span>
                    <span className="px-2.5 py-0.5 text-[10px] font-medium bg-secondary text-secondary-foreground border rounded-full">
                      {SOURCE_LABELS[config.source] || config.source}
                    </span>
                  </div>
                </div>

                {config.description && (
                  <p className="text-sm text-muted-foreground leading-relaxed max-w-3xl">
                    {config.description}
                  </p>
                )}
              </div>

              {/* Actions */}
              <div className="flex flex-shrink-0 gap-1.5 items-center">
                <Button
                  variant="ghost"
                  size="icon"
                  className={isActive ? "text-primary hover:text-primary/80" : "text-muted-foreground hover:text-foreground"}
                  onClick={() => onToggleStatus(config)}
                  title={isActive ? '停用' : '激活'}
                >
                  {isActive ? (
                    <Power className="w-4 h-4" />
                  ) : (
                    <PowerOff className="w-4 h-4" />
                  )}
                </Button>

                <Button
                  variant="ghost"
                  size="icon"
                  onClick={() => onEdit(config)}
                  title="编辑"
                  className="text-muted-foreground hover:text-foreground"
                >
                  <Edit className="w-4 h-4" />
                </Button>

                <Button
                  variant="ghost"
                  size="icon"
                  onClick={() => onDelete(config.id)}
                  title="删除"
                  className="text-muted-foreground hover:text-destructive hover:bg-destructive/10"
                >
                  <Trash2 className="w-4 h-4" />
                </Button>
              </div>
            </div>

            {/* Config Details */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6 bg-muted/30 p-5 rounded-lg border border-border/50">
              <div className="space-y-1.5">
                <div className="text-[11px] font-medium text-muted-foreground uppercase tracking-wider">API Base URL</div>
                <div className="font-mono text-sm break-all">{config.api_base_url}</div>
              </div>
              <div className="space-y-1.5">
                <div className="text-[11px] font-medium text-muted-foreground uppercase tracking-wider">模型名称</div>
                <div className="font-mono text-sm">{config.model_name}</div>
              </div>
              <div className="col-span-1 md:col-span-2 space-y-1.5">
                <div className="text-[11px] font-medium text-muted-foreground uppercase tracking-wider">API Key</div>
                <div className="flex items-center gap-2 mt-1 max-w-2xl">
                  <code className="flex-1 px-3 py-1.5 text-sm bg-background/60 border rounded-md">
                    {apiKeyMasked}
                  </code>
                  <Button
                    variant="outline"
                    size="icon"
                    className="w-8 h-8 flex-shrink-0"
                    onClick={() => handleCopyApiKey(config)}
                    title="复制 API Key"
                  >
                    {copiedId === config.id ? (
                      <Check className="w-4 h-4 text-green-600" />
                    ) : (
                      <Copy className="w-4 h-4 text-muted-foreground" />
                    )}
                  </Button>
                </div>
              </div>
            </div>

            {/* Footer */}
            <div className="flex flex-wrap gap-6 text-xs text-muted-foreground pt-1">
              <span>创建时间: {new Date(config.created_at).toLocaleString('zh-CN')}</span>
              <span>更新时间: {new Date(config.updated_at).toLocaleString('zh-CN')}</span>
            </div>
          </div>
        );
      })}
    </div>
  );
}

