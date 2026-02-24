import Image from 'next/image';
import { Sparkles, CheckCircle } from 'lucide-react';
import { Template } from '@/types/database';
import { CardSkeleton } from '@/components/ui/card-skeleton';

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
  return (
    <div className="p-8 mb-8 rounded-sm border shadow-sm bg-stone/5 border-stone/10">
      <h2 className="mb-6 text-xl font-medium font-display text-obsidian uppercase tracking-widest">选择影像风格 <span className="text-xs text-stone font-light tracking-wide normal-case">（可选）</span></h2>

      {templatesLoading ? (
        <div className="grid grid-cols-2 gap-4 md:grid-cols-4 lg:grid-cols-6">
          {Array.from({ length: 6 }).map((_, i) => (
            <CardSkeleton key={i} aspectClass="aspect-[3/4]" lines={1} />
          ))}
        </div>
      ) : (
        <div className="grid grid-cols-2 gap-4 md:grid-cols-4 lg:grid-cols-6">
          {templates.slice(0, 12).map((template) => (
            <div
              key={template.id}
              onClick={() => onTemplateSelect(template)}
              className={`cursor-pointer rounded-sm overflow-hidden border transition-all duration-500 group ${selectedTemplate?.id === template.id
                  ? 'border-gold shadow-lg scale-105'
                  : 'border-stone/20 hover:border-gold/50 hover:shadow-md'
                }`}
            >
              <div className="relative aspect-[3/4]">
                <Image
                  src={template.preview_image_url}
                  alt={template.name}
                  fill
                  sizes="(max-width: 768px) 50vw, (max-width: 1024px) 25vw, 16vw"
                  className="object-cover transition-transform duration-700 group-hover:scale-105"
                />
                {selectedTemplate?.id === template.id && (
                  <div className="flex absolute inset-0 justify-center items-center bg-obsidian/40 backdrop-blur-[2px]">
                    <div className="flex justify-center items-center w-10 h-10 rounded-full bg-gold shadow-[0_0_15px_rgba(200,160,100,0.5)]">
                      <CheckCircle className="w-5 h-5 text-obsidian" />
                    </div>
                  </div>
                )}
              </div>
              <div className="p-3 bg-alabaster border-t border-stone/10">
                <p className="text-xs font-medium truncate text-obsidian tracking-widest uppercase text-center">{template.name}</p>
              </div>
            </div>
          ))}
        </div>
      )}

      {selectedTemplate && selectedTemplate.prompt_list && selectedTemplate.prompt_list.length > 0 && (
        <div className="pt-8 mt-8 border-t border-stone/10">
          <h3 className="flex gap-3 items-center mb-6 text-lg font-medium font-display text-obsidian uppercase tracking-widest">
            <Sparkles className="w-5 h-5 text-gold" />
            定制光影提示词
            <span className="text-xs font-light text-stone tracking-wide normal-case">（{selectedTemplate.prompt_list.length} 种预设）</span>
          </h3>
          <div className="space-y-4">
            {selectedTemplate.prompt_list.map((prompt, index) => (
              <div
                key={index}
                onClick={() => onPromptIndexChange(index)}
                className={`p-5 rounded-sm border cursor-pointer transition-all duration-500 group ${selectedPromptIndex === index
                    ? 'border-gold bg-stone/5 shadow-sm'
                    : 'border-stone/20 hover:border-gold/50 hover:bg-stone/5'
                  }`}
              >
                <div className="flex gap-4 items-start">
                  <div className={`flex-shrink-0 w-6 h-6 rounded-full flex items-center justify-center border transition-all duration-500 mt-0.5 ${selectedPromptIndex === index
                      ? 'border-gold bg-gold shadow-[0_0_10px_rgba(200,160,100,0.3)]'
                      : 'border-stone/30 group-hover:border-gold/50'
                    }`}>
                    {selectedPromptIndex === index && (
                      <CheckCircle className="w-4 h-4 text-obsidian" />
                    )}
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex gap-3 items-center mb-3">
                      <span className={`text-xs font-medium uppercase tracking-widest ${selectedPromptIndex === index ? 'text-gold' : 'text-obsidian group-hover:text-gold transition-colors duration-500'
                        }`}>
                        光影构筑方案 {index + 1}
                      </span>
                      {selectedPromptIndex === index && (
                        <span className="px-3 py-1 bg-stone/5 border border-gold/30 text-gold text-[10px] rounded-sm font-medium tracking-widest uppercase">
                          已选用
                        </span>
                      )}
                    </div>
                    <p className={`text-sm leading-relaxed font-light tracking-wide ${selectedPromptIndex === index ? 'text-obsidian' : 'text-stone group-hover:text-obsidian transition-colors duration-500'
                      }`}>
                      {prompt}
                    </p>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
