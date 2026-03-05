import { useState } from 'react';
import Image from 'next/image';
import { Heart, Sparkles, ArrowRight, Search } from 'lucide-react';
import { categoryInfo } from '@/data/mockData';
import { Template } from '@/types/database';
import { useAuth } from '@/contexts/AuthContext';
import { AuthModal } from '@/components/features/auth/AuthModal';
import { useTemplates } from '@/hooks/useTemplates';
import { CardSkeleton } from '@/components/ui/card-skeleton';
import { useFavorites } from '@/hooks/useFavorites';
import { getTemplatePreviewImage } from '@/lib/domain-fallbacks';

interface TemplatesPageProps {
  onNavigate: (page: string, template?: Template) => void;
}

export function TemplatesPage({ onNavigate }: TemplatesPageProps) {
  const { user } = useAuth();
  const { templates, loading } = useTemplates();
  const { favorites, toggleFavorite } = useFavorites();
  const [selectedCategory, setSelectedCategory] = useState<string>('all');
  const [searchQuery, setSearchQuery] = useState('');
  const [showAuthModal, setShowAuthModal] = useState(false);

  const filteredTemplates = templates.filter(template => {
    const matchesCategory = selectedCategory === 'all' || template.category === selectedCategory;
    const matchesSearch = template.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      template.description.toLowerCase().includes(searchQuery.toLowerCase());
    return matchesCategory && matchesSearch;
  });

  const handleTemplateSelect = (template: Template) => {
    if (!user) {
      setShowAuthModal(true);
      return;
    }
    onNavigate('create', template);
  };

  const categories = [
    { id: 'all', name: '所有模板', icon: Sparkles },
    ...Object.entries(categoryInfo).map(([id, info]) => ({
      id,
      name: info.name,
      icon: info.icon
    }))
  ];

  return (
    <div className="min-h-screen bg-obsidian py-12">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="text-center mb-12">
          <h1 className="text-4xl md:text-5xl font-display font-medium text-alabaster uppercase tracking-widest mb-4">
            探索
            <span className="italic text-gold font-serif"> 视觉风格</span>
          </h1>
          <p className="text-sm font-light tracking-widest uppercase text-pearl/60">浏览并选择适合您的电影级影像模板</p>
        </div>

        <div className="mb-8">
          <div className="relative max-w-xl mx-auto mb-10">
            <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-pearl/60" />
            <input
              type="text"
              placeholder="搜索光影方案..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pl-12 pr-4 py-4 border border-white/10 bg-black/40 rounded-sm focus:ring-1 focus:ring-gold focus:border-gold transition-all shadow-inner outline-none text-sm font-light text-alabaster tracking-wide placeholder:text-pearl/40"
            />
          </div>

          <div className="flex flex-wrap items-center justify-center gap-3">
            {categories.map(category => (
              <button
                key={category.id}
                onClick={() => setSelectedCategory(category.id)}
                className={`px-5 py-2.5 rounded-sm text-xs font-medium transition-all duration-500 flex items-center gap-2 uppercase tracking-widest border border-transparent ${selectedCategory === category.id
                  ? 'bg-gold text-obsidian shadow-[0_0_15px_rgba(200,160,100,0.4)]'
                  : 'bg-transparent text-alabaster hover:bg-white/5 border-white/10'
                  }`}
              >
                {typeof category.icon === 'string' ? (
                  <span className="text-base">{category.icon}</span>
                ) : (
                  <category.icon className="w-4 h-4" />
                )}
                {category.name}
              </button>
            ))}
          </div>
        </div>

        <div className="mb-6 flex items-center justify-between border-b border-white/10 pb-4">
          <p className="text-xs font-light text-pearl/60 tracking-wide">
            呈现 <span className="font-medium text-alabaster">{filteredTemplates.length}</span> 套影像方案
          </p>
        </div>

        {loading ? (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
            {Array.from({ length: 8 }).map((_, i) => (
              <CardSkeleton key={i} aspectClass="aspect-[3/4]" lines={2} showBadge />
            ))}
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-8">
            {filteredTemplates.map(template => (
              <div
                key={template.id}
                className="group bg-black/40 rounded-sm overflow-hidden shadow-sm hover:shadow-2xl transition-all duration-700 cursor-pointer border border-white/10 hover:border-gold/30"
              >
                <div className="relative aspect-[3/4] overflow-hidden">
                  <Image
                    src={getTemplatePreviewImage(template.preview_image_url, template.domain)}
                    alt={template.name}
                    fill
                    className="object-cover group-hover:scale-105 transition-transform duration-700 ease-out"
                    sizes="(max-width: 768px) 100vw, (max-width: 1200px) 50vw, 25vw"
                  />
                  <div className="absolute inset-0 bg-gradient-to-t from-obsidian/90 via-obsidian/20 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-700" />

                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      toggleFavorite(template.id);
                    }}
                    className="absolute top-4 right-4 w-10 h-10 bg-black/60 border border-white/10 backdrop-blur-sm rounded-full hover:bg-black/80 flex items-center justify-center transition-all duration-500 hover:scale-110 shadow-lg"
                    aria-label={favorites.has(template.id) ? '取消典藏' : '典藏模板'}
                  >
                    <Heart
                      className={`w-4 h-4 transition-colors ${favorites.has(template.id)
                        ? 'fill-gold text-gold'
                        : 'text-alabaster group-hover:text-gold'
                        }`}
                    />
                  </button>

                  <div className="absolute bottom-6 left-6 right-6 opacity-0 group-hover:opacity-100 translate-y-4 group-hover:translate-y-0 transition-all duration-700 delay-100">
                    <button
                      onClick={() => handleTemplateSelect(template)}
                      className="w-full px-4 py-4 bg-gold text-obsidian rounded-sm hover:shadow-[0_0_15px_rgba(200,160,100,0.4)] transition-all duration-500 shadow-xl font-medium tracking-widest text-xs uppercase flex items-center justify-center gap-3"
                    >
                      应用此方案
                      <ArrowRight className="w-4 h-4" />
                    </button>
                  </div>

                  <div className="absolute top-4 left-4 px-3 py-1.5 bg-black/60 border border-white/10 backdrop-blur-sm rounded-sm flex items-center gap-2 shadow-sm">
                    <Sparkles className="w-3 h-3 text-gold" />
                    <span className="text-xs font-medium text-alabaster tracking-widest">{template.price_credits}</span>
                  </div>
                </div>

                <div className="p-6">
                  <h3 className="text-lg font-display font-medium text-alabaster mb-3 group-hover:text-gold transition-colors duration-500 tracking-wider">
                    {template.name}
                  </h3>
                  <p className="text-xs font-light tracking-wide text-pearl/60 line-clamp-2 leading-relaxed">
                    {template.description}
                  </p>
                  <div className="mt-5 pt-4 border-t border-white/10 flex items-center justify-between">
                    <span className="text-[10px] font-medium text-pearl/40 uppercase tracking-[0.2em]">
                      {categoryInfo[template.category]?.name ?? template.category ?? '其他'}
                    </span>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}

        {!loading && filteredTemplates.length === 0 && (
          <div className="text-center py-24 border border-dashed border-white/10 rounded-sm bg-black/40">
            <div className="w-16 h-16 bg-white/10 border border-white/10 rounded-full flex items-center justify-center mx-auto mb-6 shadow-sm">
              <Search className="w-6 h-6 text-pearl/60" />
            </div>
            <h3 className="text-xl font-display font-medium text-alabaster mb-3 uppercase tracking-widest">未找到匹配影像</h3>
            <p className="text-sm font-light text-pearl/60 tracking-wide">请尝试更换检索关键词或分类</p>
          </div>
        )}
      </div>

      {showAuthModal && <AuthModal onClose={() => setShowAuthModal(false)} />}
    </div>
  );
}
