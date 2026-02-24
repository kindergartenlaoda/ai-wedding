import {
  Sparkles,
  ArrowRight,
  Check,
  Upload,
  Palette,
  Camera,
  Heart,
  Image as ImageIcon
} from 'lucide-react';
import Image from 'next/image';
import Link from 'next/link';
import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { AuthModal } from './AuthModal';
import { useAuth } from '@/contexts/AuthContext';
import { FadeIn } from '@/components/react-bits';
import { DOMAIN_CONFIG, GENERATION_DOMAINS } from '@/types/domain';
import dynamic from 'next/dynamic';

const HeroProcessAnimation = dynamic(
  () => import('./HeroProcessAnimation').then((mod) => mod.HeroProcessAnimation),
  { ssr: false }
);

interface HomePageProps {
  onNavigate?: (page: string) => void;
}

const DOMAIN_IMAGES: Record<string, string> = {
  wedding: 'https://images.unsplash.com/photo-1511285560929-80b456fea0bc?q=80&w=800&auto=format&fit=crop',
  children: 'https://images.unsplash.com/photo-1627885489708-ce79ebabc2c8?q=80&w=800&auto=format&fit=crop',
  id_photo: 'https://images.unsplash.com/photo-1623951551061-f09b2e04fbee?q=80&w=800&auto=format&fit=crop',
  artistic: 'https://images.unsplash.com/photo-1547826039-bfc35e0f1ea8?q=80&w=800&auto=format&fit=crop',
  portrait: 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?q=80&w=800&auto=format&fit=crop',
  anime: 'https://images.unsplash.com/photo-1618331835717-801e976710b2?q=80&w=800&auto=format&fit=crop',
  landscape: 'https://images.unsplash.com/photo-1469474968028-56623f02e42e?q=80&w=800&auto=format&fit=crop',
  product: 'https://images.unsplash.com/photo-1523275335684-37898b6baf30?q=80&w=800&auto=format&fit=crop',
};

