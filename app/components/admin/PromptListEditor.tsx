"use client";

import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Plus, X } from 'lucide-react';

interface PromptListEditorProps {
  value?: string[];
  descriptions?: string[];
  onChange: (list: string[], descriptions: string[]) => void;
}

/**
 * 多提示词编辑器（键值对模式）
 * - 左列：提示词文本（必填）
 * - 右列：展示描述（必填）
 * - 允许增删，自动同步两个数组
 */
export function PromptListEditor({ value = [], descriptions = [], onChange }: PromptListEditorProps) {
  const [newPrompt, setNewPrompt] = useState('');
  const [newDescription, setNewDescription] = useState('');

  const addPrompt = () => {
    const promptText = newPrompt.trim();
    const descText = newDescription.trim();

    if (!promptText) {
      alert('提示词不能为空');
      return;
    }
    if (!descText) {
      alert('描述不能为空');
      return;
    }

    onChange([...(value || []), promptText], [...(descriptions || []), descText]);
    setNewPrompt('');
    setNewDescription('');
  };

  const removePrompt = (index: number) => {
    const nextPrompts = (value || []).filter((_, i) => i !== index);
    const nextDescriptions = (descriptions || []).filter((_, i) => i !== index);
    onChange(nextPrompts, nextDescriptions);
  };

  const updatePrompt = (index: number, newText: string) => {
    const nextPrompts = [...(value || [])];
    nextPrompts[index] = newText;
    onChange(nextPrompts, descriptions || []);
  };

  const updateDescription = (index: number, newText: string) => {
    const nextDescriptions = [...(descriptions || [])];
    nextDescriptions[index] = newText;
    onChange(value || [], nextDescriptions);
  };

  return (
    <div className="space-y-3 rounded-lg border p-4">
      <div className="space-y-2">
        <Label>多提示词与描述（可选）</Label>
        <p className="text-sm text-muted-foreground">
          每条提示词对应一个展示描述。生成时：1 条提示词生成 1 张图；多条则分别生成多张。
        </p>

        {/* 添加新提示词 */}
        <div className="grid grid-cols-[1fr_1fr_auto] gap-2">
          <Input
            value={newPrompt}
            onChange={(e) => setNewPrompt(e.target.value)}
            placeholder="提示词文本（必填）"
            onKeyDown={(e: React.KeyboardEvent<HTMLInputElement>) => {
              if (e.key === 'Enter') {
                e.preventDefault();
                addPrompt();
              }
            }}
          />
          <Input
            value={newDescription}
            onChange={(e) => setNewDescription(e.target.value)}
            placeholder="展示描述（必填，如：经典风格）"
            onKeyDown={(e: React.KeyboardEvent<HTMLInputElement>) => {
              if (e.key === 'Enter') {
                e.preventDefault();
                addPrompt();
              }
            }}
          />
          <Button type="button" onClick={addPrompt} size="icon" aria-label="添加提示词">
            <Plus className="h-4 w-4" />
          </Button>
        </div>
      </div>

      {/* 已有提示词列表 */}
      {value && value.length > 0 && (
        <div className="space-y-2 pt-2">
          <Label className="text-xs text-muted-foreground">已添加的提示词（{value.length} 条）</Label>
          {value.map((prompt, idx) => (
            <div key={idx} className="grid grid-cols-[1fr_1fr_auto] gap-2 items-start">
              <Input
                value={prompt}
                onChange={(e) => updatePrompt(idx, e.target.value)}
                placeholder="提示词文本"
                className="text-sm"
              />
              <Input
                value={descriptions?.[idx] || ''}
                onChange={(e) => updateDescription(idx, e.target.value)}
                placeholder="展示描述"
                className="text-sm"
              />
              <Button
                type="button"
                variant="ghost"
                size="icon"
                onClick={() => removePrompt(idx)}
                aria-label="删除提示词"
              >
                <X className="h-4 w-4" />
              </Button>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

