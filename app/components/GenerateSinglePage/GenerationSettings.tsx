import { Sparkles } from 'lucide-react';
import { Template } from '@/types/database';
import { ImageGenerationSettings } from './types';

interface GenerationSettingsProps {
  customPrompt: string;
  selectedTemplate: Template | null;
  selectedPromptIndex: number;
  settings: ImageGenerationSettings;
  onCustomPromptChange: (value: string) => void;
  onSettingsChange: (settings: ImageGenerationSettings) => void;
}

export function GenerationSettings({
  customPrompt,
  selectedTemplate,
  selectedPromptIndex,
  settings,
  onCustomPromptChange,
  onSettingsChange,
}: GenerationSettingsProps) {
  return (
    <div className="p-8 mb-8 rounded-sm border shadow-inner bg-black/40 border-white/10">
      <h2 className="mb-6 text-xl font-medium font-display text-alabaster uppercase tracking-widest">高级构筑选项</h2>

      <div className="mb-8">
        <label className="block flex gap-3 items-center mb-3 text-xs font-medium text-alabaster uppercase tracking-widest">
          定制光影提示词
          {!selectedTemplate && (
            <span className="text-xs font-light text-pearl/60 tracking-wide normal-case">（未选择影像风格时可用）</span>
          )}
        </label>
        <textarea
          value={customPrompt}
          onChange={(e) => onCustomPromptChange(e.target.value)}
          placeholder="构建你的视觉画面: Generate a cinematic portrait in a dreamy sunset beach with soft pink sky..."
          className="w-full px-5 py-4 border border-white/10 rounded-sm focus:ring-1 focus:ring-gold focus:border-gold transition-all resize-vertical min-h-[140px] disabled:bg-white/5 disabled:cursor-not-allowed bg-white/5 text-alabaster font-light tracking-wide outline-none text-sm leading-relaxed"
          disabled={!!selectedTemplate}
        />
        {selectedTemplate ? (
          <div className="flex gap-3 items-center p-4 mt-4 rounded-sm border bg-white/5 border-gold/20 shadow-sm">
            <Sparkles className="w-5 h-5 text-gold flex-shrink-0" />
            <p className="text-xs text-alabaster tracking-wide font-light">
              当前选用影像风格: <span className="font-medium uppercase tracking-widest ml-2">{selectedTemplate.name}</span>
              {selectedTemplate.prompt_list && selectedTemplate.prompt_list.length > 0 && (
                <span className="ml-2">— 光影方案 {selectedPromptIndex + 1}</span>
              )}
            </p>
          </div>
        ) : (
          <p className="mt-3 text-xs font-light tracking-wide text-pearl/40">
            * 选择上方的预设选项，或在此构建您的数字影像
          </p>
        )}
      </div>

      <div className="grid grid-cols-1 gap-6 md:grid-cols-2">
        <div>
          <label className="block mb-3 text-xs font-medium text-alabaster uppercase tracking-widest">
            特征重塑强度
          </label>
          <select
            value={settings.facePreservation}
            onChange={(e) => onSettingsChange({
              ...settings,
              facePreservation: e.target.value as ImageGenerationSettings['facePreservation']
            })}
            className="px-5 py-4 w-full rounded-sm border transition-all border-white/10 focus:ring-1 focus:ring-gold focus:border-gold bg-black text-alabaster font-light outline-none cursor-pointer tracking-wider text-sm"
          >
            <option value="high">强保留（推荐）</option>
            <option value="medium">特征平滑</option>
            <option value="low">自然重塑</option>
          </select>
        </div>

        <div>
          <label className="block mb-3 text-xs font-medium text-alabaster uppercase tracking-widest">
            光影演化程度
          </label>
          <select
            value={settings.creativityLevel}
            onChange={(e) => onSettingsChange({
              ...settings,
              creativityLevel: e.target.value as ImageGenerationSettings['creativityLevel']
            })}
            className="px-5 py-4 w-full rounded-sm border transition-all border-white/10 focus:ring-1 focus:ring-gold focus:border-gold bg-black text-alabaster font-light outline-none cursor-pointer tracking-wider text-sm"
          >
            <option value="conservative">控制构筑（推荐）</option>
            <option value="balanced">均衡演化</option>
            <option value="creative">自由释放</option>
          </select>
        </div>
      </div>
    </div>
  );
}
