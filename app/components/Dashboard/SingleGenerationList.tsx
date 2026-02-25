import { Loader2, ChevronDown } from 'lucide-react';
import { SingleGenerationCard } from '../SingleGenerationCard';
import { EmptyState } from './EmptyState';
import type { Generation } from '@/types/database';
import { generationToSingleGeneration } from '@/types/database';

interface SingleGenerationListProps {
  generations: Generation[];
  loading: boolean;
  hasMore?: boolean;
  onLoadMore?: () => void;
  onDelete: (id: string) => void;
  onView: (generation: Generation) => void;
  onNavigateToGenerateSingle: () => void;
}

export function SingleGenerationList({
  generations,
  loading,
  hasMore,
  onLoadMore,
  onDelete,
  onView,
  onNavigateToGenerateSingle,
}: SingleGenerationListProps) {
  if (loading && generations.length === 0) {
    return (
      <div className="flex justify-center items-center py-20 bg-transparent">
        <Loader2 className="w-12 h-12 animate-spin text-gold" />
      </div>
    );
  }

  if (generations.length === 0) {
    return <EmptyState type="single" onAction={onNavigateToGenerateSingle} />;
  }

  return (
    <div>
      <div className="grid grid-cols-1 gap-6 p-6 md:grid-cols-2 lg:grid-cols-3">
        {generations.map(generation => {
          const singleGen = generationToSingleGeneration(generation);
          if (!singleGen) return null;
          return (
            <SingleGenerationCard
              key={generation.id}
              generation={singleGen}
              onDelete={onDelete}
              onView={() => onView(generation)}
            />
          );
        })}
      </div>
      {hasMore && onLoadMore && (
        <div className="flex justify-center py-10">
          <button
            onClick={onLoadMore}
            disabled={loading}
            className="flex gap-2 items-center px-8 py-3 text-xs tracking-[0.2em] font-medium rounded-sm border transition-all duration-300 bg-transparent text-pearl hover:text-alabaster hover:bg-white/5 border-white/10 hover:border-gold/30 disabled:opacity-50 uppercase"
          >
            {loading ? (
              <Loader2 className="w-4 h-4 animate-spin text-gold" />
            ) : (
              <ChevronDown className="w-4 h-4" />
            )}
            加载更多
          </button>
        </div>
      )}
    </div>
  );
}

