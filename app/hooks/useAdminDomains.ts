import { useState, useEffect } from 'react';
import type { LucideIcon } from 'lucide-react';
import { getDomainIcon } from '@/types/domain';

export interface AdminDomain {
  id: string;
  slug: string;
  name: string;
  description: string;
  icon: string;
  iconComponent?: LucideIcon;
  color: string;
  cover_image: string | null;
  is_active: boolean;
  sort_order: number;
  require_face_detection: boolean;
}

interface UseAdminDomainsResult {
  domains: AdminDomain[];
  loading: boolean;
  error: string | null;
}

/**
 * Fetch ALL domains from admin API (including inactive ones)
 * Only for use in admin components - requires admin authentication
 * Returns all domains regardless of is_active status
 */
export function useAdminDomains(): UseAdminDomainsResult {
  const [domains, setDomains] = useState<AdminDomain[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    async function fetchAdminDomains() {
      try {
        const response = await fetch('/api/admin/domains', {
          credentials: 'include',
        });

        if (!response.ok) {
          throw new Error('Failed to fetch admin domains');
        }

        const data = await response.json();

        // Add icon component to each domain
        const domainsWithIcons = data.data.map((domain: AdminDomain) => ({
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

    fetchAdminDomains();
  }, []);

  return { domains, loading, error };
}
