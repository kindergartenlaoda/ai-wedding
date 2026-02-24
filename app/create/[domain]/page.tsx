import { redirect } from 'next/navigation';
import { isValidDomain } from '@/types/domain';

interface CreateDomainPageProps {
  params: Promise<{ domain: string }>;
}

export default async function CreateDomainPage({ params }: CreateDomainPageProps) {
  const { domain } = await params;

  if (!isValidDomain(domain)) {
    redirect('/create');
  }

  redirect(`/create?domain=${domain}`);
}
