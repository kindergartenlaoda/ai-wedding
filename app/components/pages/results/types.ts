import { GenerationWithRelations } from '@/types/database';

export interface ResultsPageProps {
  onNavigate: (page: string) => void;
  generationId?: string;
}

export interface ImageRating {
  score: number;
  badges: string[];
}

export type ImageTab = 'preview' | 'high_res';

export interface ResultsPageData extends GenerationWithRelations {
  project: { name: string; uploaded_photos: string[] };
  template: { name: string };
}
