import { Check, Sparkles, Zap, Crown } from 'lucide-react';
import { useState } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { Toast } from './Toast';
import { FadeIn } from '@/components/react-bits';

interface PricingPageProps {
  onNavigate: (page: string) => void;
}

export function PricingPage({ onNavigate }: PricingPageProps) {
  const { user, profile, refreshProfile } = useAuth();
  const [purchasing, setPurchasing] = useState<number | null>(null);
  const [toast, setToast] = useState<{ message: string; type: 'success' | 'error' } | null>(null);

  const plans = [
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

  const handlePurchase = async (planIndex: number) => {
    if (!user || !profile) {
      setToast({ message: '请先登录', type: 'error' });
      onNavigate('home');
      return;
    }

    const plan = plans[planIndex];
    setPurchasing(planIndex);

    try {
      const createRes = await fetch('/api/orders/create', {
        method: 'POST',
        credentials: 'include',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ plan: plan.name }),
      });
      const createJson = await createRes.json();
      if (!createRes.ok) throw new Error(createJson?.error || '创建订单失败');

      const payment_intent_id: string | undefined = createJson?.payment_intent_id;
      const checkout_url: string | undefined = createJson?.checkout_url;
      if (!payment_intent_id && !checkout_url) throw new Error('缺少支付信息');

      if (checkout_url) {
        window.location.href = checkout_url;
        return;
      } else {
        const confirmRes = await fetch('/api/orders/mock/confirm', {
          method: 'POST',
          credentials: 'include',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ payment_intent_id }),
        });
        const confirmJson = await confirmRes.json();
        if (!confirmRes.ok) throw new Error(confirmJson?.error || '确认支付失败');
      }

      await refreshProfile();
      setToast({ message: `购买成功！已添加 ${plan.credits} 积分到您的账户`, type: 'success' });
      setPurchasing(null);
    } catch (error) {
      console.error('购买失败:', error);
      setToast({ message: '购买失败，请重试', type: 'error' });
      setPurchasing(null);
    }
  };

  return (
    <div className="py-16 min-h-screen bg-gradient-to-b from-champagne via-ivory to-blush">
      <div className="px-4 mx-auto max-w-7xl sm:px-6 lg:px-8">
        {/* Header */}
        <FadeIn delay={0.1}>
          {/* Notice Banner */}
          <div className="mb-12 mx-auto max-w-3xl">
            <div className="p-6 bg-stone/5 border border-stone/15 rounded-sm shadow-sm">
              <div className="flex items-start gap-4">
                <div className="flex-shrink-0 w-10 h-10 bg-stone/10 rounded-full flex items-center justify-center">
                  <Sparkles className="w-5 h-5 text-gold" />
                </div>
                <div className="flex-1">
                  <h3 className="mb-3 text-lg font-medium text-obsidian tracking-wide">
                    当前为体验模式
                  </h3>
                  <ul className="space-y-2 text-sm text-stone font-light">
                    <li className="flex items-start gap-2">
                      <span className="text-gold mt-0.5">•</span>
                      <span>新用户注册即可获得免费体验积分</span>
                    </li>
                    <li className="flex items-start gap-2">
                      <span className="text-gold mt-0.5">•</span>
                      <span>积分可联系客服充值</span>
                    </li>
                    <li className="flex items-start gap-2">
                      <span className="text-gold mt-0.5">•</span>
                      <span className="font-medium tracking-widest">微信: ZYH11ZYH</span>
                    </li>
                  </ul>
                </div>
              </div>
            </div>
          </div>

          <div className="mb-16 text-center">
            <div className="inline-flex items-center gap-2 px-5 py-2.5 bg-stone/5 border border-stone/10 text-obsidian rounded-sm text-xs font-medium tracking-[0.2em] shadow-sm mb-6 uppercase">
              <Sparkles className="w-4 h-4 text-gold" />
              极简 · 透明
            </div>
            <h1 className="mb-4 text-4xl font-medium sm:text-5xl md:text-6xl font-display text-obsidian tracking-tight">
              选择您的
              <span className="italic text-gold font-serif"> 艺术方案</span>
            </h1>
            <p className="mx-auto max-w-2xl text-xl leading-relaxed text-stone font-light">
              新晋创作者尊享 50 免费积分。随时升阶，解锁更多殿堂级视效。
            </p>
          </div>
        </FadeIn>

        {/* Pricing Cards */}
        <div className="grid grid-cols-1 gap-8 mb-24 md:grid-cols-3">
          {plans.map((plan, index) => (
            <FadeIn key={index} delay={0.2 + index * 0.1}>
              <div
                className={`relative bg-alabaster rounded-sm shadow-xl overflow-hidden transition-all duration-700 hover:shadow-2xl hover:-translate-y-2 ${plan.popular ? 'border border-gold shadow-[0_0_40px_rgba(200,160,100,0.15)] ring-1 ring-gold/50' : 'border border-stone/10'
                  }`}
              >
                {plan.popular && (
                  <div className="absolute top-0 left-0 right-0 bg-gold text-obsidian text-center py-2 text-xs font-medium tracking-[0.2em] uppercase">
                    匠心之选
                  </div>
                )}

                <div className={`p-10 ${plan.popular ? 'pt-14' : ''}`}>
                  <div className="flex justify-center items-center mb-8 w-16 h-16 bg-stone/5 rounded-full border border-stone/10 mx-auto">
                    <plan.icon className="w-6 h-6 text-obsidian" />
                  </div>

                  <div className="text-center">
                    <h3 className="mb-3 text-2xl font-medium font-display text-obsidian uppercase tracking-widest">{plan.name}</h3>
                    <div className="flex justify-center items-baseline mb-8">
                      <span className="text-5xl font-light font-display text-obsidian">${plan.price}</span>
                      <span className="text-xs text-stone tracking-wider uppercase ml-2 block">终身授权</span>
                    </div>
                  </div>

                  <div className="px-5 py-4 mb-8 bg-stone/5 rounded-sm border border-stone/10">
                    <div className="flex justify-between items-center text-sm uppercase tracking-wider">
                      <span className="font-medium text-stone">生成额度</span>
                      <span className="text-2xl font-semibold font-display text-obsidian">
                        {plan.credits}
                      </span>
                    </div>
                  </div>

                  <ul className="mb-10 space-y-5">
                    {plan.features.map((feature, i) => (
                      <li key={i} className="flex gap-4 items-start">
                        <div className="w-5 h-5 rounded-full bg-stone/10 flex items-center justify-center flex-shrink-0 mt-0.5">
                          <Check className="w-3 h-3 text-obsidian" />
                        </div>
                        <span className="leading-relaxed text-stone font-light">{feature}</span>
                      </li>
                    ))}
                  </ul>

                  <button
                    onClick={() => handlePurchase(index)}
                    disabled={purchasing !== null}
                    className={`w-full py-5 rounded-sm font-medium text-sm transition-all duration-500 shadow-md hover:shadow-lg disabled:opacity-50 disabled:cursor-not-allowed tracking-widest uppercase ${plan.popular
                        ? 'bg-obsidian text-alabaster hover:bg-gold hover:text-obsidian'
                        : 'bg-transparent text-obsidian hover:bg-stone/5 border border-stone/20'
                      }`}
                  >
                    {purchasing === index ? '授权中...' : user ? '立即购买' : '开启艺术之旅'}
                  </button>
                </div>
              </div>
            </FadeIn>
          ))}
        </div>

        {/* 对比表格 */}
        <FadeIn delay={0.5}>
          <div className="overflow-x-auto mb-24 border border-stone/10 rounded-sm bg-alabaster shadow-xl">
            <div className="p-10">
              <h2 className="mb-8 text-3xl font-medium font-display text-obsidian text-center uppercase tracking-widest">方案对比</h2>
              <table className="min-w-full text-sm text-left">
                <thead>
                  <tr className="border-b border-stone/10">
                    <th className="py-5 pr-4 text-stone uppercase tracking-widest text-xs font-medium">权益</th>
                    {plans.map((p, i) => (
                      <th key={i} className="px-6 py-5 font-medium text-obsidian uppercase tracking-wider">{p.name}</th>
                    ))}
                  </tr>
                </thead>
                <tbody className="divide-y divide-stone/5">
                  {[
                    { k: '可用模板', v: ['5 种基础模板', '全部模板', '全部模板 + 未来更新'] },
                    { k: '图片分辨率', v: ['高清 (HD)', '超高清 (4K)', '最高清 (8K)'] },
                    { k: '编辑功能', v: ['基础调整', '高级参数调整', '专业编辑工具'] },
                    { k: '客服支持', v: ['普通排队', '优先处理', 'VIP 即时响应'] },
                    { k: '有效期', v: ['30 天', '90 天', '永久'] },
                    { k: '商用授权', v: ['-', '可选购买', '包含'] },
                    { k: 'API 接口', v: ['-', '可选购买', '包含'] },
                  ].map((row, rIdx) => (
                    <tr key={rIdx} className="hover:bg-stone/5 transition-colors duration-300">
                      <td className="py-5 pr-4 whitespace-nowrap text-stone font-light text-sm">{row.k}</td>
                      {row.v.map((vv, cIdx) => (
                        <td key={cIdx} className="px-6 py-5 whitespace-nowrap text-obsidian font-light">
                          {vv === '-' ? (
                            <span className="text-stone/30">--</span>
                          ) : (
                            vv
                          )}
                        </td>
                      ))}
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </FadeIn>

        {/* FAQ Section */}
        <FadeIn delay={0.6}>
          <div className="mx-auto max-w-4xl pt-10">
            <div className="mb-12 text-center">
              <h2 className="mb-4 text-3xl font-medium font-display text-obsidian tracking-wider">常见问题</h2>
              <p className="text-stone font-light">关于积分和使用的常见疑问</p>
            </div>

            <div className="space-y-6">
              {[
                {
                  q: '积分怎么算？',
                  a: '每次生成图片消耗 10-20 积分，具体取决于模板复杂度。积分余额可在个人中心查看。'
                },
                {
                  q: '不满意可以退款吗？',
                  a: '购买后 30 天内，如果对生成效果不满意，可以联系客服申请退款。'
                },
                {
                  q: '积分有效期多久？',
                  a: '取决于您选择的方案：Starter 为 30 天，Popular 为 90 天，Premium 为永久有效。'
                },
                {
                  q: '可以升级方案吗？',
                  a: '可以随时升级到更高方案，已有积分会保留并自动合并。'
                }
              ].map((faq, i) => (
                <div key={i} className="p-8 rounded-sm border border-stone/10 bg-alabaster hover:shadow-lg transition-all duration-500">
                  <h3 className="mb-4 font-medium font-display text-obsidian tracking-wide text-lg">{faq.q}</h3>
                  <p className="leading-relaxed text-stone font-light text-sm">{faq.a}</p>
                </div>
              ))}
            </div>
          </div>
        </FadeIn>
      </div>

      {toast && (
        <Toast
          message={toast.message}
          type={toast.type}
          onClose={() => setToast(null)}
        />
      )}
    </div>
  );
}
