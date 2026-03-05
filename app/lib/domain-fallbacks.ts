/**
 * Domain Cover Image Fallback Strategy
 *
 * Provides slug-based fallback images when database cover_image is null/empty.
 * This ensures visual diversity when domains are not fully configured.
 *
 * Priority:
 * 1. Database cover_image (from domains table)
 * 2. Slug-based fallback (this file)
 * 3. Global default (DEFAULT_COVER)
 */

export const DOMAIN_FALLBACK_IMAGES: Record<string, string> = {
  wedding: 'https://images.unsplash.com/photo-1511285560929-80b456fea0bc?q=80&w=800&auto=format&fit=crop',
  children: 'https://images.unsplash.com/photo-1627885489708-ce79ebabc2c8?q=80&w=800&auto=format&fit=crop',
  id_photo: 'https://images.unsplash.com/photo-1623951551061-f09b2e04fbee?q=80&w=800&auto=format&fit=crop',
  artistic: 'https://images.unsplash.com/photo-1547826039-bfc35e0f1ea8?q=80&w=800&auto=format&fit=crop',
  portrait: 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?q=80&w=800&auto=format&fit=crop',
  anime: 'https://images.unsplash.com/photo-1618331835717-801e976710b2?q=80&w=800&auto=format&fit=crop',
  landscape: 'https://images.unsplash.com/photo-1469474968028-56623f02e42e?q=80&w=800&auto=format&fit=crop',
  product: 'https://images.unsplash.com/photo-1523275335684-37898b6baf30?q=80&w=800&auto=format&fit=crop',
  maternity: 'https://images.unsplash.com/photo-1493894473891-10fc1e5dbd22?q=80&w=800&auto=format&fit=crop',
  graduation: 'https://images.unsplash.com/photo-1523050854058-8df90110c9f1?q=80&w=800&auto=format&fit=crop',
  couple: 'https://images.unsplash.com/photo-1518568814500-bf0f8d125f46?q=80&w=800&auto=format&fit=crop',
};

export const DEFAULT_COVER =
  'https://images.unsplash.com/photo-1511285560929-80b456fea0bc?q=80&w=800&auto=format&fit=crop';

export const DEFAULT_TEMPLATE_COVER =
  'https://images.unsplash.com/photo-1506905925346-21bda4d32df4?q=80&w=800&auto=format&fit=crop';

/**
 * Get template preview image with fallback to domain cover or global default
 */
export function getTemplatePreviewImage(
  previewUrl: string | null | undefined,
  domain?: string
): string {
  if (previewUrl) return previewUrl;
  if (domain && domain in DOMAIN_FALLBACK_IMAGES) return DOMAIN_FALLBACK_IMAGES[domain];
  return DEFAULT_TEMPLATE_COVER;
}

/**
 * Get domain cover image with intelligent fallback
 *
 * @param coverImage - Cover image URL from database (can be null/empty)
 * @param slug - Domain slug for fallback lookup
 * @returns Final cover image URL
 */
export function getDomainCoverImage(
  coverImage: string | null | undefined,
  slug: string
): string {
  // Priority 1: Use database cover_image if available
  if (coverImage) {
    return coverImage;
  }

  // Priority 2: Use slug-based fallback
  if (slug in DOMAIN_FALLBACK_IMAGES) {
    return DOMAIN_FALLBACK_IMAGES[slug];
  }

  // Priority 3: Use global default
  return DEFAULT_COVER;
}
