import React from 'react';
import { FadeIn } from '@/components/react-bits';
import { PlanCard } from './PlanCard';
import { PricingPlan, SubscriptionPlan } from './types';

interface PlanListProps {
  plans: PricingPlan[] | SubscriptionPlan[];
  isSubscription?: boolean;
  purchasing: number | null;
  subscribing: string | null;
  onPurchase: (planName: string, index: number) => void;
  onSubscribe?: (planId: string) => void;
}

export const PlanList = ({
  plans,
  isSubscription = false,
  purchasing,
  subscribing,
  onPurchase,
  onSubscribe,
}: PlanListProps) => {
  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8 max-w-7xl mx-auto">
      {plans.map((plan, index) => (
        <FadeIn key={isSubscription ? (plan as SubscriptionPlan).id : plan.name} delay={0.2 + index * 0.1}>
          <PlanCard
            plan={plan}
            index={index}
            isSubscription={isSubscription}
            purchasing={
              isSubscription
                ? subscribing === (plan as SubscriptionPlan).id
                : purchasing === index
            }
            onPurchase={() => {
              if (isSubscription && onSubscribe) {
                onSubscribe((plan as SubscriptionPlan).id);
              } else {
                onPurchase(plan.name, index);
              }
            }}
          />
        </FadeIn>
      ))}
    </div>
  );
};
