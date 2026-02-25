import { useState } from 'react';
import { X, Calendar, Camera, Sparkles, Eye, Download, Share2, RefreshCw, ZoomIn, Edit } from 'lucide-react';
import Image from 'next/image';
import { ProjectWithTemplate } from '@/types/database';
import { getStatusLabel, getStatusVisual } from '@/lib/status';
import { GlassCard } from '@/components/react-bits';

interface ProjectDetailModalProps {
  project: ProjectWithTemplate;
  isOpen: boolean;
  onClose: () => void;
  onEdit?: () => void;
  onView?: () => void;
  onShare?: () => void;
  onDownload?: () => void;
}

export function ProjectDetailModal({
  project,
  isOpen,
  onClose,
  onEdit,
  onView,
  onShare,
  onDownload,
}: ProjectDetailModalProps) {
  const [selectedPhotoIndex, setSelectedPhotoIndex] = useState(0);
  const [selectedResultIndex, setSelectedResultIndex] = useState<number | null>(null);
  const [isImageModalOpen, setIsImageModalOpen] = useState(false);

  if (!isOpen) return null;

  const status = project.generation?.status || project.status;

  // 安全的状态类型转换
  const allowed = ['completed', 'failed'] as const;
  type AllowedStatus = typeof allowed[number];
  const safeStatus: AllowedStatus = (allowed as readonly string[]).includes(status)
    ? (status as AllowedStatus)
    : 'completed';

  const { icon, spin } = getStatusVisual(safeStatus);
  const statusLabel = getStatusLabel(safeStatus);
  const isCompleted = status === 'completed';

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleString('zh-CN', {
      year: 'numeric',
      month: 'long',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });
  };

  const handleImageClick = (index: number) => {
    setSelectedResultIndex(index);
    setIsImageModalOpen(true);
  };

  return (
    <>
      <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-md animate-in fade-in duration-300">
        <div className="relative w-full max-w-6xl max-h-[95vh] overflow-hidden">
          <GlassCard className="m-4 !bg-obsidian/90 border-white/10 shadow-2xl">
            {/* 头部 */}
            <div className="flex items-center justify-between p-6 border-b border-white/10">
              <div>
                <h2 className="text-2xl font-display font-medium text-alabaster mb-2 tracking-wider">
                  {project.name}
                </h2>
                <div className="flex items-center gap-2">
                  <div className="flex items-center gap-2 px-3 py-1.5 bg-white/5 rounded-sm border border-white/10">
                    {icon === 'check' ? (
                      <Eye className={`w-4 h-4 text-gold`} />
                    ) : (
                      <RefreshCw className={`w-4 h-4 text-gold ${spin ? 'animate-spin' : ''}`} />
                    )}
                    <span className="text-sm font-medium text-alabaster tracking-widest">{statusLabel}</span>
                  </div>
                  {project.template && (
                    <span className="text-sm text-pearl/50 tracking-widest uppercase">
                      模板：{project.template.name}
                    </span>
                  )}
                </div>
              </div>
              <button
                onClick={onClose}
                className="p-2 rounded-sm hover:bg-white/10 transition-colors"
                aria-label="关闭"
              >
                <X className="w-6 h-6 text-pearl" />
              </button>
            </div>

            {/* 内容区域 */}
            <div className="p-6 max-h-[calc(90vh-200px)] overflow-y-auto">
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
                {/* 左侧：项目信息 */}
                <div className="space-y-8">
                  {/* 基本信息 */}
                  <div>
                    <h3 className="text-lg font-display font-medium text-gold mb-4 uppercase tracking-widest">项目信息</h3>
                    <div className="space-y-4">
                      <div className="flex items-center gap-4 p-4 rounded-sm bg-white/5 border border-white/5">
                        <Calendar className="w-5 h-5 text-pearl/50" />
                        <div>
                          <p className="text-xs text-pearl/50 uppercase tracking-widest mb-1">创建时间</p>
                          <p className="text-alabaster font-medium">{formatDate(project.created_at)}</p>
                        </div>
                      </div>
                      <div className="flex items-center gap-4 p-4 rounded-sm bg-white/5 border border-white/5">
                        <Camera className="w-5 h-5 text-pearl/50" />
                        <div>
                          <p className="text-xs text-pearl/50 uppercase tracking-widest mb-1">上传照片</p>
                          <p className="text-alabaster font-medium">{project.uploaded_photos.length} 张</p>
                        </div>
                      </div>
                      {project.generation?.preview_images && (
                        <div className="flex items-center gap-4 p-4 rounded-sm bg-gold/5 border border-gold/10">
                          <Sparkles className="w-5 h-5 text-gold" />
                          <div>
                            <p className="text-xs text-gold/80 uppercase tracking-widest mb-1">生成结果</p>
                            <p className="text-gold font-medium">{project.generation.preview_images.length} 张预览图</p>
                          </div>
                        </div>
                      )}
                    </div>
                  </div>

                  {/* 模板信息 */}
                  {project.template && (
                    <div>
                      <h3 className="text-lg font-display font-medium text-gold mb-4 uppercase tracking-widest">使用模板</h3>
                      <div className="flex items-center gap-4 p-5 bg-white/5 rounded-sm border border-white/10 group">
                        <div className="relative w-20 h-20 rounded-sm overflow-hidden flex-shrink-0 border border-white/10 shadow-lg group-hover:border-gold/30 transition-colors">
                          <Image
                            src={project.template.preview_image_url}
                            alt={project.template.name}
                            fill
                            className="object-cover group-hover:scale-110 transition-transform duration-700 ease-out"
                            sizes="80px"
                          />
                        </div>
                        <div>
                          <h4 className="font-medium text-alabaster tracking-widest mb-1 text-lg">{project.template.name}</h4>
                          <p className="text-xs text-pearl/50 uppercase tracking-widest">焕影 AI 模板</p>
                        </div>
                      </div>
                    </div>
                  )}

                  {/* 操作按钮 */}
                  <div className="flex flex-wrap gap-4 pt-4 border-t border-white/10">
                    {onView && isCompleted && (
                      <button
                        onClick={onView}
                        className="px-6 py-3 bg-gold text-obsidian rounded-sm hover:-translate-y-px transition-all duration-500 font-medium flex items-center gap-2 uppercase tracking-widest text-xs shadow-[0_0_15px_rgba(200,160,100,0.3)] hover:shadow-[0_0_20px_rgba(200,160,100,0.5)]"
                      >
                        <Eye className="w-4 h-4" />
                        查看结果
                      </button>
                    )}
                    {onEdit && (
                      <button
                        onClick={onEdit}
                        className="px-6 py-3 bg-transparent text-pearl rounded-sm hover:text-alabaster hover:bg-white/5 transition-all duration-300 font-medium border border-white/20 flex items-center gap-2 uppercase tracking-widest text-xs"
                      >
                        <Edit className="w-4 h-4" />
                        编辑项目
                      </button>
                    )}
                    {onShare && isCompleted && (
                      <button
                        onClick={onShare}
                        className="px-6 py-3 bg-transparent text-pearl rounded-sm hover:text-alabaster hover:bg-white/5 transition-all duration-300 font-medium border border-white/20 flex items-center gap-2 uppercase tracking-widest text-xs"
                      >
                        <Share2 className="w-4 h-4" />
                        分享
                      </button>
                    )}
                    {onDownload && isCompleted && (
                      <button
                        onClick={onDownload}
                        className="px-6 py-3 bg-transparent text-pearl rounded-sm hover:text-alabaster hover:bg-white/5 transition-all duration-300 font-medium border border-white/20 flex items-center gap-2 uppercase tracking-widest text-xs"
                      >
                        <Download className="w-4 h-4" />
                        下载全部
                      </button>
                    )}
                  </div>
                </div>

                {/* 右侧：照片与结果预览 */}
                <div className="space-y-6">
                  <h3 className="text-lg font-display font-medium text-gold uppercase tracking-widest">上传的照片</h3>

                  {project.uploaded_photos.length > 0 ? (
                    <div className="space-y-4">
                      {/* 主预览图 */}
                      <div className="relative aspect-[4/3] rounded-sm overflow-hidden bg-obsidian border border-white/10 shadow-lg">
                        <Image
                          src={project.uploaded_photos[selectedPhotoIndex]}
                          alt={`${project.name} 照片 ${selectedPhotoIndex + 1}`}
                          fill
                          className="object-cover"
                          sizes="(max-width: 768px) 100vw, 50vw"
                        />
                      </div>

                      {/* 缩略图列表 */}
                      {project.uploaded_photos.length > 1 && (
                        <div className="grid grid-cols-4 gap-3">
                          {project.uploaded_photos.map((photo, index) => (
                            <button
                              key={index}
                              onClick={() => setSelectedPhotoIndex(index)}
                              className={`relative aspect-square rounded-sm overflow-hidden border transition-all duration-300 ${selectedPhotoIndex === index
                                ? 'border-gold shadow-[0_0_15px_rgba(200,160,100,0.3)]'
                                : 'border-white/10 hover:border-white/30'
                                }`}
                            >
                              <Image
                                src={photo}
                                alt={`${project.name} 缩略图 ${index + 1}`}
                                fill
                                className="object-cover"
                                sizes="100px"
                              />
                            </button>
                          ))}
                        </div>
                      )}
                    </div>
                  ) : (
                    <div className="flex items-center justify-center aspect-[4/3] bg-white/5 rounded-sm border border-dashed border-white/20">
                      <div className="text-center">
                        <Camera className="w-12 h-12 text-pearl/30 mx-auto mb-3" />
                        <p className="text-pearl/50 uppercase tracking-widest text-xs">暂无上传照片</p>
                      </div>
                    </div>
                  )}

                  {/* 生成结果预览 */}
                  {Array.isArray(project.generation?.preview_images) && project.generation?.preview_images.length > 0 && (
                    <div className="space-y-4 pt-6 border-t border-white/10">
                      <h3 className="text-lg font-display font-medium text-gold uppercase tracking-widest">生成结果预览</h3>
                      <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
                        {project.generation.preview_images.map((img, i) => (
                          <button
                            key={i}
                            onClick={() => handleImageClick(i)}
                            className="relative aspect-[3/4] rounded-sm overflow-hidden bg-obsidian border border-white/10 hover:border-gold/50 transition-all duration-300 group shadow-md hover:shadow-[0_0_20px_rgba(200,160,100,0.2)]"
                          >
                            <Image
                              src={img}
                              alt={`生成结果 ${i + 1}`}
                              fill
                              className="object-cover transition-transform duration-700 ease-[cubic-bezier(0.25,1,0.5,1)] group-hover:scale-105"
                              sizes="(max-width: 768px) 50vw, 33vw"
                            />
                            <div className="absolute inset-0 bg-obsidian/40 opacity-0 group-hover:opacity-100 transition-opacity duration-300 flex items-center justify-center backdrop-blur-[2px]">
                              <ZoomIn className="w-8 h-8 text-alabaster" />
                            </div>
                          </button>
                        ))}
                      </div>
                      <p className="text-xs text-pearl/50 uppercase tracking-widest flex items-center gap-2">
                        <span className="w-4 h-px bg-pearl/30" />
                        点击图片查看大图
                      </p>
                    </div>
                  )}
                </div>
              </div>
            </div>
          </GlassCard>
        </div>
      </div>

      {/* 大图查看模态框 */}
      {isImageModalOpen && selectedResultIndex !== null && project.generation?.preview_images && (
        <div
          className="fixed inset-0 z-[100] flex items-center justify-center bg-black/90 backdrop-blur-sm animate-in fade-in duration-200"
          onClick={() => setIsImageModalOpen(false)}
        >
          <button
            onClick={() => setIsImageModalOpen(false)}
            className="absolute top-4 right-4 p-3 rounded-full bg-white/10 hover:bg-white/20 transition-colors"
            aria-label="关闭大图"
          >
            <X className="w-6 h-6 text-white" />
          </button>

          <div className="relative w-full max-w-5xl max-h-[90vh] px-4">
            <div className="relative aspect-[3/4] rounded-lg overflow-hidden shadow-2xl">
              <Image
                src={project.generation.preview_images[selectedResultIndex]}
                alt={`生成结果 ${selectedResultIndex + 1}`}
                fill
                className="object-contain"
                sizes="90vw"
                onClick={(e) => e.stopPropagation()}
              />
            </div>

            {/* 导航按钮 */}
            {project.generation.preview_images.length > 1 && (
              <div className="flex items-center justify-center gap-4 mt-6">
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    setSelectedResultIndex((prev) =>
                      prev === null || prev === 0
                        ? (project.generation?.preview_images?.length || 1) - 1
                        : prev - 1
                    );
                  }}
                  className="px-6 py-3 bg-white/10 hover:bg-white/20 text-white rounded-lg transition-colors font-medium"
                >
                  上一张
                </button>
                <span className="text-white font-medium">
                  {selectedResultIndex + 1} / {project.generation.preview_images.length}
                </span>
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    setSelectedResultIndex((prev) =>
                      prev === null || prev === (project.generation?.preview_images?.length || 1) - 1
                        ? 0
                        : prev + 1
                    );
                  }}
                  className="px-6 py-3 bg-white/10 hover:bg-white/20 text-white rounded-lg transition-colors font-medium"
                >
                  下一张
                </button>
              </div>
            )}
          </div>
        </div>
      )}
    </>
  );
}
