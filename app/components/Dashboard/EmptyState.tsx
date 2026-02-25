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
    <div className="py-20 text-center relative">
      <div className="flex justify-center items-center mx-auto mb-6 w-24 h-24 rounded-full bg-obsidian border border-white/10 shadow-[0_0_30px_rgba(200,160,100,0.05)] relative z-10">
        <Icon className="w-10 h-10 text-pearl/50" />
      </div>
      <h3 className="mb-3 text-2xl font-medium font-display text-alabaster tracking-widest relative z-10">{config.title}</h3>
      <p className="mb-10 text-pearl/60 font-light max-w-md mx-auto text-lg relative z-10">{config.description}</p>
      <button
        onClick={onAction}
        className="inline-flex gap-2 items-center px-10 py-5 font-medium bg-gold text-obsidian shadow-sm transition-all duration-700 rounded-sm hover:-translate-y-1 hover:shadow-[0_0_20px_rgba(200,160,100,0.4)] uppercase tracking-[0.2em] text-xs relative z-10"
      >
        <Plus className="w-5 h-5" />
        {config.buttonText}
      </button>
    </div>
  );
}
