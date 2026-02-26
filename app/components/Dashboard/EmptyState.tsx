import { Camera, Sparkles, Plus, ArrowRight, Upload, Palette } from 'lucide-react';

interface EmptyStateProps {
  type: 'projects' | 'single';
  onAction: () => void;
}

export function EmptyState({ type, onAction }: EmptyStateProps) {
  const config = type === 'projects' ? {
    icon: Camera,
    title: '还没有项目',
    description: '三步即可创建你的第一个 AI 写真项目',
    buttonText: '开始创建',
    steps: [
      { icon: Palette, label: '选择风格模板' },
      { icon: Upload, label: '上传你的照片' },
      { icon: Sparkles, label: 'AI 生成写真' },
    ],
  } : {
    icon: Sparkles,
    title: '还没有生成记录',
    description: '上传一张照片，即刻体验 AI 写真',
    buttonText: '快速生成',
    steps: [
      { icon: Upload, label: '上传一张照片' },
      { icon: Sparkles, label: '选择风格参数' },
      { icon: Camera, label: '获取 AI 作品' },
    ],
  };

  const Icon = config.icon;

  return (
    <div className="py-16 text-center relative">
      {/* Decorative background glow */}
      <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[400px] h-[400px] bg-gold/[0.03] rounded-full blur-[80px] pointer-events-none" />

      <div className="flex justify-center items-center mx-auto mb-8 w-20 h-20 rounded-full bg-gold/5 border border-gold/20 relative z-10">
        <Icon className="w-8 h-8 text-gold" />
      </div>

      <h3 className="mb-3 text-2xl font-medium font-display text-alabaster tracking-wider relative z-10">
        {config.title}
      </h3>
      <p className="mb-10 text-pearl/60 font-light max-w-md mx-auto relative z-10">
        {config.description}
      </p>

      {/* Step guide cards */}
      <div className="flex items-center justify-center gap-3 mb-12 relative z-10 flex-wrap">
        {config.steps.map((step, idx) => (
          <div key={idx} className="flex items-center gap-3">
            <div className="flex items-center gap-2.5 px-4 py-3 bg-white/5 border border-white/10 rounded-sm">
              <step.icon className="w-4 h-4 text-gold" />
              <span className="text-xs text-pearl/70 font-light tracking-wider">{step.label}</span>
            </div>
            {idx < config.steps.length - 1 && (
              <ArrowRight className="w-4 h-4 text-pearl/30 flex-shrink-0" />
            )}
          </div>
        ))}
      </div>

      <button
        onClick={onAction}
        className="inline-flex gap-2 items-center px-10 py-4 font-medium bg-gold text-obsidian shadow-sm transition-all duration-700 rounded-sm hover:-translate-y-1 hover:shadow-[0_0_20px_rgba(200,160,100,0.4)] uppercase tracking-[0.2em] text-xs relative z-10"
      >
        <Plus className="w-4 h-4" />
        {config.buttonText}
      </button>
    </div>
  );
}
