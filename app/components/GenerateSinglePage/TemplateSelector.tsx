import Image from 'next/image';
import { Sparkles, CheckCircle, ImageOff } from 'lucide-react';
import { Template } from '@/types/database';
import { CardSkeleton } from '@/components/ui/card-skeleton';
import { useState } from 'react';

interface TemplateSelectorProps {
  templates: Template[];
  templatesLoading: boolean;
  selectedTemplate: Template | null;
  selectedPromptIndex: number;
  onTemplateSelect: (template: Template) => void;
  onPromptIndexChange: (index: number) => void;
}

export function TemplateSelector({
  templates,
  templatesLoading,
  selectedTemplate,
  selectedPromptIndex,
  onTemplateSelect,
  onPromptIndexChange,
}: TemplateSelectorProps) {
  const [imageErrors, setImageErrors] = useState<Set<string>>(new Set());

  const handleImageError = (templateId: string) => {
    setImageErrors(prev => new Set(prev).add(templateId));
  };

  return (
    <div className="p-8 mb-8 rounded-sm border shadow-inner bg-black/40 border-white/10">
      <h2 className="mb-6 text-xl font-medium font-display text-alabaster uppercase tracking-widest">选择影像风格 <span className="text-xs text-pearl/60 font-light tracking-wide normal-case">（可选）</span></h2>

      {templatesLoading ? (
        <div className="grid grid-cols-2 gap-4 md:grid-cols-4 lg:grid-cols-6">
          {Array.from({ length: 6 }).map((_, i) => (
            <CardSkeleton key={i} aspectClass="aspect-[3/4]" lines={1} />
          ))}
        </div>
      ) : templates.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-16 text-center">
          <ImageOff className="w-16 h-16 mb-4 text-pearl/40" />
          <p className="text-lg text-alabaster mb-2">暂无可用模板</p>
          <p className="text-sm text-pearl/60">请稍后再试或联系管理员</p>
        </div>
      ) : (
        <div className="grid grid-cols-2 gap-4 md:grid-cols-4 lg:grid-cols-6">
          {templates.slice(0, 12).map((template) => (
            <button
              key={template.id}
              type="button"
              onClick={() => onTemplateSelect(template)}
              onKeyDown={(e) => {
                if (e.key === 'Enter' || e.key === ' ') {
                  e.preventDefault();
                  onTemplateSelect(template);
                }
              }}
              aria-label={`选择模板：${template.name}`}
              aria-pressed={selectedTemplate?.id === template.id}
              className={`cursor-pointer rounded-sm overflow-hidden border transition-all duration-500 group ${selectedTemplate?.id === template.id
                ? 'border-gold shadow-lg scale-105'
                : 'border-white/10 hover:border-gold/50 hover:shadow-md'
                }`}
            >
              <div className="relative aspect-[3/4]">
                {imageErrors.has(template.id) ? (
                  <div className="flex items-center justify-center w-full h-full bg-black/60">
                    <ImageOff className="w-8 h-8 text-pearl/40" />
                  </div>
                ) : (
                  <Image
                    src={template.preview_image_url}
                    alt={template.name}
                    fill
                    sizes="(max-width: 768px) 50vw, (max-width: 1024px) 25vw, 16vw"
                    className="object-cover transition-transform duration-700 group-hover:scale-105"
                    onError={() => handleImageError(template.id)}
                  />
                )}
                {selectedTemplate?.id === template.id && (
                  <div className="flex absolute inset-0 justify-center items-center bg-obsidian/40 backdrop-blur-[2px]">
                    <div className="flex justify-center items-center w-10 h-10 rounded-full bg-gold shadow-[0_0_15px_rgba(200,160,100,0.5)]">
                      <CheckCircle className="w-5 h-5 text-obsidian" />
                    </div>
                  </div>
                )}
              </div>
              <div className="p-3 bg-black/60 border-t border-white/10">
                <p className="text-xs font-medium truncate text-alabaster tracking-widest uppercase text-center">{template.name}</p>
              </div>
            </button>
          ))}
        </div>
      )}

      {selectedTemplate && selectedTemplate.prompt_count > 1 && (
        <div className="pt-8 mt-8 border-t border-white/10">
          <h3 className="flex gap-3 items-center mb-6 text-lg font-medium font-display text-alabaster uppercase tracking-widest">
            <Sparkles className="w-5 h-5 text-gold" />
            选择光影方案
            <span className="text-xs font-light text-pearl/60 tracking-wide normal-case">（{selectedTemplate.prompt_count} 种预设）</span>
          </h3>
          <div className="space-y-4">
            {Array.from({ length: selectedTemplate.prompt_count }).map((_, index) => (
              <button
                key={index}
                type="button"
                onClick={() => onPromptIndexChange(index)}
                onKeyDown={(e) => {
                  if (e.key === 'Enter' || e.key === ' ') {
                    e.preventDefault();
                    onPromptIndexChange(index);
                  }
                }}
                aria-label={`选择方案：${selectedTemplate.prompt_descriptions?.[index] || `风格方案 ${index + 1}`}`}
                aria-pressed={selectedPromptIndex === index}
                className={`w-full p-5 rounded-sm border cursor-pointer transition-all duration-500 group ${selectedPromptIndex === index
                  ? 'border-gold bg-white/5 shadow-sm'
                  : 'border-white/10 hover:border-gold/50 hover:bg-white/5'
                  }`}
              >
                <div className="flex gap-4 items-start">
                  <div className={`flex-shrink-0 w-6 h-6 rounded-full flex items-center justify-center border transition-all duration-500 mt-0.5 ${selectedPromptIndex === index
                    ? 'border-gold bg-gold shadow-[0_0_10px_rgba(200,160,100,0.3)]'
                    : 'border-white/20 group-hover:border-gold/50'
                    }`}>
                    {selectedPromptIndex === index && (
                      <CheckCircle className="w-4 h-4 text-obsidian" />
                    )}
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex gap-3 items-center mb-3">
                      <span className={`text-xs font-medium uppercase tracking-widest ${selectedPromptIndex === index ? 'text-gold' : 'text-alabaster group-hover:text-gold transition-colors duration-500'
                        }`}>
                        光影构筑方案 {index + 1}
                      </span>
                      {selectedPromptIndex === index && (
                        <span className="px-3 py-1 bg-white/5 border border-gold/30 text-gold text-[10px] rounded-sm font-medium tracking-widest uppercase">
                          已选用
                        </span>
                      )}
                    </div>
                    <p className={`text-sm leading-relaxed font-light tracking-wide ${selectedPromptIndex === index ? 'text-alabaster' : 'text-pearl/60 group-hover:text-alabaster transition-colors duration-500'
                      }`}>
                      {selectedTemplate.prompt_descriptions?.[index] || `风格方案 ${index + 1}`}
                    </p>
                  </div>
                </div>
              </button>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
