import { useState } from 'react';
import { Template, GenerateParams } from '@/types/database';

export function useTemplateSelection() {
  const [selectedTemplate, setSelectedTemplate] = useState<Template | null>(null);
  const [selectedPromptIndex, setSelectedPromptIndex] = useState<number>(0);
  const [customPrompt, setCustomPrompt] = useState('');

  const handleTemplateSelect = (template: Template): void => {
    setSelectedTemplate(template);
    setSelectedPromptIndex(0);
    setCustomPrompt('');
  };

  const handleCustomPromptChange = (value: string): void => {
    setCustomPrompt(value);
  };

  const getGenerateParams = (): GenerateParams | null => {
    if (selectedTemplate) {
      return {
        mode: 'template',
        templateId: selectedTemplate.id,
        promptIndex: selectedPromptIndex,
        additionalPrompt: customPrompt.trim() || undefined,
      };
    }
    if (customPrompt.trim()) {
      return {
        mode: 'custom',
        customPrompt: customPrompt.trim(),
      };
    }
    return null;
  };

  const hasValidParams = (): boolean => {
    return getGenerateParams() !== null;
  };

  return {
    selectedTemplate,
    selectedPromptIndex,
    customPrompt,
    handleTemplateSelect,
    setSelectedPromptIndex,
    handleCustomPromptChange,
    getGenerateParams,
    hasValidParams,
  };
}
