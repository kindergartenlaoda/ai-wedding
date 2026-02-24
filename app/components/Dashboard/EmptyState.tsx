import { Camera, Sparkles, Plus } from 'lucide-react';

interface EmptyStateProps {
  type: 'projects' | 'single';
  onAction: () => void;
}

export function EmptyState({ type, onAction }: EmptyStateProps) {
  const config = type === 'projects' ? {
    icon: Camera,
    title: '还没有项目',
    description: '开始用AI创作惊艳的作品',
    buttonText: '创建您的第一个项目',
  } : {
    icon: Sparkles,
    title: '还没有单张生成记录',
    description: '使用单张生成功能快速创作精美图片',
    buttonText: '开始单张生成',
  };

  const Icon = config.icon;

  return (
    <div className="py-20 text-center">
      <div className="flex justify-center items-center mx-auto mb-6 w-20 h-20 rounded-full bg-stone/5 border border-stone/10">
        <Icon className="w-10 h-10 text-stone" />
      </div>
      <h3 className="mb-2 text-xl font-medium font-display text-obsidian tracking-widest">{config.title}</h3>
      <p className="mb-8 text-stone font-light max-w-md mx-auto">{config.description}</p>
      <button
        onClick={onAction}
        className="inline-flex gap-2 items-center px-10 py-5 font-medium bg-obsidian text-alabaster shadow-sm transition-all duration-700 rounded-sm hover:bg-gold hover:text-obsidian hover:shadow-xl hover:-translate-y-1 uppercase tracking-[0.2em] text-xs"
      >
        <Plus className="w-5 h-5" />
        {config.buttonText}
      </button>
    </div>
  );
}
