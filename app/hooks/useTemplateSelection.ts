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
    if (value.trim() && selectedTemplate) {
      setSelectedTemplate(null);
      setSelectedPromptIndex(0);
    }
  };

  const getGenerateParams = (): GenerateParams | null => {
    if (selectedTemplate) {
      return {
        mode: 'template',
        templateId: selectedTemplate.id,
        promptIndex: selectedPromptIndex,
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
