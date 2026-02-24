import { useState } from 'react';
import type { ProjectWithTemplate } from '@/types/database';
import type { DashboardActionsDeps, DashboardActions, ToastState } from './types';

export function useDashboardActions(deps: DashboardActionsDeps): DashboardActions {
  const {
    refreshProjects,
    refreshGenerations,
    deleteGeneration,
    user,
    activeTab,
    setDeleteConfirm,
  } = deps;

  const [toast, setToast] = useState<ToastState | null>(null);

  const handleManualRefresh = async () => {
    if (activeTab === 'single') {
      await refreshGenerations();
    } else {
      await refreshProjects();
    }
    setToast({ message: '列表已刷新', type: 'success' });
  };

  const handleDeleteProject = async (projectId: string) => {
    try {
      const res = await fetch(`/api/projects/${projectId}`, {
        method: 'DELETE',
        credentials: 'include',
      });
      if (!res.ok) throw new Error('删除失败');
      setToast({ message: '项目已删除', type: 'success' });
      await refreshProjects();
    } catch (error) {
      console.error('删除项目失败:', error);
      setToast({ message: '删除失败，请重试', type: 'error' });
    } finally {
      setDeleteConfirm(null);
    }
  };

  const handleUpdateProject = async (
    projectId: string,
    updatedData: Partial<ProjectWithTemplate>
  ) => {
    try {
      const res = await fetch(`/api/projects/${projectId}`, {
        method: 'PATCH',
        credentials: 'include',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name: updatedData.name }),
      });
      if (!res.ok) throw new Error('更新失败');
      setToast({ message: '项目更新成功', type: 'success' });
      await refreshProjects();
    } catch (error) {
      console.error('更新项目失败:', error);
      throw new Error(error instanceof Error ? error.message : '更新失败');
    }
  };

  const handleDeleteSingleGeneration = async (id: string) => {
    try {
      await deleteGeneration(id);
      setToast({ message: '记录已删除', type: 'success' });
    } catch (error) {
      console.error('删除单张生成记录失败:', error);
      setToast({ message: '删除失败，请重试', type: 'error' });
    }
  };

  const handleBatchDownload = async (project: ProjectWithTemplate) => {
    if (
      !project.generation?.preview_images ||
      project.generation.preview_images.length === 0
    ) {
      setToast({ message: '该项目暂无可下载的图片', type: 'error' });
      return;
    }

    try {
      setToast({ message: '开始准备下载...', type: 'success' });
      const images = project.generation.preview_images;
      const projectName = project.name || '项目';
      let successCount = 0;

      for (const [index, imageUrl] of images.entries()) {
        try {
          const link = document.createElement('a');
          const filename = `${projectName}_${index + 1}.jpg`;

          if (imageUrl.startsWith('data:')) {
            link.href = imageUrl;
            link.download = filename;
            document.body.appendChild(link);
            link.click();
            document.body.removeChild(link);
          } else {
            const response = await fetch(imageUrl);
            const blob = await response.blob();
            const blobUrl = window.URL.createObjectURL(blob);
            link.href = blobUrl;
            link.download = filename;
            document.body.appendChild(link);
            link.click();
            document.body.removeChild(link);
            window.URL.revokeObjectURL(blobUrl);
          }
          successCount++;
        } catch (error) {
          console.error(`下载第 ${index + 1} 张图片失败:`, error);
        }
      }

      if (successCount === images.length) {
        setToast({ message: `成功下载 ${successCount} 张图片`, type: 'success' });
      } else {
        setToast({
          message: `下载完成：${successCount}/${images.length} 张图片成功`,
          type: 'error',
        });
      }
    } catch (error) {
      console.error('批量下载失败:', error);
      setToast({ message: '批量下载失败，请重试', type: 'error' });
    }
  };

  const handleToggleGalleryShare = async (generationId: string, isShared: boolean) => {
    if (!user) {
      setToast({ message: '请先登录', type: 'error' });
      return;
    }

    try {
      const response = await fetch(`/api/generations/${generationId}/share`, {
        method: 'PATCH',
        credentials: 'include',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ isShared }),
      });

      if (response.status === 401) {
        setToast({ message: '认证失败，请重新登录', type: 'error' });
        return;
      }

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || '更新分享状态失败');
      }

      const result = await response.json();
      setToast({ message: result.message, type: 'success' });
      await refreshProjects();
    } catch (error) {
      console.error('切换分享状态失败:', error);
      setToast({
        message: error instanceof Error ? error.message : '操作失败，请重试',
        type: 'error',
      });
    }
  };

  return {
    toast,
    setToast,
    handleDeleteProject,
    handleUpdateProject,
    handleDeleteSingleGeneration,
    handleBatchDownload,
    handleToggleGalleryShare,
    handleManualRefresh,
  };
}
