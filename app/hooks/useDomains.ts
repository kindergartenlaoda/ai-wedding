import { useState, useEffect } from 'react';
import type { LucideIcon } from 'lucide-react';
import { getDomainIcon } from '@/types/domain';

export interface Domain {
  id: string;
  slug: string;
  name: string;
  description: string;
  icon: string;
  iconComponent?: LucideIcon;
  color: string;
  cover_image: string | null;
  sort_order: number;
}

interface UseDomainsResult {
  domains: Domain[];
  loading: boolean;
  error: string | null;
}

/**
 * Fetch active domains from API
 */
export function useDomains(): UseDomainsResult {
  const [domains, setDomains] = useState<Domain[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    async function fetchDomains() {
      try {
        const response = await fetch('/api/domains');
        if (!response.ok) {
          throw new Error('Failed to fetch domains');
        }
        const data = await response.json();

        // Add icon component to each domain
        const domainsWithIcons = data.data.map((domain: Domain) => ({
          ...domain,
          iconComponent: getDomainIcon(domain.icon),
        }));

        setDomains(domainsWithIcons);
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Unknown error');
      } finally {
        setLoading(false);
      }
    }

    fetchDomains();
  }, []);

  return { domains, loading, error };
}
