"use client";

import { useEffect, useState, useCallback } from 'react';
import { useRouter, useParams } from 'next/navigation';
import { AdminLayout } from '@/components/admin/AdminLayout';
import { TemplateForm } from '@/components/admin/TemplateForm';
import type { AdminTemplate } from '@/types/database';
import type { TemplateFormInput } from '@/types/admin';

export default function EditTemplatePage() {
  const router = useRouter();
  const params = useParams();
  const templateId = params.id as string;

  const [template, setTemplate] = useState<AdminTemplate | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const loadTemplate = useCallback(async () => {
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
        throw new Error('加载模板失败');
      }

      const data = await response.json();
      const foundTemplate = data.templates.find((t: AdminTemplate) => t.id === templateId);

      if (!foundTemplate) {
        setError('未找到模板');
        return;
      }

      setTemplate(foundTemplate);
    } catch (err) {
      console.error('加载模板出错:', err);
      setError(err instanceof Error ? err.message : '加载模板失败');
    } finally {
      setIsLoading(false);
    }
  }, [router, templateId]);

  useEffect(() => {
    loadTemplate();
  }, [loadTemplate]);

  const handleSubmit = async (data: TemplateFormInput) => {
    const response = await fetch(`/api/admin/templates/${templateId}`, {
      method: 'PUT',
      credentials: 'include',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(data),
    });

    if (response.status === 401) {
      router.push('/');
      return;
    }

    if (!response.ok) {
      const error = await response.json();
      throw new Error(error.error || '更新模板失败');
    }

    router.push('/admin/templates');
  };

  const handleCancel = () => {
    router.push('/admin/templates');
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

  if (isLoading) {
    return (
      <AdminLayout>
        <div className="py-12 text-center">加载中...</div>
      </AdminLayout>
    );
  }

  if (!template) {
    return (
      <AdminLayout>
        <div className="py-12 text-center text-muted-foreground">
          未找到模板
        </div>
      </AdminLayout>
    );
  }

  return (
    <AdminLayout>
      <div className="p-4 space-y-6 max-w-4xl">
        <div>
          <h1 className="text-3xl font-bold">编辑模板</h1>
          <p className="text-muted-foreground">更新模板：{template.name}</p>
        </div>

        <TemplateForm
          template={template}
          onSubmit={handleSubmit}
          onCancel={handleCancel}
        />
      </div>
    </AdminLayout>
  );
}
