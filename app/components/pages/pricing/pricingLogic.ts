import { useState } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { ToastMessage } from './types';

export const usePricingLogic = (onNavigate: (page: string) => void) => {
  const { user, profile, refreshProfile } = useAuth();
  const [purchasing, setPurchasing] = useState<number | null>(null);
  const [subscribing, setSubscribing] = useState<string | null>(null);
  const [toast, setToast] = useState<ToastMessage | null>(null);
  const [showContactModal, setShowContactModal] = useState(false);

  const handlePurchase = async (planName: string, planIndex: number) => {
    if (!user || !profile) {
      setToast({ message: '请先登录后再购买', type: 'error' });
      onNavigate('home');
      return;
    }

    setPurchasing(planIndex);

    try {
      const res = await fetch('/api/orders/create', {
        method: 'POST',
        credentials: 'include',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ plan: planName }),
      });

      const data = await res.json();

      if (!res.ok) {
        if (res.status === 501) {
          setShowContactModal(true);
          setPurchasing(null); // ✅ 修复：重置状态
          return;
        }
        throw new Error(data.error || '创建订单失败');
      }

      if (data.checkout_url) {
        // ✅ 修复：添加 URL 白名单校验
        const ALLOWED_DOMAINS = ['stripe.com', 'checkout.stripe.com'];
        try {
          const url = new URL(data.checkout_url);
          if (ALLOWED_DOMAINS.some(d => url.hostname.endsWith(d))) {
            window.location.href = data.checkout_url;
          } else {
            throw new Error('Invalid checkout URL');
          }
        } catch {
          throw new Error('Invalid checkout URL format');
        }
        return;
      }

      if (data.order_id) {
        // ✅ 修复：改用递归 setTimeout 替代 setInterval，确保错误可被捕获
        const pollOrderStatus = async (remainingAttempts: number) => {
          if (remainingAttempts <= 0) {
            setToast({ message: '订单查询超时，请稍后在订单页面查看', type: 'error' });
            setPurchasing(null);
            return;
          }

          try {
            const statusRes = await fetch(`/api/orders/validate?order_id=${encodeURIComponent(data.order_id)}`, {
              credentials: 'include',
            });
            const statusData = await statusRes.json();

            if (statusData.status === 'completed') {
              setToast({ message: '购买成功！积分已到账', type: 'success' });
              await refreshProfile();
              setPurchasing(null);
            } else if (statusData.status === 'failed') {
              throw new Error('支付失败');
            } else {
              // 继续轮询
              setTimeout(() => pollOrderStatus(remainingAttempts - 1), 2000);
            }
          } catch (pollErr) {
            setToast({
              message: pollErr instanceof Error ? pollErr.message : '订单查询失败',
              type: 'error',
            });
            setPurchasing(null);
          }
        };

        // 最多轮询 30 次（60 秒）
        pollOrderStatus(30);
      }
    } catch (err) {
      setToast({
        message: err instanceof Error ? err.message : '购买失败，请重试',
        type: 'error',
      });
      setPurchasing(null);
    }
  };

  const handleSubscribe = async (planId: string) => {
    if (!user || !profile) {
      setToast({ message: '请先登录后再订阅', type: 'error' });
      onNavigate('home');
      return;
    }

    setSubscribing(planId);

    try {
      const res = await fetch('/api/subscriptions', {
        method: 'POST',
        credentials: 'include',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ plan_id: planId }),
      });

      const data = await res.json();

      if (!res.ok) {
        if (res.status === 501) {
          setShowContactModal(true);
          setSubscribing(null); // ✅ 修复：重置状态
          return;
        }
        throw new Error(data.error || '创建订阅失败');
      }

      if (data.checkout_url) {
        // ✅ 修复：添加 URL 白名单校验
        const ALLOWED_DOMAINS = ['stripe.com', 'checkout.stripe.com'];
        try {
          const url = new URL(data.checkout_url);
          if (ALLOWED_DOMAINS.some(d => url.hostname.endsWith(d))) {
            window.location.href = data.checkout_url;
          } else {
            throw new Error('Invalid checkout URL');
          }
        } catch {
          throw new Error('Invalid checkout URL format');
        }
      } else {
        setToast({ message: '订阅创建成功', type: 'success' });
        await refreshProfile();
      }
    } catch (err) {
      setToast({
        message: err instanceof Error ? err.message : '订阅失败，请重试',
        type: 'error',
      });
    } finally {
      setSubscribing(null); // ✅ 修复：确保状态总是被重置
    }
  };

  return {
    purchasing,
    subscribing,
    toast,
    setToast,
    showContactModal,
    setShowContactModal,
    handlePurchase,
    handleSubscribe,
  };
};
