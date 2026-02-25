import { Loader2, ChevronDown } from 'lucide-react';
import { ProjectCard } from './ProjectCard';
import { EmptyState } from './EmptyState';
import type { ProjectWithTemplate } from '@/types/database';

interface ProjectListProps {
  projects: ProjectWithTemplate[];
  loading: boolean;
  hasMore?: boolean;
  onLoadMore?: () => void;
  onProjectClick: (project: ProjectWithTemplate) => void;
  onView: (project: ProjectWithTemplate) => void;
  onEdit: (project: ProjectWithTemplate) => void;
  onDelete: (project: ProjectWithTemplate) => void;
  onShare: (project: ProjectWithTemplate) => void;
  onDownload: (project: ProjectWithTemplate) => void;
  onToggleGalleryShare: (generationId: string, isShared: boolean) => void;
  onNavigateToTemplates: () => void;
}

export function ProjectList({
  projects,
  loading,
  hasMore,
  onLoadMore,
  onProjectClick,
  onView,
  onEdit,
  onDelete,
  onShare,
  onDownload,
  onToggleGalleryShare,
  onNavigateToTemplates,
}: ProjectListProps) {
  if (loading && projects.length === 0) {
    return (
      <div className="flex justify-center items-center py-20 bg-transparent">
        <Loader2 className="w-12 h-12 animate-spin text-gold" />
      </div>
    );
  }

  if (projects.length === 0) {
    return <EmptyState type="projects" onAction={onNavigateToTemplates} />;
  }

  return (
    <div>
      <div className="grid grid-cols-1 gap-6 p-6 md:grid-cols-2 lg:grid-cols-3">
        {projects.map(project => (
          <ProjectCard
            key={project.id}
            project={project}
            onClick={() => onProjectClick(project)}
            onView={() => onView(project)}
            onEdit={() => onEdit(project)}
            onDelete={() => onDelete(project)}
            onShare={() => onShare(project)}
            onDownload={() => onDownload(project)}
            onToggleGalleryShare={isShared => {
              if (project.generation?.id) {
                onToggleGalleryShare(project.generation.id, isShared);
              }
            }}
          />
        ))}
      </div>
      {hasMore && onLoadMore && (
        <div className="flex justify-center py-10">
          <button
            onClick={onLoadMore}
            disabled={loading}
            className="flex gap-2 items-center px-8 py-3 text-xs tracking-[0.2em] font-medium rounded-sm border transition-all duration-300 bg-transparent text-pearl hover:text-alabaster hover:bg-white/5 border-white/10 hover:border-gold/30 disabled:opacity-50 uppercase"
          >
            {loading ? (
              <Loader2 className="w-4 h-4 animate-spin text-gold" />
            ) : (
              <ChevronDown className="w-4 h-4" />
            )}
            加载更多
          </button>
        </div>
      )}
    </div>
  );
}

