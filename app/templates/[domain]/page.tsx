import Link from 'next/link';
import Image from 'next/image';
import { notFound } from 'next/navigation';
import { ArrowLeft, Sparkles, Image as ImageIcon } from 'lucide-react';
import { prisma } from '@/lib/prisma';
import { getFallbackTemplates } from '@/lib/fallback-templates';
import { DOMAIN_CONFIG } from '@/types/domain';

interface TemplateDomainPageProps {
  params: Promise<{ domain: string }>;
}

export default async function TemplateDomainPage({ params }: TemplateDomainPageProps) {
  const { domain } = await params;
  const isLocalAdminMode = process.env.LOCAL_ADMIN_MODE === 'true';

  let domainInfo: { name: string; description?: string | null };
  let templates;

  if (isLocalAdminMode) {
    const localDomainInfo = Object.values(DOMAIN_CONFIG).find((item) => item.id === domain);
    if (!localDomainInfo) {
      notFound();
    }
    domainInfo = localDomainInfo;
    templates = getFallbackTemplates(domain);
  } else {
    const dbDomainInfo = await prisma.domains.findUnique({
      where: { slug: domain },
    });

    if (!dbDomainInfo || !dbDomainInfo.is_active) {
      notFound();
    }

    domainInfo = dbDomainInfo;
    templates = await prisma.templates.findMany({
      where: { domain, is_active: true },
      orderBy: { sort_order: 'asc' },
    });
  }

  return (
    <div className="min-h-screen bg-obsidian">
      <div className="container mx-auto px-4 py-12 max-w-7xl">
        <Link
          href="/templates"
          className="inline-flex items-center gap-2 text-pearl/60 hover:text-alabaster mb-8 transition-colors text-sm tracking-wider uppercase font-medium"
        >
          <ArrowLeft className="h-4 w-4" />
          返回模板库
        </Link>

        <div className="mb-12">
          <h1 className="text-3xl font-display font-medium text-alabaster mb-3 tracking-wider">
            {domainInfo.name} 模板
          </h1>
          <p className="text-pearl/60 font-light max-w-2xl">
            {domainInfo.description || `浏览 ${domainInfo.name} 风格的精选模板，选择心仪的风格开始创作`}
          </p>
        </div>

        {templates.length === 0 ? (
          <div className="py-20 text-center">
            <div className="flex justify-center items-center mx-auto mb-6 w-20 h-20 rounded-full bg-white/5 border border-white/10">
              <ImageIcon className="w-10 h-10 text-pearl/60" />
            </div>
            <h3 className="mb-2 text-xl font-medium font-display text-alabaster tracking-wider">
              暂无模板
            </h3>
            <p className="mb-6 text-pearl/60 font-light">
              该领域暂时没有可用模板，请查看其他领域
            </p>
            <Link
              href="/templates"
              className="inline-flex gap-2 items-center px-8 py-4 text-sm tracking-widest uppercase font-medium bg-gold rounded-sm transition-all duration-700 text-obsidian hover:shadow-glow"
            >
              浏览全部模板
            </Link>
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
            {templates.map((template) => (
              <div
                key={template.id}
                className="group bg-black/40 border border-white/10 rounded-sm overflow-hidden transition-all duration-500 hover:shadow-xl hover:-translate-y-1 hover:border-gold/30"
              >
                <div className="relative aspect-[3/4] overflow-hidden">
                  {template.preview_image_url ? (
                    <Image
                      src={template.preview_image_url}
                      alt={template.name}
                      fill
                      className="object-cover transition-transform duration-700 group-hover:scale-105"
                      sizes="(max-width: 640px) 100vw, (max-width: 1024px) 50vw, 25vw"
                    />
                  ) : (
                    <div className="w-full h-full bg-white/5 flex items-center justify-center">
                      <ImageIcon className="w-12 h-12 text-pearl/20" />
                    </div>
                  )}
                  <div className="absolute inset-0 bg-gradient-to-t from-obsidian/80 via-transparent to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-500" />
                </div>

                <div className="p-5">
                  <h3 className="font-medium font-display text-alabaster tracking-wide mb-1 line-clamp-1">
                    {template.name}
                  </h3>
                  {template.description && (
                    <p className="text-xs text-pearl/50 font-light mb-4 line-clamp-2">
                      {template.description}
                    </p>
                  )}
                  <div className="flex items-center justify-between">
                    <span className="text-xs text-pearl/40 tracking-wider">
                      {template.price_credits} 积分
                    </span>
                    <Link
                      href={`/create?domain=${domain}`}
                      className="inline-flex items-center gap-1.5 px-4 py-2 bg-gold text-obsidian rounded-sm text-xs font-medium tracking-wider uppercase hover:shadow-glow transition-all duration-500"
                    >
                      <Sparkles className="w-3 h-3" />
                      使用模板
                    </Link>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
