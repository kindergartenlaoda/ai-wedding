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
    <div className="min-h-screen bg-gradient-to-b from-champagne to-ivory">
      <div className="container mx-auto px-4 py-12">
        <Link
          href="/"
          className="inline-flex items-center gap-2 text-stone hover:text-navy mb-8 transition-colors"
        >
          <ArrowLeft className="h-4 w-4" />
          返回首页
        </Link>

        <div className="mb-12">
          <div className="flex items-center gap-3 mb-2">
            <div className={`p-3 rounded-xl bg-gradient-to-br ${domainInfo.color}`}>
              <DomainIcon className="w-8 h-8 text-white" />
            </div>
            <h1 className="text-3xl font-display font-medium text-navy">
              {domainInfo.name}
            </h1>
          </div>
          <p className="text-stone">{domainInfo.description}</p>
        </div>

        <div className="mb-6">
          <p className="text-stone">
            选择模板 · 共 <span className="font-semibold text-navy">{templates.length}</span> 个
          </p>
        </div>

        {loading ? (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
            {Array.from({ length: 6 }).map((_, i) => (
              <CardSkeleton key={i} aspectClass="aspect-[3/4]" lines={2} showBadge />
            ))}
          </div>
        ) : templates.length === 0 ? (
          <div className="text-center py-20 bg-ivory/50 rounded-xl border border-stone/10">
            <Sparkles className="w-12 h-12 text-stone/50 mx-auto mb-4" />
            <h3 className="text-xl font-display font-medium text-navy mb-2">暂无模板</h3>
            <p className="text-stone mb-6">该领域暂无可用模板，敬请期待</p>
            <Link
              href="/templates"
              className="inline-flex items-center gap-2 px-6 py-3 bg-navy text-ivory rounded-md hover:bg-navy/90 transition-colors"
            >
              浏览全部模板
              <ArrowRight className="w-4 h-4" />
            </Link>
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
            {templates.map((template) => (
              <button
                key={template.id}
                type="button"
                onClick={() => handleTemplateSelect(template)}
                className="group bg-ivory rounded-xl overflow-hidden shadow-sm hover:shadow-xl transition-all duration-500 cursor-pointer border border-stone/10 text-left"
              >
                <div className="relative aspect-[3/4] overflow-hidden">
                  <Image
                    src={template.preview_image_url}
                    alt={template.name}
                    fill
                    className="object-cover group-hover:scale-105 transition-transform duration-700 ease-out"
                    sizes="(max-width: 768px) 100vw, (max-width: 1200px) 50vw, 25vw"
                  />
                  <div className="absolute inset-0 bg-gradient-to-t from-navy/80 via-navy/20 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-500" />
                  <div className="absolute bottom-4 left-4 right-4 opacity-0 group-hover:opacity-100 translate-y-2 group-hover:translate-y-0 transition-all duration-300">
                    <span className="flex items-center justify-center gap-2 w-full px-4 py-3 bg-ivory text-navy rounded-md font-medium">
                      使用此模板
                      <ArrowRight className="w-4 h-4" />
                    </span>
                  </div>
                  <div className="absolute top-4 left-4 px-3 py-1.5 bg-ivory/95 backdrop-blur-sm rounded-full flex items-center gap-1.5 shadow-sm">
                    <Sparkles className="w-3.5 h-3.5 text-rose-gold" />
                    <span className="text-sm font-medium text-navy">{template.price_credits} 积分</span>
                  </div>
                </div>
                <div className="p-5">
                  <h3 className="text-lg font-display font-medium text-navy mb-2 group-hover:text-dusty-rose transition-colors">
                    {template.name}
                  </h3>
                  <p className="text-sm text-stone line-clamp-2 leading-relaxed">
                    {template.description}
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
