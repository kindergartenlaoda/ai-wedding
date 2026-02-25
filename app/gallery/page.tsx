"use client";

import { useState, useEffect, useCallback } from 'react';
import Image from 'next/image';
import { Heart, Download, User, Calendar, Image as ImageIcon, Loader2 } from 'lucide-react';
import Masonry from 'react-masonry-css';
import type { GalleryItem } from '@/types/database';
import { FadeIn, GlassCard } from '@/components/react-bits';
import { ImagePreviewModal } from '@/components/ImagePreviewModal';
import { useAuth } from '@/contexts/AuthContext';

interface GalleryResponse {
  items: GalleryItem[];
  pagination: {
    page: number;
    limit: number;
    total: number;
    hasMore: boolean;
  };
}

interface LikeState {
  [key: string]: boolean;
}

export default function GalleryPage() {
  const { user } = useAuth();
  const [items, setItems] = useState<GalleryItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [loadingMore, setLoadingMore] = useState(false);
  const [page, setPage] = useState(1);
  const [hasMore, setHasMore] = useState(true);
  const [likedImages, setLikedImages] = useState<LikeState>({});
  const [selectedImage, setSelectedImage] = useState<{
    src: string;
    alt: string;
    item: GalleryItem;
  } | null>(null);

  const breakpointColumnsObj = {
    default: 4,
    1100: 3,
    700: 2,
    500: 1
  };

  const fetchGalleryItems = async (pageNum: number, append = false) => {
    try {
      const response = await fetch(`/api/gallery?page=${pageNum}&limit=20`);
      if (!response.ok) throw new Error('获取画廊数据失败');

      const data: GalleryResponse = await response.json();

      if (append) {
        setItems(prev => [...prev, ...data.items]);
      } else {
        setItems(data.items);
      }

      setHasMore(data.pagination.hasMore);
    } catch (error) {
      console.error('获取画廊数据失败:', error);
    }
  };

  const toggleLike = useCallback(async (generationId: string, imageIndex: number) => {
    if (!user) return;

    const key = `${generationId}-${imageIndex}`;
    const isCurrentlyLiked = likedImages[key] || false;

    // Optimistic update
    setLikedImages(prev => ({ ...prev, [key]: !isCurrentlyLiked }));

    try {
      await fetch('/api/image-likes', {
        method: 'POST',
        credentials: 'include',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          generationId,
          imageIndex,
          imageType: 'preview',
          action: isCurrentlyLiked ? 'remove' : 'add',
        }),
      });
    } catch (error) {
      // Revert on failure
      setLikedImages(prev => ({ ...prev, [key]: isCurrentlyLiked }));
      console.error('点赞操作失败:', error);
    }
  }, [user, likedImages]);

  useEffect(() => {
    const loadInitialData = async () => {
      setLoading(true);
      await fetchGalleryItems(1);
      setLoading(false);
    };

    loadInitialData();
  }, []);

  const loadMore = async () => {
    if (loadingMore || !hasMore) return;

    setLoadingMore(true);
    const nextPage = page + 1;
    await fetchGalleryItems(nextPage, true);
    setPage(nextPage);
    setLoadingMore(false);
  };

  const getTimeAgo = (dateString: string) => {
    const date = new Date(dateString);
    const now = new Date();
    const seconds = Math.floor((now.getTime() - date.getTime()) / 1000);

    if (seconds < 60) return '刚刚';
    if (seconds < 3600) return `${Math.floor(seconds / 60)}分钟前`;
    if (seconds < 86400) return `${Math.floor(seconds / 3600)}小时前`;
    if (seconds < 604800) return `${Math.floor(seconds / 86400)}天前`;
    return `${Math.floor(seconds / 604800)}周前`;
  };

  const handleImageClick = (imageSrc: string, item: GalleryItem, imageIndex: number) => {
    setSelectedImage({
      src: imageSrc,
      alt: `${item.project_name} - 图片 ${imageIndex + 1}`,
      item,
    });
  };

  if (loading) {
    return (
      <div className="flex justify-center items-center min-h-screen bg-obsidian">
        <div className="flex gap-3 items-center text-pearl/60">
          <Loader2 className="w-8 h-8 animate-spin text-alabaster" />
          <span className="text-lg">正在加载画廊...</span>
        </div>
      </div>
    );
  }

  return (
    <div className="py-12 min-h-screen bg-obsidian">
      <div className="px-4 mx-auto max-w-7xl sm:px-6 lg:px-8">
        {/* 页面标题 */}
        <FadeIn delay={0.1}>
          <div className="mb-12 text-center">
            <h1 className="mb-4 text-4xl font-medium font-display text-alabaster uppercase tracking-wider">
              焕影 AI 画廊
            </h1>
            <p className="mx-auto max-w-2xl text-lg text-pearl/60 font-light">
              欣赏由AI生成的精美作品，发现无限创意灵感
            </p>
            <div className="flex gap-6 justify-center items-center mt-6 text-sm text-pearl/60 uppercase tracking-widest text-xs">
              <div className="flex gap-2 items-center">
                <ImageIcon className="w-4 h-4 text-gold" />
                <span>共 {items.reduce((acc, item) => acc + (item.preview_images?.length || 0), 0)} 张作品</span>
              </div>
              <div className="flex gap-2 items-center">
                <User className="w-4 h-4 text-gold" />
                <span>{new Set(items.map(item => item.user_name)).size} 位创作者</span>
              </div>
            </div>
          </div>
        </FadeIn>

        {/* 画廊内容 */}
        {items.length === 0 ? (
          <FadeIn delay={0.2}>
            <div className="py-20 text-center">
              <div className="flex justify-center items-center mx-auto mb-6 w-20 h-20 rounded-full bg-white/5 border border-white/10">
                <ImageIcon className="w-10 h-10 text-pearl/60" />
              </div>
              <h3 className="mb-2 text-xl font-medium font-display text-alabaster tracking-wider">
                画廊暂时为空
              </h3>
              <p className="mb-6 text-pearl/60 font-light max-w-md mx-auto">
                还没有用户分享作品到画廊，成为第一个分享者吧！
              </p>
              <a
                href="/templates"
                className="inline-flex gap-2 items-center px-8 py-4 text-sm tracking-widest uppercase font-medium bg-gold rounded-sm transition-all duration-700 text-obsidian hover:shadow-glow"
              >
                <ImageIcon className="w-4 h-4" />
                开始创作
              </a>
            </div>
          </FadeIn>
        ) : (
          <FadeIn delay={0.2}>
            <Masonry
              breakpointCols={breakpointColumnsObj}
              className="flex -ml-4 w-auto"
              columnClassName="pl-4 bg-clip-padding"
            >
              {items.map((item) =>
                (item.preview_images || []).map((imageSrc, imageIndex) => (
                  <div
                    key={`${item.id}-${imageIndex}`}
                    className="mb-4 cursor-pointer group"
                    onClick={() => handleImageClick(imageSrc, item, imageIndex)}
                  >
                    <GlassCard className="overflow-hidden transition-all duration-500 hover:shadow-xl">
                      <div className="relative">
                        <Image
                          src={imageSrc}
                          alt={`${item.project_name} - 图片 ${imageIndex + 1}`}
                          width={400}
                          height={600}
                          className="object-cover w-full h-auto transition-transform duration-700 group-hover:scale-105"
                          sizes="(max-width: 500px) 100vw, (max-width: 700px) 50vw, (max-width: 1100px) 33vw, 25vw"
                        />

                        {/* 悬停遮罩 */}
                        <div className="absolute inset-0 bg-gradient-to-t via-transparent to-transparent opacity-0 transition-opacity duration-700 from-obsidian/90 group-hover:opacity-100" />

                        {/* 悬停操作按钮 */}
                        <div className="absolute top-4 right-4 opacity-0 transition-opacity duration-300 group-hover:opacity-100 group-focus-within:opacity-100">
                          <div className="flex gap-3">
                            <button
                              onClick={(e) => {
                                e.stopPropagation();
                                toggleLike(item.generation_id, imageIndex);
                              }}
                              className={`flex justify-center items-center w-10 h-10 rounded-sm shadow-xl backdrop-blur-md transition-all duration-300 border border-white/20 ${likedImages[`${item.generation_id}-${imageIndex}`]
                                ? 'bg-gold/90 text-obsidian'
                                : 'bg-black/50 hover:bg-gold text-alabaster hover:text-obsidian'
                                }`}
                              title={likedImages[`${item.generation_id}-${imageIndex}`] ? '取消点赞' : '点赞'}
                            >
                              <Heart className={`w-4 h-4 ${likedImages[`${item.generation_id}-${imageIndex}`] ? 'fill-obsidian' : ''}`} />
                            </button>
                            <button
                              onClick={(e) => {
                                e.stopPropagation();
                                // 下载图片
                                const link = document.createElement('a');
                                link.href = imageSrc;
                                link.download = `${item.project_name}_${imageIndex + 1}.jpg`;
                                link.click();
                              }}
                              className="flex justify-center items-center w-10 h-10 rounded-sm shadow-xl backdrop-blur-md transition-all duration-300 bg-black/50 hover:bg-gold text-alabaster hover:text-obsidian border border-white/20"
                              title="下载"
                            >
                              <Download className="w-4 h-4" />
                            </button>
                          </div>
                        </div>
                      </div>

                      {/* 图片信息 */}
                      <div className="p-5 bg-black/40 border-t border-white/10">
                        <h3 className="mb-2 font-medium font-display text-alabaster uppercase tracking-wide line-clamp-1">
                          {item.project_name}
                        </h3>
                        <p className="mb-4 text-xs tracking-widest uppercase text-pearl/60 line-clamp-1">
                          模板：{item.template_name}
                        </p>
                        <div className="flex justify-between items-center text-xs font-light text-pearl/40 uppercase tracking-widest">
                          <div className="flex gap-2 items-center">
                            <User className="w-3.5 h-3.5" />
                            <span>{item.user_name}</span>
                          </div>
                          <div className="flex gap-2 items-center">
                            <Calendar className="w-3.5 h-3.5" />
                            <span>{getTimeAgo(item.created_at)}</span>
                          </div>
                        </div>
                      </div>
                    </GlassCard>
                  </div>
                ))
              )}
            </Masonry>

            {/* 加载更多按钮 */}
            {hasMore && (
              <div className="mt-16 text-center">
                <button
                  onClick={loadMore}
                  disabled={loadingMore}
                  className="flex gap-3 items-center px-10 py-4 mx-auto font-medium rounded-sm transition-all duration-700 bg-transparent border border-white/20 text-alabaster hover:bg-white/5 hover:border-white/40 disabled:opacity-50 disabled:cursor-not-allowed uppercase text-xs tracking-[0.2em]"
                >
                  {loadingMore ? (
                    <>
                      <Loader2 className="w-4 h-4 animate-spin" />
                      加载中...
                    </>
                  ) : (
                    '加载更多'
                  )}
                </button>
              </div>
            )}
          </FadeIn>
        )}
      </div>

      {/* 图片预览模态框 */}
      {selectedImage && (
        <ImagePreviewModal
          isOpen={!!selectedImage}
          onClose={() => setSelectedImage(null)}
          images={[selectedImage.src]}
          initialIndex={0}
          projectName={selectedImage.item.project_name || 'Gallery Image'}
          onDownload={async (url: string) => {
            try {
              const response = await fetch(url);
              const blob = await response.blob();
              const downloadUrl = window.URL.createObjectURL(blob);
              const link = document.createElement('a');
              link.href = downloadUrl;
              link.download = `${selectedImage.item.project_name}-${Date.now()}.jpg`;
              document.body.appendChild(link);
              link.click();
              document.body.removeChild(link);
              window.URL.revokeObjectURL(downloadUrl);
            } catch (error) {
              console.error('下载失败:', error);
            }
          }}
        />
      )}
    </div>
  );
}
