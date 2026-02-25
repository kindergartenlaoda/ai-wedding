import {
  Camera,
  Baby,
  CreditCard,
  Palette,
  User,
  Wand2,
  Mountain,
  ShoppingBag,
  Globe,
  Star,
  Heart,
  Zap,
  Image as ImageIcon,
  Music,
  Film,
  Book,
} from 'lucide-react';
import type { LucideIcon } from 'lucide-react';

/** Icon name string (from DB) → LucideIcon component. Used by HomePage and admin. */
export const DOMAIN_ICON_MAP: Record<string, LucideIcon> = {
  Camera,
  Baby,
  CreditCard,
  Palette,
  User,
  Wand2,
  Mountain,
  ShoppingBag,
  Globe,
  Star,
  Heart,
  Zap,
  Image: ImageIcon,
  Music,
  Film,
  Book,
};

export function getDomainIcon(iconName: string): LucideIcon {
  return DOMAIN_ICON_MAP[iconName] ?? Camera;
}

/**
 * GenerationDomain is now a string type alias to support dynamic domains from database.
 * Previously it was a fixed union type, but now domains are managed dynamically.
 */
export type GenerationDomain = string;

/**
 * Legacy domain list - kept for backward compatibility.
 * New code should fetch domains from API instead.
 * @deprecated Use useDomains() hook or /api/domains endpoint
 */
export const GENERATION_DOMAINS = [
  'wedding',
  'children',
  'id_photo',
  'artistic',
  'portrait',
  'anime',
  'landscape',
  'product',
] as const;

export interface DomainInfo {
  id: GenerationDomain;
  name: string;
  description: string;
  icon: LucideIcon;
  color: string; // Tailwind color class for the card
}

/**
 * Legacy domain config - kept for backward compatibility.
 * New code should fetch domains from API instead.
 * @deprecated Use useDomains() hook or /api/domains endpoint
 */
export const DOMAIN_CONFIG: Record<string, DomainInfo> = {
  wedding: {
    id: 'wedding',
    name: 'AI 婚纱照',
    description: '唯美婚纱、旅拍、中式喜庆，多风格一键生成',
    icon: Camera,
    color: 'from-pink-500 to-rose-500',
  },
  children: {
    id: 'children',
    name: 'AI 儿童照',
    description: '百天、周岁、亲子合照，可爱风格随心选',
    icon: Baby,
    color: 'from-amber-400 to-orange-500',
  },
  id_photo: {
    id: 'id_photo',
    name: 'AI 证件照',
    description: '一键换底色，签证/简历/社保等规格齐全',
    icon: CreditCard,
    color: 'from-blue-500 to-indigo-500',
  },
  artistic: {
    id: 'artistic',
    name: 'AI 艺术照',
    description: '油画、国风、赛博朋克，探索无限艺术风格',
    icon: Palette,
    color: 'from-purple-500 to-violet-500',
  },
  portrait: {
    id: 'portrait',
    name: 'AI 个人写真',
    description: '形象照、社交头像、职场照，展现最佳状态',
    icon: User,
    color: 'from-teal-500 to-cyan-500',
  },
  anime: {
    id: 'anime',
    name: 'AI 动漫头像',
    description: '日漫、国漫、Q版风格，秒变二次元',
    icon: Wand2,
    color: 'from-fuchsia-500 to-pink-500',
  },
  landscape: {
    id: 'landscape',
    name: 'AI 风景壁纸',
    description: '梦幻风景、插画地标，随手生成桌面壁纸',
    icon: Mountain,
    color: 'from-emerald-500 to-green-500',
  },
  product: {
    id: 'product',
    name: 'AI 商品图',
    description: '电商主图、白底图、场景图，0成本拍大片',
    icon: ShoppingBag,
    color: 'from-slate-500 to-gray-600',
  },
};

/**
 * Check if a domain slug is valid.
 * Domains are now dynamic (from DB), so any non-empty string is valid.
 */
export function isValidDomain(domain: string): domain is GenerationDomain {
  return domain.length > 0;
}
