"use client";

import { useEffect, useState, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import Image from 'next/image';
import { Button } from '@/components/ui/button';
import { AdminLayout } from '@/components/admin/AdminLayout';
import { Plus, Edit, Trash2, Eye, EyeOff, Copy } from 'lucide-react';
import type { AdminTemplate } from '@/types/database';
import { cn } from '@/lib/utils';
import {
  AlertDialog,
  AlertDialogTrigger,
  AlertDialogContent,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogCancel,
  AlertDialogAction,
} from '@/components/ui/alert-dialog';

export default function AdminTemplatesPage() {
  const router = useRouter();
  const [templates, setTemplates] = useState<AdminTemplate[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [expanded, setExpanded] = useState<Record<string, boolean>>({});
  const [selectedDomain, setSelectedDomain] = useState<string>('all');
  const [domains, setDomains] = useState<Array<{ slug: string; name: string }>>([]);

  const loadTemplates = useCallback(async () => {
    try {
      setIsLoading(true);
      setError(null);

      const response = await fetch('/api/admin/templates', {
        credentials: 'include',
      });

      if (response.status === 401) {
        router.push('/');
        return;
      }

      if (!response.ok) {
        if (response.status === 403) {
          setError('访问被拒绝，需要管理员权限。');
          return;
        }
        throw new Error('加载模板失败');
      }

      const data = await response.json();
      setTemplates(data.templates || []);
    } catch (err) {
      console.error('加载模板出错:', err);
      setError(err instanceof Error ? err.message : '加载模板失败');
    } finally {
      setIsLoading(false);
    }
  }, [router]);

  useEffect(() => {
    loadTemplates();
  }, [loadTemplates]);

  useEffect(() => {
    const loadDomains = async () => {
      try {
        const response = await fetch('/api/admin/domains', { credentials: 'include' });
        if (response.ok) {
          const data = await response.json();
          setDomains(data.data || []);
        }
      } catch (err) {
        console.error('加载域列表失败:', err);
      }
    };
    loadDomains();
  }, []);

  const toggleExpand = (id: string) => {
    setExpanded((prev) => ({ ...prev, [id]: !prev[id] }));
  };

  const handleDelete = async (templateId: string, skipConfirm?: boolean) => {
    if (!skipConfirm) {
      // 若未通过弹窗确认，则进行浏览器确认（兜底）
      if (!confirm('确定要删除此模板吗？')) return;
    }

    try {
      const response = await fetch(`/api/admin/templates/${templateId}`, {
        method: 'DELETE',
        credentials: 'include',
      });

      if (response.status === 401) {
        router.push('/');
        return;
      }

      if (!response.ok) {
        throw new Error('删除模板失败');
      }

      await loadTemplates();
    } catch (err) {
      console.error('删除出错:', err);
      alert(err instanceof Error ? err.message : '删除模板失败');
    }
  };

  const toggleActive = async (template: AdminTemplate) => {
    try {
      const response = await fetch(`/api/admin/templates/${template.id}`, {
        method: 'PUT',
        credentials: 'include',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ is_active: !template.is_active }),
      });

      if (response.status === 401) {
        router.push('/');
        return;
      }

      if (!response.ok) {
        throw new Error('更新模板失败');
      }

      await loadTemplates();
    } catch (err) {
      console.error('切换启用状态出错:', err);
      alert(err instanceof Error ? err.message : '更新模板失败');
    }
  };

  // 复制模板：创建一份副本并跳转到编辑页
  const duplicateTemplate = async (template: AdminTemplate) => {
    try {
      const response = await fetch('/api/admin/templates', {
        method: 'POST',
        credentials: 'include',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: `${template.name}（副本）`,
          description: template.description || '',
          category: template.category,
          preview_image_url: template.preview_image_url,
          prompt_config: template.prompt_config,
          prompt_list: template.prompt_list,
          price_credits: template.price_credits,
          is_active: false,
          sort_order: template.sort_order,
        }),
      });

      if (response.status === 401) {
        router.push('/');
        return;
      }
      if (!response.ok) {
        const err = await response.json().catch(() => ({}));
        throw new Error(err?.error || '复制模板失败');
      }

      const data = await response.json();
      const newId = data?.template?.id;
      if (newId) {
        router.push(`/admin/templates/${newId}`);
      } else {
        await loadTemplates();
      }
    } catch (err) {
      console.error('复制模板出错:', err);
      alert(err instanceof Error ? err.message : '复制模板失败');
    }
  };

  // 计算提示词数量（仅展示用）
  const getPromptCount = (t: AdminTemplate) => {
    if (t.prompt_list.length > 0) return t.prompt_list.length;
    if (t.prompt_config.basePrompt?.trim().length) return 1;
    return 1;
  };

  if (error) {
    return (
      <AdminLayout>
        <div className="p-4 text-red-800 bg-red-50 rounded-lg border border-red-200">
          {error}
        </div>
      </AdminLayout>
    );
  }

  // 分类中文标签映射，仅影响展示
  const CATEGORY_LABELS: Record<string, string> = {
    location: '地点',
    fantasy: '奇幻',
    artistic: '艺术',
    classic: '经典',
  };

  // 根据选中的域过滤模板
  const filteredTemplates = selectedDomain === 'all'
    ? templates
    : templates.filter(t => t.domain === selectedDomain);

  return (
    <AdminLayout>
      <div className="p-4 space-y-8">
        <div className="flex justify-between items-center">
          <div>
            <h1 className="text-3xl font-bold">模板管理</h1>
            <p className="text-muted-foreground mt-1.5">管理 AI 生成模板</p>
          </div>
          <Link href="/admin/templates/new">
            <Button>
              <Plus className="mr-2 w-4 h-4" />
              新建模板
            </Button>
          </Link>
        </div>

        {/* 域筛选器 */}
        <div className="flex items-center gap-3">
          <label htmlFor="domain-filter" className="text-sm font-medium">
            筛选域：
          </label>
          <select
            id="domain-filter"
            value={selectedDomain}
            onChange={(e) => setSelectedDomain(e.target.value)}
            className="px-3 py-2 border rounded-lg bg-background text-sm focus:outline-none focus:ring-2 focus:ring-ring"
          >
            <option value="all">全部域 ({templates.length})</option>
            {domains.map((domain) => {
              const count = templates.filter(t => t.domain === domain.slug).length;
              return (
                <option key={domain.slug} value={domain.slug}>
                  {domain.name} ({count})
                </option>
              );
            })}
          </select>
          {selectedDomain !== 'all' && (
            <span className="text-sm text-muted-foreground">
              显示 {filteredTemplates.length} 个模板
            </span>
          )}
        </div>

        {isLoading ? (
          <div className="py-12 text-center">加载中...</div>
        ) : templates.length === 0 ? (
          <div className="py-16 text-center">
            <div className="mx-auto max-w-md space-y-4">
              <h3 className="text-xl font-semibold">还没有模板</h3>
              <p className="text-muted-foreground">创建你的第一个模板，用于 AI 生成与演示。</p>
              <div className="pt-2">
                <Link href="/admin/templates/new">
                  <Button className="px-6">
                    <Plus className="mr-2 w-4 h-4" />
                    创建模板
                  </Button>
                </Link>
              </div>
            </div>
          </div>
        ) : filteredTemplates.length === 0 ? (
          <div className="py-16 text-center">
            <div className="mx-auto max-w-md space-y-4">
              <h3 className="text-xl font-semibold">没有找到模板</h3>
              <p className="text-muted-foreground">当前筛选条件下没有模板，请尝试其他筛选条件。</p>
            </div>
          </div>
        ) : (
          <div className="grid grid-cols-1 gap-6 lg:grid-cols-2 2xl:grid-cols-3">
            {filteredTemplates.map((template) => (
              <div
                key={template.id}
                role="button"
                tabIndex={0}
                aria-label={`编辑模板：${template.name}`}
                onClick={() => router.push(`/admin/templates/${template.id}`)}
                onKeyDown={(e) => {
                  if (e.key === 'Enter' || e.key === ' ') {
                    e.preventDefault();
                    router.push(`/admin/templates/${template.id}`);
                  }
                }}
                className={cn(
                  'group relative flex flex-col overflow-hidden rounded-xl border bg-card shadow-sm transition-all duration-300 hover:shadow-[0_8px_30px_rgba(0,0,0,0.12)] hover:border-primary/30 focus:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 cursor-pointer',
                  !template.is_active && 'opacity-70 grayscale-[0.2]'
                )}
              >
                {/* 状态标签 */}
                {!template.is_active && (
                  <span className="pointer-events-none absolute right-3 top-3 z-10 inline-flex items-center rounded-full border px-2.5 py-1 text-xs font-medium bg-background/80 backdrop-blur-sm text-muted-foreground shadow-sm">
                    未启用
                  </span>
                )}

                {/* 图片区域 - 固定宽高比 */}
                <div className="relative w-full aspect-[16/9] bg-muted overflow-hidden">
                  <Image
                    src={template.preview_image_url}
                    alt={template.name}
                    fill
                    className="object-cover transition-transform duration-300 group-hover:scale-105"
                    unoptimized
                  />
                  {/* 图片遮罩层 */}
                  <div className="absolute inset-0 bg-gradient-to-t from-black/20 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-300" />
                </div>

                {/* 内容区域 */}
                <div className="flex flex-col flex-1 p-5">
                  {/* 标题和状态 */}
                  <div className="flex items-start justify-between gap-3 mb-3">
                    <div className="flex-1 min-w-0">
                      <h3 className="font-semibold text-base truncate mb-2">{template.name}</h3>
                      <div className="flex items-center gap-2 flex-wrap">
                        <span
                          className={cn(
                            "inline-flex items-center rounded-full border px-2 py-0.5 text-[10px] font-medium",
                            template.is_active
                              ? "bg-primary/5 text-primary border-primary/20 shadow-[0_0_10px_rgba(160,140,100,0.1)]"
                              : "bg-muted text-muted-foreground border-transparent"
                          )}
                        >
                          {template.is_active ? "启用中" : "未启用"}
                        </span>
                        <span className="text-xs text-muted-foreground">
                          {CATEGORY_LABELS[template.category] ?? template.category}
                        </span>
                      </div>
                    </div>
                  </div>

                  {/* 描述 */}
                  <p
                    id={`desc-${template.id}`}
                    className="text-sm leading-relaxed text-muted-foreground mb-3 flex-1"
                  >
                    {expanded[template.id]
                      ? template.description
                      : (template.description?.length ?? 0) > 100
                        ? `${template.description?.slice(0, 100)}…`
                        : template.description}
                    {(template.description?.length ?? 0) > 100 && (
                      <button
                        type="button"
                        onClick={(e) => {
                          e.stopPropagation();
                          toggleExpand(template.id);
                        }}
                        className="ml-1 text-xs text-primary hover:underline underline-offset-4"
                        aria-expanded={!!expanded[template.id]}
                        aria-controls={`desc-${template.id}`}
                      >
                        {expanded[template.id] ? "收起" : "展开"}
                      </button>
                    )}
                  </p>

                  {/* 元数据标签 */}
                  <div className="flex flex-wrap gap-2 items-center text-xs text-muted-foreground mb-4">
                    <span className="inline-flex items-center gap-1">
                      <span className="font-medium">{template.price_credits}</span> 积分
                    </span>
                    <span>·</span>
                    <span>排序 {template.sort_order}</span>
                    <span>·</span>
                    <span>{getPromptCount(template)} 个提示词</span>
                  </div>

                  {/* 操作按钮组 */}
                  <div className="flex items-center gap-1 pt-3 border-t">
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={(e) => {
                        e.stopPropagation();
                        duplicateTemplate(template);
                      }}
                      title="复制模板"
                      aria-label="复制模板"
                      className="flex-1"
                    >
                      <Copy className="w-4 h-4 mr-1.5" />
                      <span className="text-xs">复制</span>
                    </Button>

                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={(e) => {
                        e.stopPropagation();
                        toggleActive(template);
                      }}
                      title={template.is_active ? '停用' : '启用'}
                      aria-label={template.is_active ? '停用模板' : '启用模板'}
                      aria-pressed={template.is_active}
                      className="flex-1"
                    >
                      {template.is_active ? (
                        <>
                          <EyeOff className="w-4 h-4 mr-1.5" />
                          <span className="text-xs">停用</span>
                        </>
                      ) : (
                        <>
                          <Eye className="w-4 h-4 mr-1.5" />
                          <span className="text-xs">启用</span>
                        </>
                      )}
                    </Button>

                    <Link href={`/admin/templates/${template.id}`} onClick={(e) => e.stopPropagation()}>
                      <Button
                        variant="ghost"
                        size="sm"
                        title="编辑模板"
                        aria-label={`编辑模板：${template.name}`}
                        className="flex-1"
                      >
                        <Edit className="w-4 h-4 mr-1.5" />
                        <span className="text-xs">编辑</span>
                      </Button>
                    </Link>

                    <AlertDialog>
                      <AlertDialogTrigger asChild>
                        <Button
                          variant="ghost"
                          size="sm"
                          title="删除模板"
                          aria-label="删除模板"
                          onClick={(e) => e.stopPropagation()}
                          className="text-destructive hover:text-destructive hover:bg-destructive/10 flex-1"
                        >
                          <Trash2 className="w-4 h-4 mr-1.5" />
                          <span className="text-xs">删除</span>
                        </Button>
                      </AlertDialogTrigger>
                      <AlertDialogContent onClick={(e) => e.stopPropagation()}>
                        <AlertDialogHeader>
                          <AlertDialogTitle>删除模板</AlertDialogTitle>
                          <AlertDialogDescription>
                            此操作不可恢复，确定删除"{template.name}"吗？
                          </AlertDialogDescription>
                        </AlertDialogHeader>
                        <AlertDialogFooter>
                          <AlertDialogCancel onClick={(e) => e.stopPropagation()}>取消</AlertDialogCancel>
                          <AlertDialogAction
                            className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
                            onClick={(e) => {
                              e.stopPropagation();
                              handleDelete(template.id, true);
                            }}
                          >
                            确认删除
                          </AlertDialogAction>
                        </AlertDialogFooter>
                      </AlertDialogContent>
                    </AlertDialog>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </AdminLayout>
  );
}
