import { notFound } from 'next/navigation';
import { isValidDomain } from '@/types/domain';
import { CreateDomainPageContent } from '@/components/CreateDomainPageContent';
import type { GenerationDomain } from '@/types/domain';

interface CreateDomainPageProps {
  params: Promise<{ domain: string }>;
}

export default async function CreateDomainPage({ params }: CreateDomainPageProps) {
  const { domain } = await params;

  if (!isValidDomain(domain)) {
    notFound();
  }

  return <CreateDomainPageContent domain={domain as GenerationDomain} />;
}
