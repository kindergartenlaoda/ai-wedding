import type { PromptStrategy } from './types';
import { createPromptStrategy } from './prompt-builder';

/**
 * Get prompt strategy for a given domain
 * Uses the unified PromptBuilder instead of separate strategy files
 */
export function getPromptStrategy(domain: string): PromptStrategy {
  return createPromptStrategy(domain);
}

export type { PromptStrategy };
export { createPromptStrategy, PromptBuilder } from './prompt-builder';
