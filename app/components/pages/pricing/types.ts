import { LucideIcon } from 'lucide-react';

export type PricingTab = 'oneTime' | 'subscription';

export interface PricingPlan {
  name: string;
  price: number;
  credits: number;
  icon: LucideIcon;
  popular?: boolean;
  features: string[];
}

export interface SubscriptionPlan {
  id: string;
  name: string;
  price: number;
  credits: number;
  icon: LucideIcon;
  popular?: boolean;
  features: string[];
  billingCycle: string;
}

export interface PricingPageProps {
  onNavigate: (page: string) => void;
}

export interface ToastMessage {
  message: string;
  type: 'success' | 'error';
}
