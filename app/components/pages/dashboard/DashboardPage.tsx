import { useState, useMemo } from 'react';
import dynamic from 'next/dynamic';
import { Plus, RefreshCw, Sparkles } from 'lucide-react';
import { Template, generationToSingleGeneration } from '@/types/database';
import { useAuth } from '@/contexts/AuthContext';
import { useProjects } from '@/hooks/useProjects';
import { useSingleGenerations } from '@/hooks/useGenerations';
import { useDashboardActions } from '@/hooks/useDashboardActions';
import { useDashboardModals } from '@/hooks/useDashboardModals';
import { ProjectFilters } from './ProjectFilters';
import type { FilterState } from '@/types/filters';
import { FadeIn, GlassCard } from '@/components/react-bits';
import { Toast } from './Toast';
import { InvitePanel } from './InvitePanel';
import {
  DashboardHeader,
  DashboardTabs,
  SingleGenerationList,
  ProjectList,
} from './Dashboard';

// Code split modals
const ConfirmDialog = dynamic(() => import('./ConfirmDialog').then(m => ({ default: m.ConfirmDialog })));
const ProjectDetailModal = dynamic(() => import('./ProjectDetailModal').then(m => ({ default: m.ProjectDetailModal })));
const ProjectEditModal = dynamic(() => import('./ProjectEditModal').then(m => ({ default: m.ProjectEditModal })));
const SingleGenerationDetailModal = dynamic(() => import('./SingleGenerationDetailModal').then(m => ({ default: m.SingleGenerationDetailModal })));
const OnboardingModal = dynamic(() => import('./OnboardingModal').then(m => ({ default: m.OnboardingModal })));

// Import hook separately
import { useShowOnboarding } from './OnboardingModal';

interface DashboardPageProps {
  onNavigate: (page: string, template?: Template, generationId?: string) => void;
}