export function HomePage({ onNavigate }: HomePageProps) {
  const { user } = useAuth();
  const router = useRouter();
  const [showAuthModal, setShowAuthModal] = useState(false);

  const navigate = (page: string) => {
    if (onNavigate) {
      onNavigate(page);
    } else {
      router.push(`/${page === 'home' ? '' : page}`);
    }
  };

  const handleGetStarted = () => {
    if (user) {
      navigate('templates');
    } else {
      setShowAuthModal(true);
    }
  };

  return (
    <div className="min-h-screen bg-alabaster text-obsidian selection:bg-gold/30">
      {/* Hero Section - Cinematic Dark */}
      <section className="relative px-4 pt-32 pb-24 lg:pt-40 lg:pb-32 mx-auto sm:px-6 lg:px-8 bg-obsidian text-alabaster overflow-hidden min-h-[90vh] flex items-center">
        {/* Subtle background glow */}
        <div className="absolute top-1/2 left-1/4 -translate-x-1/2 -translate-y-1/2 w-[800px] h-[800px] bg-gold/5 rounded-full blur-[120px] pointer-events-none" />

        <div className="relative z-10 max-w-7xl mx-auto w-full">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-16 lg:gap-12 items-center">
            {/* Left Column - Typography & CTA */}
            <div className="space-y-10 text-center lg:text-left pt-10 lg:pt-0">
              <FadeIn delay={0.1}>
                <div className="inline-flex items-center gap-2 px-5 py-2 border border-white/20 text-pearl rounded-full text-xs uppercase tracking-[0.2em] font-medium backdrop-blur-sm">
                  <Sparkles className="w-3.5 h-3.5 text-gold" />
                  AI 摄影的艺术
                </div>
              </FadeIn>

              <FadeIn delay={0.2}>
                <h1 className="text-5xl font-light tracking-tight leading-tight font-display sm:text-6xl md:text-7xl">
                  以视觉铸就 <br />
                  <span className="italic text-gold font-serif">不朽永恒</span>
                </h1>
              </FadeIn>

              <FadeIn delay={0.3}>
                <p className="max-w-xl mx-auto lg:mx-0 text-lg font-light text-pearl/80 leading-relaxed">
                  将瞬间的感动，化为传世之作。我们的 AI 影棚以电影级的精细度，为您打造专业级影像——每一帧，皆是优雅与算法的交响。
                </p>
              </FadeIn>

              <FadeIn delay={0.4}>
                <div className="flex flex-col gap-5 justify-center lg:justify-start sm:flex-row pt-4">
                  <button
                    onClick={handleGetStarted}
                    className="px-10 py-4 bg-alabaster text-obsidian rounded-sm hover:bg-gold hover:text-obsidian transition-colors duration-700 text-sm tracking-[0.15em] uppercase font-medium flex items-center justify-center gap-3 shadow-[0_0_30px_rgba(255,255,255,0.1)] hover:shadow-[0_0_40px_rgba(200,160,100,0.4)]"
                  >
                    <Camera className="w-5 h-5" />
                    开启创作
                  </button>
                  <button
                    onClick={() => navigate('gallery')}
                    className="px-10 py-4 border border-white/20 text-alabaster rounded-sm hover:bg-white/5 transition-colors duration-700 text-sm tracking-[0.15em] uppercase font-medium flex items-center justify-center gap-3"
                  >
                    <ImageIcon className="w-5 h-5" />
                    浏览画廊
                  </button>
                </div>
              </FadeIn>
            </div>

            {/* Right Column - Process Animation */}
            <div className="relative w-full max-w-md mx-auto lg:max-w-none flex justify-center lg:justify-end">
              <HeroProcessAnimation />
            </div>
          </div>
        </div>
      </section>

      {/* The Portfolio (Domains) - Minimalist Immersive Grid */}
      <section className="py-32 px-4 mx-auto max-w-7xl sm:px-6 lg:px-8">
        <FadeIn>
          <div className="mb-20 text-center space-y-6">
            <h2 className="text-xs font-medium tracking-[0.3em] text-stone uppercase">摄影系列</h2>
            <p className="text-4xl md:text-5xl font-display text-obsidian tracking-tight">为您定制的视觉叙事</p>
          </div>
        </FadeIn>

        <div className="grid grid-cols-1 gap-8 sm:grid-cols-2 lg:grid-cols-4">
          {GENERATION_DOMAINS.map((domainId, index) => {
            const domain = DOMAIN_CONFIG[domainId];
            const Icon = domain.icon;
            return (
              <FadeIn key={domain.id} delay={0.1 * index}>
                <Link href={`/create/${domain.id}`} className="group block relative aspect-[3/4] overflow-hidden rounded-sm bg-stone/5 shadow-lg">
                  <Image
                    src={DOMAIN_IMAGES[domainId] || DOMAIN_IMAGES.wedding}
                    alt={domain.name}
                    fill
                    className="object-cover transition-transform duration-1000 ease-in-out group-hover:scale-105"
                    sizes="(max-width: 768px) 100vw, (max-width: 1200px) 50vw, 25vw"
                  />
                  {/* Elegant refined gradient overlay */}
                  <div className="absolute inset-0 bg-gradient-to-t from-obsidian/90 via-obsidian/20 to-transparent opacity-80 transition-opacity duration-700 group-hover:opacity-100" />

                  <div className="absolute bottom-0 left-0 p-8 w-full z-10">
                    <Icon className="h-6 w-6 mb-5 text-gold opacity-80" />
                    <h3 className="text-2xl font-display text-alabaster mb-3">{domain.name}</h3>
                    <p className="text-sm text-pearl/70 font-light translate-y-4 opacity-0 transition-all duration-700 ease-out group-hover:translate-y-0 group-hover:opacity-100">
                      {domain.description}
                    </p>
                  </div>
                </Link>
              </FadeIn>
            );
          })}
        </div>
      </section>

      {/* The Craft (Features) - Editorial Layout */}
      <section className="py-32 bg-obsidian text-alabaster border-t border-white/5">
        <div className="px-4 mx-auto max-w-7xl sm:px-6 lg:px-8">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-20 items-center">
            <FadeIn>
              <div className="space-y-10">
                <h2 className="text-xs font-medium tracking-[0.3em] text-gold uppercase">极致匠心</h2>
                <h3 className="text-4xl sm:text-5xl md:text-6xl font-display leading-tight">精雕细琢，<br />自然呈现。</h3>
                <p className="text-lg text-pearl/60 font-light pr-10 leading-relaxed">
                  打破传统实体影棚的束缚，以不可思议的低成本，悦享毫不妥协的画质与专业度。
                </p>
                <div className="space-y-8 pt-10 border-t border-white/10">
                  <div className="flex gap-5">
                    <Check className="w-5 h-5 text-gold flex-shrink-0 mt-1" />
                    <div>
                      <h4 className="text-lg font-medium tracking-wider">院线级画质</h4>
                      <p className="text-pearl/50 text-sm mt-2 font-light">无可比拟的分辨率与光影驾驭，媲美国际摄影大师的掌镜之作。</p>
                    </div>
                  </div>
                  <div className="flex gap-5">
                    <Check className="w-5 h-5 text-gold flex-shrink-0 mt-1" />
                    <div>
                      <h4 className="text-lg font-medium tracking-wider">绝对隐私安全</h4>
                      <p className="text-pearl/50 text-sm mt-2 font-light">端到端的最高加密标准，确保您的私人珍藏仅由您独享。</p>
                    </div>
                  </div>
                  <div className="flex gap-5">
                    <Check className="w-5 h-5 text-gold flex-shrink-0 mt-1" />
                    <div>
                      <h4 className="text-lg font-medium tracking-wider">无限风格可能</h4>
                      <p className="text-pearl/50 text-sm mt-2 font-light">从复古纪实到未来赛博，瞬息游离于光阴与空间边缘。</p>
                    </div>
                  </div>
                </div>
              </div>
            </FadeIn>
            <FadeIn delay={0.3}>
              <div className="relative aspect-[4/5] overflow-hidden rounded-sm shadow-2xl">
                <Image
                  src="https://images.unsplash.com/photo-1544005313-94ddf0286df2?q=80&w=800&auto=format&fit=crop"
                  alt="Craftsmanship"
                  fill
                  className="object-cover"
                  sizes="(max-width: 1024px) 100vw, 50vw"
                />
              </div>
            </FadeIn>
          </div>
        </div>
      </section>

      {/* The Process (How It Works) - Minimalist Timeline */}
      <section className="py-32 px-4 mx-auto max-w-7xl sm:px-6 lg:px-8 bg-alabaster">
        <FadeIn>
          <div className="mb-24 text-center space-y-6">
            <h2 className="text-xs font-medium tracking-[0.3em] text-stone uppercase">创作流程</h2>
            <p className="text-4xl md:text-5xl font-display text-obsidian tracking-tight">化繁为简，三步臻美</p>
          </div>
        </FadeIn>

        <div className="grid grid-cols-1 gap-16 md:grid-cols-3 relative">
          <div className="hidden md:block absolute top-[40px] left-[16%] right-[16%] h-[1px] bg-stone/20" />

          {[
            {
              step: '01',
              title: '上传原片',
              description: '提供 3-5 张照片。我们的 AI 引擎将深入解析骨骼结构与神态。',
              icon: Upload,
            },
            {
              step: '02',
              title: '选定风格',
              description: '从顶级样片库中挑选灵感，或通过提示词构建由您主导的视觉。',
              icon: Palette,
            },
            {
              step: '03',
              title: '收获杰作',
              description: '数秒之间，典藏级的作品即刻呈现，让您完美保存。',
              icon: Heart,
            },
          ].map((step, i) => (
            <FadeIn key={i} delay={0.2 * i}>
              <div className="relative flex flex-col items-center text-center space-y-8">
                <div className="w-20 h-20 bg-alabaster border border-stone/20 rounded-full flex items-center justify-center z-10 text-obsidian shadow-[0_10px_30px_-10px_rgba(0,0,0,0.1)] transition-transform duration-700 hover:scale-105">
                  <step.icon className="w-6 h-6 text-obsidian" />
                </div>
                <div className="space-y-4">
                  <span className="text-xs font-mono text-stone tracking-[0.2em]">{step.step}</span>
                  <h3 className="text-2xl font-display text-obsidian">{step.title}</h3>
                  <p className="text-charcoal/70 font-light max-w-[280px] leading-relaxed mx-auto">
                    {step.description}
                  </p>
                </div>
              </div>
            </FadeIn>
          ))}
        </div>
      </section>

      {/* CTA Section - The Invitation */}
      <section className="relative py-40 bg-obsidian text-alabaster overflow-hidden">
        <div className="absolute inset-0 bg-[url('https://images.unsplash.com/photo-1492684223066-81342ee5ff30?q=80&w=2000&auto=format&fit=crop')] bg-cover bg-center opacity-10 mix-blend-luminosity" />
        <div className="absolute inset-0 bg-obsidian/80 backdrop-blur-[2px]" />

        <div className="relative z-10 px-4 mx-auto max-w-4xl text-center sm:px-6 lg:px-8">
          <FadeIn>
            <h2 className="mb-10 text-5xl md:text-7xl font-display tracking-tight leading-tight">
              准备好重塑您的 <br className="hidden sm:block" /> 影像传记了吗？
            </h2>
            <p className="mb-14 text-xl text-pearl/70 font-light max-w-2xl mx-auto leading-relaxed">
              加入顶尖创作者的行列，利用 AI 技术打造毫不妥协的优雅大作。
            </p>
            <button
              onClick={handleGetStarted}
              className="px-12 py-6 bg-alabaster text-obsidian rounded-sm hover:bg-gold hover:text-obsidian transition-colors duration-700 text-sm tracking-[0.2em] uppercase font-medium inline-flex items-center gap-4 shadow-[0_0_30px_rgba(255,255,255,0.05)] hover:shadow-[0_0_40px_rgba(200,160,100,0.3)]"
            >
              踏入影棚
              <ArrowRight className="w-5 h-5" />
            </button>
            <div className="flex flex-wrap justify-center mt-12 gap-x-10 gap-y-4 text-sm tracking-[0.1em] text-pearl/50">
              <span className="flex items-center gap-2"><Check className="w-4 h-4 text-gold" /> 无需绑定信用卡</span>
              <span className="flex items-center gap-2"><Check className="w-4 h-4 text-gold" /> 注册即享 50 积分</span>
            </div>
          </FadeIn>
        </div>
      </section>

      {showAuthModal && <AuthModal onClose={() => setShowAuthModal(false)} />}
    </div>
  );
}
