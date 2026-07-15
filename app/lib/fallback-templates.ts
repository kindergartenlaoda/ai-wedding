import type { Template } from '@/types/database';
import { templatesSeedData } from '../../prisma/seed-data/templates';

export type FallbackTemplate = Template & {
  prompt_list: string[];
};

const createdAt = '2026-01-01T00:00:00.000Z';

function toStringArray(value: unknown): string[] {
  return Array.isArray(value) ? value.filter((item): item is string => typeof item === 'string' && item.trim().length > 0) : [];
}

function fallbackId(index: number): string {
  return `fallback-template-${index + 1}`;
}

export const fallbackTemplates: FallbackTemplate[] = templatesSeedData
  .map((seed, index) => {
    const promptList = toStringArray(seed.prompt_list);
    const promptDescriptions = toStringArray(seed.prompt_descriptions);
    const config = seed.prompt_config && typeof seed.prompt_config === 'object'
      ? seed.prompt_config as Record<string, unknown>
      : {};
    const basePrompt = typeof config.basePrompt === 'string' && config.basePrompt.trim().length > 0
      ? config.basePrompt
      : '';
    const prompts = promptList.length > 0 ? promptList : basePrompt ? [basePrompt] : [];

    return {
      id: fallbackId(index),
      name: seed.name,
      description: seed.description,
      category: seed.category,
      domain: seed.domain,
      preview_image_url: seed.preview_image_url,
      prompt_count: prompts.length,
      prompt_descriptions: promptDescriptions,
      price_credits: 0,
      is_active: seed.is_active,
      sort_order: seed.sort_order,
      created_at: createdAt,
      prompt_list: prompts,
    };
  })
  .filter((template) => template.is_active && template.prompt_count > 0);

export function getFallbackTemplates(domain?: string): Template[] {
  return fallbackTemplates
    .filter((template) => !domain || template.domain === domain)
    .map(({ prompt_list: promptList, ...publicTemplate }) => {
      void promptList;
      return publicTemplate;
    });
}

export function resolveFallbackPrompt(templateId: string, promptIndex = 0): string | null {
  const template = fallbackTemplates.find((item) => item.id === templateId);
  if (!template) return null;
  return template.prompt_list[promptIndex] || template.prompt_list[0] || null;
}
