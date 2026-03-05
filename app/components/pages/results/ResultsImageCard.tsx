import React from 'react';
import Image from 'next/image';
import { Heart, Check } from 'lucide-react';
import { ImageRating, ImageTab } from './types';

interface ResultsImageCardProps {
  url: string;
  index: number;
  tab: ImageTab;
  isLiked: boolean;
  isSelected: boolean;
  rating?: ImageRating;
  onToggleLike: (e: React.MouseEvent) => void;
  onToggleSelection: (e: React.MouseEvent) => void;
  onClick: () => void;
}

export const ResultsImageCard = ({
  url,
  index,
  tab,
  isLiked,
  isSelected,
  rating,
  onToggleLike,
  onToggleSelection,
  onClick,
}: ResultsImageCardProps) => {
  return (
    <div
      className="relative aspect-[3/4] rounded-sm overflow-hidden group cursor-pointer border border-white/5 hover:border-gold/50 transition-all duration-700 shadow-lg"
      onClick={onClick}
    >
      <Image
        src={url}
        alt={`Result ${index + 1}`}
        fill
        className="object-cover group-hover:scale-105 transition-transform duration-700"
        sizes="(max-width: 768px) 100vw, (max-width: 1200px) 50vw, 25vw"
      />
      <div className="absolute inset-0 bg-gradient-to-t from-obsidian/90 via-obsidian/20 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-500" />

      <div className="absolute top-3 right-3 flex items-center gap-2">
        <button
          onClick={onToggleLike}
          aria-label={isLiked ? '取消收藏' : '收藏'}
          className={`w-10 h-10 rounded-full flex items-center justify-center transition-all duration-500 shadow-xl border ${
            isLiked
              ? 'bg-gold border-gold text-obsidian scale-110'
              : 'bg-obsidian/40 backdrop-blur-md text-pearl hover:text-alabaster border-white/20 hover:bg-obsidian/80 hover:scale-110'
          }`}
        >
          <Heart className={`w-5 h-5 ${isLiked ? 'fill-obsidian' : ''}`} />
        </button>
        {tab === 'preview' && (
          <button
            onClick={onToggleSelection}
            aria-label={isSelected ? '取消选择' : '选择此图'}
            className={`w-10 h-10 rounded-full flex items-center justify-center transition-all duration-500 shadow-xl border ${
              isSelected
                ? 'bg-gold border-gold text-obsidian scale-110'
                : 'bg-obsidian/40 backdrop-blur-md text-pearl hover:text-alabaster border-white/20 hover:bg-obsidian/80 hover:scale-110'
            }`}
          >
            {isSelected ? <Check className="w-6 h-6" /> : <div className="w-6 h-6 border-2 border-current rounded" />}
          </button>
        )}
      </div>

      {rating && rating.badges.length > 0 && (
        <div className="absolute bottom-3 left-3 flex flex-col gap-1 opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none">
          {rating.badges.map((badge, idx) => (
            <div
              key={idx}
              className="px-2 py-1 bg-gradient-to-r from-yellow-500/90 to-orange-500/90 backdrop-blur-sm text-white text-xs font-bold rounded-lg shadow-lg"
            >
              {badge}
            </div>
          ))}
        </div>
      )}

      {tab === 'preview' && (
        <>
          <div className="absolute inset-0 flex items-center justify-center pointer-events-none overflow-hidden">
            <div
              className="text-alabaster text-6xl font-bold opacity-10 whitespace-nowrap"
              style={{ transform: 'rotate(-45deg) scale(1.5)' }}
            >
              PREVIEW • 预览
            </div>
          </div>
          <div className="absolute top-0 left-0 px-4 py-2 bg-obsidian/80 backdrop-blur-md text-pearl/80 text-xs font-medium tracking-widest uppercase rounded-br-sm border-b border-r border-white/10">
            预览版
          </div>
        </>
      )}

      <div className="absolute bottom-3 left-3 right-3 opacity-0 group-hover:opacity-100 transition-opacity duration-300">
        {tab === 'preview' && (
          <button
            onClick={onToggleSelection}
            aria-label={isSelected ? '取消选择此图' : '选择此图'}
            className={`w-full px-4 py-3 rounded-sm transition-all duration-500 font-medium text-xs tracking-widest uppercase flex items-center justify-center gap-2 border ${
              isSelected ? 'bg-gold border-gold text-obsidian' : 'bg-obsidian/60 backdrop-blur-md text-pearl border-white/20'
            }`}
          >
            {isSelected ? <><Check className="w-5 h-5" /> 已选择</> : <><div className="w-5 h-5 border-2 border-current rounded" /> 选择此图</>}
          </button>
        )}
      </div>
    </div>
  );
};
