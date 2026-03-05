import React, { useState } from 'react';
import { X } from 'lucide-react';
import { Toast } from '@/components/Toast';
import { FadeIn } from '@/components/react-bits';
import { PricingHeader } from './PricingHeader';
import { PlanList } from './PlanList';
import { usePricingLogic } from './pricingLogic';
import { ONE_TIME_PLANS, SUBSCRIPTION_PLANS } from './constants';
import { PricingPageProps, PricingTab } from './types';

export function PricingPage({ onNavigate }: PricingPageProps) {
  const [activeTab, setActiveTab] = useState<PricingTab>('oneTime');
  const {
    purchasing,
    subscribing,
    toast,
    setToast,
    showContactModal,
    setShowContactModal,
    handlePurchase,
    handleSubscribe,
  } = usePricingLogic(onNavigate);

  return (
    <div className="min-h-screen bg-obsidian py-20">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <PricingHeader />

        <FadeIn delay={0.15}>
          <div className="flex justify-center gap-4 mb-16">
            <button
              onClick={() => setActiveTab('oneTime')}
              className={`px-8 py-3 rounded-sm text-sm font-medium tracking-widest uppercase transition-all border ${
                activeTab === 'oneTime'
                  ? 'bg-gold text-obsidian border-gold'
                  : 'bg-transparent text-pearl/60 border-white/10 hover:border-white/30'
              }`}
            >
              一次性购买
            </button>
            <button
              onClick={() => setActiveTab('subscription')}
              className={`px-8 py-3 rounded-sm text-sm font-medium tracking-widest uppercase transition-all border ${
                activeTab === 'subscription'
                  ? 'bg-gold text-obsidian border-gold'
                  : 'bg-transparent text-pearl/60 border-white/10 hover:border-white/30'
              }`}
            >
              订阅服务
            </button>
          </div>
        </FadeIn>

        {activeTab === 'oneTime' ? (
          <PlanList
            plans={ONE_TIME_PLANS}
            isSubscription={false}
            purchasing={purchasing}
            subscribing={subscribing}
            onPurchase={handlePurchase}
          />
        ) : (
          <PlanList
            plans={SUBSCRIPTION_PLANS}
            isSubscription={true}
            purchasing={purchasing}
            subscribing={subscribing}
            onPurchase={handlePurchase}
            onSubscribe={handleSubscribe}
          />
        )}
      </div>

      {showContactModal && (
        <div className="fixed inset-0 bg-obsidian/90 backdrop-blur-sm flex items-center justify-center z-50 p-4">
          <div className="bg-obsidian border border-white/10 rounded-sm max-w-md w-full shadow-2xl relative">
            <button
              onClick={() => setShowContactModal(false)}
              className="absolute top-4 right-4 text-pearl/60 hover:text-alabaster transition-colors"
              aria-label="关闭"
            >
              <X className="w-6 h-6" />
            </button>
            <div className="p-8">
              <h3 className="mb-2 text-xl font-medium font-display text-alabaster tracking-wider">
                联系客服购买
              </h3>
              <p className="mb-6 text-sm text-pearl/60 font-light leading-relaxed">
                添加微信客服，即刻为您开通积分套餐
              </p>
              <div className="mb-6 rounded-sm border border-gold/20 bg-gold/5 px-6 py-4">
                <p className="text-xs text-pearl/40 uppercase tracking-widest mb-1">微信号</p>
                <p className="text-lg font-medium text-gold tracking-wider">ZYH11ZYH</p>
              </div>
              <button
                onClick={() => {
                  navigator.clipboard.writeText('ZYH11ZYH');
                  setToast({ message: '微信号已复制到剪贴板', type: 'success' });
                  setShowContactModal(false);
                }}
                className="w-full rounded-sm bg-gold py-3 text-sm font-medium text-obsidian tracking-widest uppercase hover:bg-gold/90 transition-colors"
              >
                复制微信号
              </button>
            </div>
          </div>
        </div>
      )}

      {toast && <Toast message={toast.message} type={toast.type} onClose={() => setToast(null)} />}
    </div>
  );
}
