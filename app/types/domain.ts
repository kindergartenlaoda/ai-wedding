import {
  Camera,
  Baby,
  CreditCard,
  Palette,
  User,
  Wand2,
  Mountain,
  ShoppingBag,
} from 'lucide-react';
import type { LucideIcon } from 'lucide-react';

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

export type GenerationDomain = (typeof GENERATION_DOMAINS)[number];

export interface DomainInfo {
  id: GenerationDomain;
  name: string;
  description: string;
  icon: LucideIcon;
  color: string; // Tailwind color class for the card
}

export const DOMAIN_CONFIG: Record<GenerationDomain, DomainInfo> = {
  wedding: {
    id: 'wedding',
    name: '婚礼照片',
    description: '浪漫婚礼照片，多种场景风格',
    icon: Camera,
    color: 'from-pink-500 to-rose-500',
  },
  children: {
    id: 'children',
    name: '儿童照片',
    description: '可爱童趣，记录成长瞬间',
    icon: Baby,
    color: 'from-amber-400 to-orange-500',
  },
  id_photo: {
    id: 'id_photo',
    name: '证件照',
    description: '专业证件照，多种底色尺寸',
    icon: CreditCard,
    color: 'from-blue-500 to-indigo-500',
  },
  artistic: {
    id: 'artistic',
    name: '艺术照',
    description: '创意艺术风格，独特视觉体验',
    icon: Palette,
    color: 'from-purple-500 to-violet-500',
  },
  portrait: {
    id: 'portrait',
    name: '人像写真',
    description: '专业人像，展现个人魅力',
    icon: User,
    color: 'from-teal-500 to-cyan-500',
  },
  anime: {
    id: 'anime',
    name: '动漫',
    description: '二次元风格，动漫化你的照片',
    icon: Wand2,
    color: 'from-fuchsia-500 to-pink-500',
  },
  landscape: {
    id: 'landscape',
    name: '风景',
    description: '壮丽风景，自然之美',
    icon: Mountain,
    color: 'from-emerald-500 to-green-500',
  },
  product: {
    id: 'product',
    name: '商品图',
    description: '专业商品展示，提升销售力',
    icon: ShoppingBag,
    color: 'from-slate-500 to-gray-600',
  },
};

export function isValidDomain(domain: string): domain is GenerationDomain {
  return GENERATION_DOMAINS.includes(domain as GenerationDomain);
}
