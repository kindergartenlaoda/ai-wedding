import { MoreVertical, Eye, Edit, Trash2, Share2, Download, Globe, EyeOff } from 'lucide-react';
import { useState, useRef, useEffect, useCallback } from 'react';
import { createPortal } from 'react-dom';

interface ProjectActionsMenuProps {
  projectId: string;
  projectName: string;
  status: string;
  isSharedToGallery?: boolean;
  onView?: () => void;
  onEdit?: () => void;
  onDelete?: () => void;
  onShare?: () => void;
  onDownload?: () => void;
  onToggleGalleryShare?: (isShared: boolean) => void;
}

export function ProjectActionsMenu({
  projectId,
  projectName,
  status,
  isSharedToGallery = false,
  onView,
  onEdit,
  onDelete,
  onShare,
  onDownload,
  onToggleGalleryShare,
}: ProjectActionsMenuProps) {
  const [isOpen, setIsOpen] = useState(false);
  const buttonRef = useRef<HTMLButtonElement>(null);
  const menuRef = useRef<HTMLDivElement>(null);
  const [menuPosition, setMenuPosition] = useState({ top: 0, left: 0 });

  const updatePosition = useCallback(() => {
    if (buttonRef.current) {
      const rect = buttonRef.current.getBoundingClientRect();
      setMenuPosition({
        top: rect.bottom + 8,
        left: rect.right,
      });
    }
  }, []);

  // 点击外部关闭菜单
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (
        menuRef.current && !menuRef.current.contains(event.target as Node) &&
        buttonRef.current && !buttonRef.current.contains(event.target as Node)
      ) {
        setIsOpen(false);
      }
    };

    if (isOpen) {
      updatePosition();
      document.addEventListener('mousedown', handleClickOutside);
      window.addEventListener('scroll', () => setIsOpen(false), true);
      window.addEventListener('resize', () => setIsOpen(false));
    }

    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
      window.removeEventListener('scroll', () => setIsOpen(false), true);
      window.removeEventListener('resize', () => setIsOpen(false));
    };
  }, [isOpen, updatePosition]);

  const handleAction = (action: () => void | undefined) => {
    return (e: React.MouseEvent) => {
      e.stopPropagation();
      setIsOpen(false);
      if (action) action();
    };
  };

  const isCompleted = status === 'completed';

  return (
    <div className="relative" id={`actions-menu-${projectId}`} data-project-id={projectId}>
      <button
        ref={buttonRef}
        onClick={(e) => {
          e.stopPropagation();
          setIsOpen(!isOpen);
        }}
        className="p-2 rounded-lg hover:bg-white/20 transition-all"
        aria-label={`项目 ${projectName} 的更多操作`}
      >
        <MoreVertical className="w-5 h-5" />
      </button>

      {isOpen && createPortal(
        <div
          ref={menuRef}
          style={{ position: 'fixed', top: menuPosition.top, left: menuPosition.left, transform: 'translateX(-100%)' }}
          className="w-48 bg-white rounded-xl shadow-lg border border-gray-200 py-2 z-[9999]"
          onClick={(e) => e.stopPropagation()}
        >
          {onView && isCompleted && (
            <button
              onClick={handleAction(onView)}
              className="w-full px-4 py-2.5 text-left hover:bg-gray-50 transition-colors flex items-center gap-3 text-gray-700"
            >
              <Eye className="w-4 h-4" />
              <span>查看结果</span>
            </button>
          )}

          {onEdit && (
            <button
              onClick={handleAction(onEdit)}
              className="w-full px-4 py-2.5 text-left hover:bg-gray-50 transition-colors flex items-center gap-3 text-gray-700"
            >
              <Edit className="w-4 h-4" />
              <span>编辑项目</span>
            </button>
          )}

          {onDownload && isCompleted && (
            <button
              onClick={handleAction(onDownload)}
              className="w-full px-4 py-2.5 text-left hover:bg-gray-50 transition-colors flex items-center gap-3 text-gray-700"
            >
              <Download className="w-4 h-4" />
              <span>下载全部</span>
            </button>
          )}

          {onShare && isCompleted && (
            <button
              onClick={handleAction(onShare)}
              className="w-full px-4 py-2.5 text-left hover:bg-gray-50 transition-colors flex items-center gap-3 text-gray-700"
            >
              <Share2 className="w-4 h-4" />
              <span>分享链接</span>
            </button>
          )}

          {onToggleGalleryShare && isCompleted && (
            <button
              onClick={handleAction(() => onToggleGalleryShare(!isSharedToGallery))}
              className="w-full px-4 py-2.5 text-left hover:bg-gray-50 transition-colors flex items-center gap-3 text-gray-700"
            >
              {isSharedToGallery ? (
                <>
                  <EyeOff className="w-4 h-4" />
                  <span>取消分享到画廊</span>
                </>
              ) : (
                <>
                  <Globe className="w-4 h-4" />
                  <span>分享到画廊</span>
                </>
              )}
            </button>
          )}

          {onDelete && (
            <>
              <div className="my-1 border-t border-gray-200" />
              <button
                onClick={handleAction(onDelete)}
                className="w-full px-4 py-2.5 text-left hover:bg-red-50 transition-colors flex items-center gap-3 text-red-600"
              >
                <Trash2 className="w-4 h-4" />
                <span>删除项目</span>
              </button>
            </>
          )}
        </div>,
        document.body
      )}
    </div>
  );
}
