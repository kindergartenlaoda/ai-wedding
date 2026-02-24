import type { ProjectWithTemplate } from '@/types/database';

export interface ToastState {
  message: string;
  type: 'success' | 'error';
}

export interface DashboardActionsDeps {
  refreshProjects: () => Promise<void>;
  refreshGenerations: () => Promise<void>;
  deleteGeneration: (id: string) => Promise<boolean>;
  user: { id: string } | null | undefined;
  activeTab: string;
  setDeleteConfirm: (value: { id: string; name: string } | null) => void;
}

export interface DashboardActions {
  toast: ToastState | null;
  setToast: (toast: ToastState | null) => void;
  handleDeleteProject: (projectId: string) => Promise<void>;
  handleUpdateProject: (projectId: string, updatedData: Partial<ProjectWithTemplate>) => Promise<void>;
  handleDeleteSingleGeneration: (id: string) => Promise<void>;
  handleBatchDownload: (project: ProjectWithTemplate) => Promise<void>;
  handleToggleGalleryShare: (generationId: string, isShared: boolean) => Promise<void>;
  handleManualRefresh: () => Promise<void>;
}

export interface DashboardModalsState {
  selectedProject: ProjectWithTemplate | null;
  setSelectedProject: (project: ProjectWithTemplate | null) => void;
  editingProject: ProjectWithTemplate | null;
  setEditingProject: (project: ProjectWithTemplate | null) => void;
  selectedSingleGeneration: import('@/types/database').SingleGeneration | null;
  setSelectedSingleGeneration: (gen: import('@/types/database').SingleGeneration | null) => void;
  deleteConfirm: { id: string; name: string } | null;
  setDeleteConfirm: (value: { id: string; name: string } | null) => void;
}
