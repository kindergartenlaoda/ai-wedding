import type { PromptConfig } from '@/types/database';

/**
 * Template form input for admin create/update
 */
export interface TemplateFormInput {
  name: string;
  description: string;
  category: string;
  domain: string;
  preview_image_url: string;
  prompt_config: PromptConfig;
  // 新增：多提示词（可选）
  prompt_list?: string[];
  // 新增：提示词描述（可选，长度必须与 prompt_list 一致）
  prompt_descriptions?: string[];
  price_credits: number;
  is_active: boolean;
  sort_order: number;
}

/**
 * Template create payload for API
 */
export interface CreateTemplatePayload {
  name: string;
  description: string;
  category: string;
  domain: string;
  preview_image_url: string;
  prompt_config: PromptConfig;
  prompt_list?: string[];
  prompt_descriptions?: string[];
  price_credits: number;
  is_active: boolean;
  sort_order: number;
}

/**
 * Template update payload for API
 */
export interface UpdateTemplatePayload extends Partial<CreateTemplatePayload> {
  id: string;
}
