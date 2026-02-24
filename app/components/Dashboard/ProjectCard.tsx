import Image from 'next/image';
import { CheckCircle, AlertCircle, Clock, Sparkles, Camera, Loader2, ArrowRight } from 'lucide-react';
import { getStatusLabel, getStatusVisual } from '@/lib/status';
import { getTimeAgo } from '@/lib/time';
import { ProjectActionsMenu } from '../ProjectActionsMenu';
import type { ProjectWithTemplate } from '@/types/database';

interface ProjectCardProps {
  project: ProjectWithTemplate;
  onView: () => void;
  onEdit: () => void;
  onDelete: () => void;
  onShare: () => void;
  onDownload: () => void;
  onToggleGalleryShare: (isShared: boolean) => void;
  onClick: () => void;
}

export function ProjectCard({
  project,
  onView,
  onEdit,
  onDelete,
  onShare,
  onDownload,
  onToggleGalleryShare,
  onClick,
}: ProjectCardProps) {
  const hasGeneratedImages =
    project.generation?.status === 'completed' &&
    project.generation?.preview_images &&
    project.generation.preview_images.length > 0;

  const displayImage = hasGeneratedImages
    ? project.generation!.preview_images[0]
    : project.template?.preview_image_url ||
    project.uploaded_photos[0] ||
    'https://images.pexels.com/photos/338515/pexels-photo-338515.jpeg?auto=compress&cs=tinysrgb&w=400';

  const renderStatus = (status: string) => {
    const { icon, colorClass } = getStatusVisual(status as Parameters<typeof getStatusVisual>[0]);
    const label = getStatusLabel(status as Parameters<typeof getStatusLabel>[0]);
    const Icon = icon === 'check' ? CheckCircle : icon === 'clock' ? Clock : AlertCircle;
    return (
      <>
        <Icon className={`w-5 h-5 ${colorClass} ${icon === 'clock' ? 'animate-spin' : ''}`} />
        <span className="text-sm font-medium text-obsidian tracking-wide uppercase">{label}</span>
      </>
    );
  };

  return (
    <div
      className="overflow-hidden rounded-sm border shadow-md transition-all duration-700 cursor-pointer bg-alabaster border-stone/10 hover:shadow-2xl hover:border-gold/30 group"
      onClick={onClick}
    >
      <div className="relative aspect-[4/3] overflow-hidden">
        {/* 主显示图片 */}
        <Image
          src={displayImage}
          alt={project.name}
          fill
          className="object-cover transition-transform duration-700 group-hover:scale-110"
          sizes="(max-width: 768px) 100vw, (max-width: 1200px) 50vw, 33vw"
        />

        {/* 渐变遮罩 */}
        <div className="absolute inset-0 bg-gradient-to-t to-transparent from-obsidian/80 via-obsidian/20" />

        {/* 顶部状态栏 */}
        <div className="flex absolute top-4 right-4 left-4 z-10 justify-between items-center">
          <div className="flex items-center gap-2 px-4 py-2 bg-alabaster/95 backdrop-blur-md rounded-sm shadow-sm border border-stone/10">
            {renderStatus(project.generation?.status || project.status)}
          </div>

          <div className="rounded-sm shadow-sm backdrop-blur-md bg-alabaster/95 border border-stone/10">
            <ProjectActionsMenu
              projectId={project.id}
              projectName={project.name}
              status={project.generation?.status || project.status}
              isSharedToGallery={project.generation?.is_shared_to_gallery}
              onView={onView}
              onEdit={onEdit}
              onDelete={onDelete}
              onShare={onShare}
              onDownload={onDownload}
              onToggleGalleryShare={onToggleGalleryShare}
            />
          </div>
        </div>

        {/* 已完成的生成结果 - 显示缩略图网格 */}
        {hasGeneratedImages && project.generation!.preview_images.length > 1 && (
          <div className="absolute bottom-4 left-4 right-4 flex gap-2 opacity-0 group-hover:opacity-100 transition-opacity duration-500">
            {project.generation!.preview_images.slice(0, 4).map((img, idx) => (
              <div
                key={idx}
                className="overflow-hidden relative flex-shrink-0 w-16 h-16 rounded-sm border border-white/20 shadow-xl"
              >
                <Image
                  src={img}
                  alt={`结果 ${idx + 1}`}
                  fill
                  className="object-cover"
                  sizes="64px"
                />
              </div>
            ))}
            {project.generation!.preview_images.length > 4 && (
              <div className="flex flex-shrink-0 justify-center items-center w-16 h-16 rounded-sm border border-white/20 shadow-xl backdrop-blur-md bg-obsidian/80">
                <span className="text-xs font-medium text-alabaster tracking-widest">
                  +{project.generation!.preview_images.length - 4}
                </span>
              </div>
            )}
          </div>
        )}

        {/* 已完成但只有1张图 - 显示查看按钮 */}
        {hasGeneratedImages && project.generation!.preview_images.length === 1 && (
          <div className="absolute right-4 bottom-4 left-4 opacity-0 transition-opacity duration-500 group-hover:opacity-100">
            <button className="w-full px-4 py-3 bg-alabaster text-obsidian rounded-sm hover:bg-gold transition-all duration-500 font-medium flex items-center justify-center gap-2 shadow-xl uppercase tracking-widest text-xs border border-transparent hover:border-obsidian/10">
              查看结果
              <ArrowRight className="w-4 h-4" />
            </button>
          </div>
        )}

        {/* 未完成 - 显示进度提示 */}
        {!hasGeneratedImages && project.generation?.status !== 'failed' && (
          <div className="absolute right-4 bottom-4 left-4 opacity-0 transition-opacity duration-500 group-hover:opacity-100">
            <div className="w-full px-4 py-3 bg-obsidian/90 backdrop-blur-md text-alabaster rounded-sm font-medium flex items-center justify-center gap-2 shadow-xl border border-white/10 uppercase tracking-widest text-xs">
              <Loader2 className="w-4 h-4 animate-spin" />
              生成中...
            </div>
          </div>
        )}
      </div>

      {/* 卡片信息区域 */}
      <div className="p-6 space-y-4 bg-alabaster">
        <div>
          <h3 className="mb-2 text-lg font-medium transition-colors font-display text-obsidian group-hover:text-gold line-clamp-1 uppercase tracking-wider">
            {project.name}
          </h3>
          <p className="text-xs tracking-widest text-stone line-clamp-1 uppercase">
            模板：{project.template?.name || '未选择'}
          </p>
        </div>

        <div className="flex justify-between items-center pt-4 text-xs font-light text-stone/80 uppercase tracking-widest border-t border-stone/10">
          <div className="flex gap-3 items-center">
            {hasGeneratedImages && (
              <div className="flex items-center gap-1.5 text-obsidian font-medium">
                <Sparkles className="w-3.5 h-3.5" />
                {project.generation!.preview_images.length} 张作品
              </div>
            )}
            {!hasGeneratedImages && project.uploaded_photos.length > 0 && (
              <div className="flex items-center gap-1.5 text-stone transition-colors group-hover:text-obsidian">
                <Camera className="w-3.5 h-3.5" />
                {project.uploaded_photos.length} 张照片
              </div>
            )}
          </div>
          <span>{getTimeAgo(project.created_at)}</span>
        </div>
      </div>
    </div>
  );
}

