import React from 'react';
import { Check } from 'lucide-react';
import { GlassCard } from '@/components/react-bits';
import { PricingPlan, SubscriptionPlan } from './types';

interface PlanCardProps {
  plan: PricingPlan | SubscriptionPlan;
  index: number;
  isSubscription?: boolean;
  purchasing: boolean;
  onPurchase: () => void;
}

export const PlanCard = ({ plan, index, isSubscription = false, purchasing, onPurchase }: PlanCardProps) => {
  const Icon = plan.icon;
  const delay = 0.2 + index * 0.1;

  return (
    <div style={{ animationDelay: `${delay}s` }}>
      <GlassCard
        className={`relative overflow-hidden transition-all duration-500 hover:scale-105 ${
          plan.popular
            ? 'border-gold shadow-2xl shadow-gold/20 bg-gradient-to-br from-obsidian via-obsidian to-gold/5'
            : 'border-white/10 bg-obsidian hover:border-gold/30'
        }`}
      >
      {plan.popular && (
        <div className="absolute top-0 right-0 bg-gradient-to-r from-yellow-500 to-orange-500 text-obsidian px-6 py-1.5 text-xs font-bold tracking-widest uppercase rounded-bl-lg shadow-lg">
          最受欢迎
        </div>
      )}

      <div className="p-8">
        <div className="flex items-center gap-4 mb-6">
          <div
            className={`w-14 h-14 rounded-lg flex items-center justify-center ${
              plan.popular ? 'bg-gold/20 border-2 border-gold' : 'bg-white/5 border border-white/10'
            }`}
          >
            <Icon className={`w-7 h-7 ${plan.popular ? 'text-gold' : 'text-pearl'}`} />
          </div>
          <div>
            <h3 className="text-2xl font-display font-bold text-alabaster tracking-wider">{plan.name}</h3>
            {'billingCycle' in plan && (
              <p className="text-sm text-pearl/60 font-light tracking-wide">{plan.billingCycle}</p>
            )}
          </div>
        </div>

        <div className="mb-8">
          <div className="flex items-baseline gap-2">
            <span className="text-5xl font-display font-bold text-alabaster tracking-tight">
              ¥{plan.price}
            </span>
            {isSubscription && <span className="text-pearl/60 font-light">/月</span>}
          </div>
          <p className="text-sm text-pearl/60 mt-2 font-light tracking-wide">
            {plan.credits} 生成积分
          </p>
        </div>

        <ul className="space-y-4 mb-8">
          {plan.features.map((feature, idx) => (
            <li key={idx} className="flex items-start gap-3 text-pearl/80 font-light">
              <Check className={`w-5 h-5 flex-shrink-0 mt-0.5 ${plan.popular ? 'text-gold' : 'text-pearl/60'}`} />
              <span className="tracking-wide">{feature}</span>
            </li>
          ))}
        </ul>

        <button
          onClick={onPurchase}
          disabled={purchasing}
          className={`w-full py-4 rounded-sm font-medium tracking-widest uppercase text-sm transition-all duration-500 disabled:opacity-50 disabled:cursor-not-allowed ${
            plan.popular
              ? 'bg-gold text-obsidian hover:bg-gold/90 shadow-lg shadow-gold/20'
              : 'bg-white/5 text-alabaster hover:bg-white/10 border border-white/10'
          }`}
        >
          {purchasing ? '处理中...' : isSubscription ? '立即订阅' : '立即购买'}
        </button>
      </div>
      </GlassCard>
    </div>
  );
};
