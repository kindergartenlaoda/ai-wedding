import Link from 'next/link';
import { notFound } from 'next/navigation';
import { ArrowLeft } from 'lucide-react';
import { isValidDomain, DOMAIN_CONFIG } from '@/types/domain';

interface CreateDomainPageProps {
  params: Promise<{ domain: string }>;
}

export default async function CreateDomainPage({ params }: CreateDomainPageProps) {
  const { domain } = await params;

  if (!isValidDomain(domain)) {
    notFound();
  }

  const domainInfo = DOMAIN_CONFIG[domain];

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
        <h1 className="text-3xl font-display font-medium text-navy mb-2">
          {domainInfo.name}
        </h1>
        <p className="text-stone mb-8">{domainInfo.description}</p>
        <p className="text-stone">创建流程即将上线...</p>
      </div>
    </div>
  );
}
