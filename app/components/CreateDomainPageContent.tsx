'use client';

import { useState } from 'react';
import Image from 'next/image';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { ArrowLeft, ArrowRight, Sparkles } from 'lucide-react';
import { Template } from '@/types/database';
import { useAuth } from '@/contexts/AuthContext';
import { AuthModal } from './AuthModal';
import { CreatePage } from './CreatePage';
import { useTemplates } from '@/hooks/useTemplates';
import { CardSkeleton } from '@/components/ui/card-skeleton';
import { DOMAIN_CONFIG, type GenerationDomain } from '@/types/domain';

interface CreateDomainPageContentProps {
  domain: GenerationDomain;
}

export function CreateDomainPageContent({ domain }: CreateDomainPageContentProps) {
  const router = useRouter();
  const { user } = useAuth();
  const { templates, loading } = useTemplates({ domain });
  const [selectedTemplate, setSelectedTemplate] = useState<Template | null>(null);
  const [showAuthModal, setShowAuthModal] = useState(false);

  const domainInfo = DOMAIN_CONFIG[domain];
  const DomainIcon = domainInfo.icon;

  const handleTemplateSelect = (template: Template) => {
    if (!user) {
      setShowAuthModal(true);
      return;
    }
    setSelectedTemplate(template);
  };

  const handleBackToTemplates = () => {
    setSelectedTemplate(null);
  };

  const onNavigate = (page: string) => {
    switch (page) {
      case 'templates':
        handleBackToTemplates();
        break;
      case 'pricing':
        router.push('/pricing');
        break;
      case 'dashboard':
        router.push('/dashboard');
        break;
      default:
        router.push('/');
    }
  };

  // 已选择模板：显示创建流程
  if (selectedTemplate) {
    return (
      <CreatePage
        onNavigate={onNavigate}
        selectedTemplate={selectedTemplate}
      />
    );
  }

  // 模板选择视图
  return (
    <div className="min-h-screen bg-obsidian text-alabaster selection:bg-gold/30">
      {/* Cinematic Header Background */}
      <div className="absolute top-0 left-0 w-full h-[500px] bg-gradient-to-b from-stone/10 to-transparent pointer-events-none" />

      <div className="relative z-10 container mx-auto px-4 py-16 max-w-7xl">
        <Link
          href="/"
          className="inline-flex items-center gap-2 text-pearl/60 hover:text-gold mb-16 transition-colors font-light tracking-wider text-sm"
        >
          <ArrowLeft className="h-4 w-4" />
          返回主页
        </Link>

        <div className="mb-16 max-w-2xl">
          <div className="flex items-center gap-4 mb-6">
            <div className="p-4 rounded-full bg-white/5 border border-white/10 shadow-[0_0_20px_rgba(255,255,255,0.05)]">
              <DomainIcon className="w-8 h-8 text-gold" />
            </div>
            <h1 className="text-4xl md:text-5xl font-display font-light text-alabaster tracking-tight">
              {domainInfo.name}
            </h1>
          </div>
          <p className="text-lg text-pearl/70 font-light leading-relaxed">
            {domainInfo.description}
          </p>
        </div>

        <div className="mb-10 flex items-center justify-between border-b border-white/10 pb-6">
          <p className="text-pearl/80 font-light tracking-wide">
            探索 <span className="text-gold font-medium">{templates.length}</span> 种殿堂级高定风格
          </p>
        </div>

        {loading ? (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-x-8 gap-y-12">
            {Array.from({ length: 6 }).map((_, i) => (
              <CardSkeleton key={i} aspectClass="aspect-[3/4]" lines={2} showBadge />
            ))}
          </div>
        ) : templates.length === 0 ? (
          <div className="text-center py-32 bg-white/5 rounded-2xl border border-white/5 backdrop-blur-sm">
            <Sparkles className="w-12 h-12 text-gold/50 mx-auto mb-6" />
            <h3 className="text-xl font-display font-light text-alabaster mb-3">系列筹备中</h3>
            <p className="text-pearl/60 font-light mb-8 max-w-md mx-auto">
              视觉团队正在为您打磨全新的创作体验，包含该艺术风格的全新画册即将发布，敬请期待。
            </p>
            <Link
              href="/templates"
              className="inline-flex items-center gap-3 px-8 py-4 bg-alabaster text-obsidian rounded-sm hover:bg-gold transition-colors duration-500 text-sm tracking-[0.15em] uppercase font-medium shadow-[0_0_20px_rgba(255,255,255,0.1)] hover:shadow-[0_0_30px_rgba(200,160,100,0.3)]"
            >
              浏览其他系列
              <ArrowRight className="w-4 h-4" />
            </Link>
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-x-8 gap-y-12">
            {templates.map((template) => (
              <button
                key={template.id}
                type="button"
                onClick={() => handleTemplateSelect(template)}
                className="group relative flex flex-col items-start w-full text-left outline-none"
              >
                {/* Image Container */}
                <div className="relative w-full aspect-[3/4] overflow-hidden rounded-md bg-stone/5 mb-5 shadow-lg shadow-black/20 ring-1 ring-white/10 transition-all duration-700 group-hover:shadow-[0_0_40px_rgba(200,160,100,0.15)] group-hover:ring-gold/30">
                  <Image
                    src={template.preview_image_url}
                    alt={template.name}
                    fill
                    className="object-cover transition-all duration-1000 ease-out group-hover:scale-105 group-hover:brightness-110"
                    sizes="(max-width: 768px) 100vw, (max-width: 1200px) 50vw, 33vw"
                    onLoadingComplete={(img) => img.classList.remove('opacity-0')}
                  />

                  {/* Elegant fade overlay for hover */}
                  <div className="absolute inset-0 bg-gradient-to-t from-obsidian/90 via-obsidian/20 to-transparent opacity-0 transition-opacity duration-700 ease-out group-hover:opacity-100" />

                  {/* Price Tag */}
                  <div className="absolute top-4 left-4 px-3 py-1.5 bg-obsidian/60 backdrop-blur-md border border-white/10 rounded-full flex items-center gap-2 shadow-xl opacity-90 transition-opacity duration-500 group-hover:opacity-100">
                    <Sparkles className="w-3.5 h-3.5 text-gold" />
                    <span className="text-xs font-mono tracking-widest text-alabaster">{template.price_credits} PT</span>
                  </div>

                  {/* Cinematic Hover Action (replaces generic white button) */}
                  <div className="absolute bottom-6 left-6 right-6 translate-y-4 opacity-0 transition-all duration-500 ease-out group-hover:translate-y-0 group-hover:opacity-100">
                    <div className="w-full py-4 backdrop-blur-md bg-white/10 border border-white/20 text-alabaster rounded-sm text-sm tracking-[0.2em] font-medium flex items-center justify-center gap-3 shadow-[0_0_20px_rgba(0,0,0,0.3)] hover:bg-white/20 transition-colors">
                      开启创作 <ArrowRight className="w-4 h-4" />
                    </div>
                  </div>
                </div>

                {/* Typography underneath */}
                <div className="w-full px-2">
                  <h3 className="text-xl font-display text-alabaster mb-2 font-medium tracking-wide group-hover:text-gold transition-colors duration-500">
                    {template.name}
                  </h3>
                  {/* Avoid completely repeating title in description if they are similar */}
                  <p className="text-sm text-pearl/50 font-light leading-relaxed line-clamp-2">
                    {template.description === template.name ? '专属高定影像体验，雕刻光影细节。' : template.description}
                  </p>
                </div>
              </button>
            ))}
          </div>
        )}
      </div>

      {showAuthModal && (
        <AuthModal
          onClose={() => setShowAuthModal(false)}
        />
      )}
    </div>
  );
}
