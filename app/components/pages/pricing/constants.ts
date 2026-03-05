import { Sparkles, Zap, Crown, CalendarDays, Repeat } from 'lucide-react';
import { PricingPlan, SubscriptionPlan } from './types';

export const ONE_TIME_PLANS: PricingPlan[] = [
  {
    name: 'Starter',
    price: 19.99,
    credits: 50,
    icon: Sparkles,
    features: [
      '50生成积分',
      '5种模板风格',
      'HD高清下载',
      '基础编辑工具',
      '邮件支持',
      '30天有效期'
    ]
  },
  {
    name: 'Popular',
    price: 49.99,
    credits: 150,
    icon: Zap,
    popular: true,
    features: [
      '150生成积分',
      '所有模板风格',
      '4K超高清下载',
      '高级编辑工具',
      '优先支持',
      '90天有效期',
      '批量处理',
      '自定义去水印'
    ]
  },
  {
    name: 'Premium',
    price: 99.99,
    credits: 400,
    icon: Crown,
    features: [
      '400生成积分',
      '无限模板',
      '8K顶级下载',
      '专业编辑套件',
      '7x24 VIP支持',
      '终身访问',
      'API接口',
      '商业许可',
      '白牌选项'
    ]
  }
];

export const SUBSCRIPTION_PLANS: SubscriptionPlan[] = [
  {
    id: 'basic_monthly',
    name: 'Basic',
    price: 9.99,
    credits: 30,
    icon: CalendarDays,
    billingCycle: '每月',
    features: [
      '每月30积分自动续订',
      '所有基础模板',
      'HD高清下载',
      '邮件支持',
      '随时取消'
    ]
  },
  {
    id: 'pro_monthly',
    name: 'Pro',
    price: 29.99,
    credits: 100,
    icon: Repeat,
    popular: true,
    billingCycle: '每月',
    features: [
      '每月100积分自动续订',
      '所有高级模板',
      '4K超高清下载',
      '优先支持',
      '批量处理',
      '随时取消'
    ]
  },
  {
    id: 'enterprise_monthly',
    name: 'Enterprise',
    price: 99.99,
    credits: 500,
    icon: Crown,
    billingCycle: '每月',
    features: [
      '每月500积分自动续订',
      '无限模板访问',
      '8K顶级下载',
      '专属客户经理',
      'API接口',
      '商业许可',
      '随时取消'
    ]
  }
];