export function DashboardPage({ onNavigate }: DashboardPageProps) {
  const { profile, user } = useAuth();
  const showOnboarding = useShowOnboarding(!!user);
  const [onboardingDismissed, setOnboardingDismissed] = useState(false);
  const { projects, loading, hasMore: projectsHasMore, loadMore: loadMoreProjects, refreshProjects } = useProjects();
  const {
    generations,
    loading: singleLoading,
    hasMore: generationsHasMore,
    loadMore: loadMoreGenerations,
    refreshGenerations,
    deleteGeneration,
  } = useSingleGenerations();
  const [activeTab, setActiveTab] = useState<'all' | 'completed' | 'single'>('all');
  const [filters, setFilters] = useState<FilterState>({
    searchQuery: '',
    status: 'all',
    dateRange: 'all',
    templateName: '',
  });

  const modals = useDashboardModals();
  const actions = useDashboardActions({
    refreshProjects,
    refreshGenerations,
    deleteGeneration,
    user,
    activeTab,
    setDeleteConfirm: modals.setDeleteConfirm,
  });

  // 项目标签页配置
  const tabs = useMemo(
    () => [
      { id: 'all', label: '所有项目', count: projects.length },
      {
        id: 'completed',
        label: '已完成',
        count: projects.filter(p => p.generation?.status === 'completed').length,
      },
      { id: 'single', label: '单张生成', count: generations.length },
    ],
    [projects, generations]
  );

  // 获取所有模板名称
  const templateNames = useMemo(() => {
    const names = new Set<string>();
    projects.forEach(p => {
      if (p.template?.name) names.add(p.template.name);
    });
    return Array.from(names).sort();
  }, [projects]);

  // 应用筛选逻辑
  const filteredProjects = useMemo(() => {
    return projects.filter(project => {
      if (activeTab === 'completed' && project.generation?.status !== 'completed')
        return false;
      if (filters.searchQuery) {
        const query = filters.searchQuery.toLowerCase();
        const matchName = project.name.toLowerCase().includes(query);
        const matchTemplate = project.template?.name?.toLowerCase().includes(query);
        if (!matchName && !matchTemplate) return false;
      }
      if (filters.status !== 'all' && project.generation?.status !== filters.status) {
        return false;
      }
      if (filters.dateRange !== 'all') {
        const now = new Date();
        const createdAt = new Date(project.created_at);
        const diffDays = (now.getTime() - createdAt.getTime()) / (1000 * 60 * 60 * 24);
        if (filters.dateRange === 'today' && diffDays > 1) return false;
        if (filters.dateRange === 'week' && diffDays > 7) return false;
        if (filters.dateRange === 'month' && diffDays > 30) return false;
      }
      if (filters.templateName && project.template?.name !== filters.templateName) {
        return false;
      }
      return true;
    });
  }, [projects, activeTab, filters]);

  return (
    <div className="py-12 min-h-screen bg-obsidian text-alabaster">
      <div className="px-4 mx-auto max-w-7xl sm:px-6 lg:px-8">
        <DashboardHeader
          profile={profile}
        />

        <FadeIn delay={0.2}>
          <div className="flex flex-col gap-4 justify-between items-start mb-8 sm:flex-row sm:items-center">
            <div>
              <div className="flex gap-3 items-center">
                <h2 className="text-2xl font-medium font-display text-alabaster uppercase tracking-widest">我的项目</h2>
              </div>
              <p className="mt-2 text-pearl/60 font-light tracking-wide text-sm">
                {projects.length} 个项目总计
                {filteredProjects.length < projects.length && (
                  <span className="text-gold">
                    {' '}
                    • {filteredProjects.length} 个匹配筛选条件
                  </span>
                )}
              </p>
            </div>

            <div className="flex gap-3 items-center">
              <button
                onClick={actions.handleManualRefresh}
                disabled={loading}
                className="flex gap-2 items-center px-4 py-3 text-xs tracking-[0.2em] font-medium rounded-sm border transition-all duration-300 bg-transparent text-pearl hover:text-alabaster hover:bg-white/5 border-white/10 disabled:opacity-50 uppercase"
                title="刷新项目列表"
              >
                <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
                刷新
              </button>
              <button
                onClick={() => onNavigate('create')}
                className="flex gap-2 items-center px-6 py-3 text-xs tracking-[0.2em] font-medium bg-gold text-obsidian rounded-sm transition-all duration-500 hover:-translate-y-px uppercase shadow-[0_0_15px_rgba(200,160,100,0.3)] hover:shadow-[0_0_20px_rgba(200,160,100,0.5)]"
              >
                <Plus className="w-4 h-4" />
                创建作品
              </button>
            </div>
          </div>
        </FadeIn>

        {/* 搜索和筛选 */}
        <ProjectFilters
          filters={filters}
          onFiltersChange={setFilters}
          templateNames={templateNames}
        />

        <FadeIn delay={0.3}>
          <GlassCard className="mb-6 !bg-white/5 border-white/10 backdrop-blur-md shadow-2xl">
            <DashboardTabs
              tabs={tabs}
              activeTab={activeTab}
              onTabChange={id => setActiveTab(id as typeof activeTab)}
            />

            {/* 单张生成标签页 */}
            {activeTab === 'single' ? (
              <SingleGenerationList
                generations={generations}
                loading={singleLoading}
                hasMore={generationsHasMore}
                onLoadMore={loadMoreGenerations}
                onDelete={actions.handleDeleteSingleGeneration}
                onView={(generation) => {
                  const singleGen = generationToSingleGeneration(generation);
                  if (singleGen) {
                    modals.setSelectedSingleGeneration(singleGen);
                  }
                }}
                onNavigateToGenerateSingle={() => onNavigate('generate-single')}
              />
            ) : (
              /* 项目列表标签页 */
              <ProjectList
                projects={filteredProjects}
                loading={loading}
                hasMore={projectsHasMore}
                onLoadMore={loadMoreProjects}
                onProjectClick={modals.setSelectedProject}
                onView={project => {
                  if (project.generation?.id) {
                    onNavigate('results', undefined, project.generation.id);
                  }
                }}
                onEdit={modals.setEditingProject}
                onDelete={project =>
                  modals.setDeleteConfirm({ id: project.id, name: project.name })
                }
                onShare={project => {
                  if (project.generation?.id) {
                    const url = `${window.location.origin}/results/${project.generation.id}`;
                    navigator.clipboard
                      .writeText(url)
                      .then(() => {
                        actions.setToast({ message: '分享链接已复制到剪贴板', type: 'success' });
                      })
                      .catch(() => {
                        actions.setToast({ message: '复制失败，请重试', type: 'error' });
                      });
                  }
                }}
                onDownload={actions.handleBatchDownload}
                onToggleGalleryShare={actions.handleToggleGalleryShare}
                onNavigateToTemplates={() => onNavigate('templates')}
              />
            )}

            {/* 邀请面板 */}
            {profile?.invite_code && (
              <div className="px-8 pb-6">
                <InvitePanel
                  inviteCode={profile.invite_code}
                  inviteCount={profile.invite_count ?? 0}
                  rewardCredits={profile.reward_credits ?? 0}
                />
              </div>
            )}

            <div className="p-10 m-8 bg-obsidian border border-white/10 rounded-sm shadow-xl relative overflow-hidden group">
              {/* Decorative glow */}
              <div className="absolute top-0 right-0 w-64 h-64 bg-gold/10 rounded-full blur-[80px] -translate-y-1/2 translate-x-1/2 group-hover:bg-gold/20 transition-colors duration-700 pointer-events-none" />

              <div className="flex flex-col gap-8 items-center md:flex-row relative z-10">
                <div className="flex flex-shrink-0 justify-center items-center w-16 h-16 bg-obsidian rounded-sm border border-gold/20 overflow-hidden shadow-[0_0_20px_rgba(200,160,100,0.15)] group-hover:border-gold/40 transition-colors duration-500">
                  <Sparkles className="w-6 h-6 text-gold group-hover:scale-110 transition-transform duration-500" />
                </div>
                <div className="flex-1 text-center md:text-left">
                  <h3 className="mb-3 text-xl font-medium font-display text-alabaster uppercase tracking-widest">
                    需要更多额度？
                  </h3>
                  <p className="text-pearl/70 font-light text-sm tracking-wide">
                    补充艺术创作所需的暗房胶片，无限制突破视觉边界，探索极致光影的无限可能。
                  </p>
                </div>
                <button
                  onClick={() => onNavigate('pricing')}
                  className="px-8 py-4 font-medium whitespace-nowrap bg-transparent border border-white/20 rounded-sm shadow-sm transition-all duration-500 text-pearl hover:bg-white/5 hover:text-alabaster hover:border-gold/50 hover:shadow-[0_0_20px_rgba(200,160,100,0.2)] uppercase tracking-[0.2em] text-xs"
                >
                  探索方案
                </button>
              </div>
            </div>
          </GlassCard>
        </FadeIn>
      </div>

      {/* 删除确认对话框 */}
      {modals.deleteConfirm && (
        <ConfirmDialog
          isOpen={true}
          title="删除项目"
          message={`确定要删除项目"${modals.deleteConfirm.name}"吗？此操作不可撤销，将同时删除所有相关的生成记录。`}
          confirmText="删除"
          cancelText="取消"
          variant="danger"
          onConfirm={() => actions.handleDeleteProject(modals.deleteConfirm!.id)}
          onCancel={() => modals.setDeleteConfirm(null)}
        />
      )}

      {/* 项目详情模态框 */}
      {modals.selectedProject && (
        <ProjectDetailModal
          project={modals.selectedProject}
          isOpen={!!modals.selectedProject}
          onClose={() => modals.setSelectedProject(null)}
          onView={() => {
            if (modals.selectedProject?.generation?.id) {
              onNavigate('results', undefined, modals.selectedProject.generation.id);
              modals.setSelectedProject(null);
            }
          }}
          onEdit={() => {
            if (modals.selectedProject) {
              modals.setEditingProject(modals.selectedProject);
              modals.setSelectedProject(null);
            }
          }}
          onShare={() => {
            if (modals.selectedProject?.generation?.id) {
              const url = `${window.location.origin}/results/${modals.selectedProject.generation.id}`;
              navigator.clipboard.writeText(url).then(() => {
                actions.setToast({ message: '分享链接已复制到剪贴板', type: 'success' });
              });
            }
            modals.setSelectedProject(null);
          }}
          onDownload={() => {
            if (modals.selectedProject) {
              actions.handleBatchDownload(modals.selectedProject);
              modals.setSelectedProject(null);
            }
          }}
        />
      )}

      {/* 项目编辑模态框 */}
      {modals.editingProject && (
        <ProjectEditModal
          project={modals.editingProject}
          isOpen={!!modals.editingProject}
          onClose={() => modals.setEditingProject(null)}
          onSave={async updatedData => {
            if (modals.editingProject) {
              await actions.handleUpdateProject(modals.editingProject.id, updatedData);
              modals.setEditingProject(null);
            }
          }}
        />
      )}

      {/* 单张生成详情模态框 */}
      {modals.selectedSingleGeneration && (
        <SingleGenerationDetailModal
          generation={modals.selectedSingleGeneration}
          isOpen={!!modals.selectedSingleGeneration}
          onClose={() => modals.setSelectedSingleGeneration(null)}
        />
      )}

      {/* Onboarding Modal */}
      {showOnboarding && !onboardingDismissed && (
        <OnboardingModal onClose={() => setOnboardingDismissed(true)} />
      )}

      {/* Toast 通知 */}
      {actions.toast && (
        <Toast message={actions.toast.message} type={actions.toast.type} onClose={() => actions.setToast(null)} />
      )}
    </div>
  );
}
