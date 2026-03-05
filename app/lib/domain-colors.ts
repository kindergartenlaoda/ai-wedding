/**
 * Domain color mapping for analytics charts
 */

import type { GenerationDomain } from '@/types/domain';

// Define a type for the known domains
type KnownDomain = 'wedding' | 'children' | 'id_photo' | 'artistic' | 'portrait' | 'anime' | 'landscape' | 'product';

export const DOMAIN_COLORS: Record<KnownDomain, string> = {
  wedding: '#C8A064',    // 金色
  children: '#FF6B9D',   // 粉色
  id_photo: '#4A90E2',   // 蓝色
  artistic: '#9B59B6',   // 紫色
  portrait: '#E67E22',   // 橙色
  anime: '#FF5252',      // 红色
  landscape: '#27AE60',  // 绿色
  product: '#95A5A6',    // 灰色
};

/**
 * Get color for a specific domain
 */
export function getDomainColor(domain: GenerationDomain): string {
  return DOMAIN_COLORS[domain as KnownDomain] || '#C8A064';
}

/**
 * Get array of all domain colors
 */
export function getDomainColorArray(): string[] {
  return Object.values(DOMAIN_COLORS);
}

/**
 * Get domain color with opacity
 */
export function getDomainColorWithOpacity(domain: GenerationDomain, opacity: number): string {
  const color = getDomainColor(domain);
  const hex = color.replace('#', '');
  const r = parseInt(hex.substring(0, 2), 16);
  const g = parseInt(hex.substring(2, 4), 16);
  const b = parseInt(hex.substring(4, 6), 16);
  return `rgba(${r}, ${g}, ${b}, ${opacity})`;
}
