import Link from 'next/link';
import { notFound } from 'next/navigation';
import { ArrowLeft } from 'lucide-react';
import { isValidDomain, DOMAIN_CONFIG } from '@/types/domain';

interface TemplateDomainPageProps {
  params: Promise<{ domain: string }>;
}

export default async function TemplateDomainPage({ params }: TemplateDomainPageProps) {
  const { domain } = await params;

  if (!isValidDomain(domain)) {
    notFound();
  }

  const domainInfo = DOMAIN_CONFIG[domain];

  return (
    <div className="min-h-screen bg-obsidian">
      <div className="container mx-auto px-4 py-12">
        <Link
          href="/"
          className="inline-flex items-center gap-2 text-pearl/60 hover:text-alabaster mb-8 transition-colors"
        >
          <ArrowLeft className="h-4 w-4" />
          返回首页
        </Link>
        <h1 className="text-3xl font-display font-medium text-alabaster mb-2">
          {domainInfo.name} 模板
        </h1>
        <p className="text-pearl/60 mb-8">浏览 {domainInfo.name} 风格模板</p>
        <p className="text-pearl/60">模板加载中...</p>
      </div>
    </div>
  );
}
