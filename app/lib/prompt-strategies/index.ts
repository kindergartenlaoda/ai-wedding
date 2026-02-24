import type { PromptStrategy } from './types';
import type { GenerationDomain } from '@/types/domain';
import { weddingStrategy } from './wedding';
import { childrenStrategy } from './children';
import { idPhotoStrategy } from './id_photo';
import { artisticStrategy } from './artistic';
import { portraitStrategy } from './portrait';
import { animeStrategy } from './anime';
import { landscapeStrategy } from './landscape';
import { productStrategy } from './product';

const strategies: Record<GenerationDomain, PromptStrategy> = {
  wedding: weddingStrategy,
  children: childrenStrategy,
  id_photo: idPhotoStrategy,
  artistic: artisticStrategy,
  portrait: portraitStrategy,
  anime: animeStrategy,
  landscape: landscapeStrategy,
  product: productStrategy,
};

export function getPromptStrategy(domain: GenerationDomain): PromptStrategy {
  return strategies[domain] || strategies.wedding;
}

export type { PromptStrategy };
