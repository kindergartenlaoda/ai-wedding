import { useState } from 'react';
import type { ProjectWithTemplate, SingleGeneration } from '@/types/database';
import type { DashboardModalsState } from './types';

export function useDashboardModals(): DashboardModalsState {
  const [selectedProject, setSelectedProject] = useState<ProjectWithTemplate | null>(null);
  const [editingProject, setEditingProject] = useState<ProjectWithTemplate | null>(null);
  const [selectedSingleGeneration, setSelectedSingleGeneration] =
    useState<SingleGeneration | null>(null);
  const [deleteConfirm, setDeleteConfirm] = useState<{ id: string; name: string } | null>(null);

  return {
    selectedProject,
    setSelectedProject,
    editingProject,
    setEditingProject,
    selectedSingleGeneration,
    setSelectedSingleGeneration,
    deleteConfirm,
    setDeleteConfirm,
  };
}
