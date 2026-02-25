'use client';

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
import { useRouter } from 'next/navigation';
import { useEffect, useState } from 'react';
import { FadeIn } from '@/components/react-bits';
import { getDomainIcon } from '@/types/domain';
import dynamic from 'next/dynamic';

interface DomainFromApi {
  id: string;
  slug: string;
  name: string;
  description: string;
  icon: string;
  color: string;
  cover_image: string | null;
  sort_order: number;
}

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

const DEFAULT_COVER =
  'https://images.unsplash.com/photo-1511285560929-80b456fea0bc?q=80&w=800&auto=format&fit=crop';

export function HomePage({ onNavigate }: HomePageProps) {
  const router = useRouter();
  const [domains, setDomains] = useState<DomainFromApi[]>([]);
  const [domainsLoading, setDomainsLoading] = useState(true);

  useEffect(() => {
    fetch('/api/domains', { credentials: 'include' })
      .then((res) => res.json())
      .then((data) => setDomains(data.data ?? []))
      .catch(() => setDomains([]))
      .finally(() => setDomainsLoading(false));
  }, []);

  const navigate = (page: string) => {
    if (onNavigate) {
      onNavigate(page);
    } else {
      router.push(`/${page === 'home' ? '' : page}`);
    }
  };

  const handleGetStarted = () => {
    router.push('/create');
  };

  return (
    <div className="min-h-screen bg-obsidian text-alabaster selection:bg-gold/30">
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
                  AI 智能写真
                </div>
              </FadeIn>

              <FadeIn delay={0.2}>
                <h1 className="text-5xl font-light tracking-tight leading-tight font-display sm:text-6xl md:text-7xl">
                  上传照片，AI 生成 <br />
                  <span className="italic text-gold font-serif">专业写真</span>
                </h1>
              </FadeIn>

              <FadeIn delay={0.3}>
                <p className="max-w-xl mx-auto lg:mx-0 text-lg font-light text-pearl/80 leading-relaxed">
                  上传 3-5 张日常照片，AI 即刻生成婚纱照、证件照、艺术写真等多种风格的高清影像。无需实体影棚，几秒出片。
                </p>
              </FadeIn>

              <FadeIn delay={0.4}>
                <div className="flex flex-col gap-5 justify-center lg:justify-start sm:flex-row pt-4">
                  <button
                    onClick={handleGetStarted}
                    className="px-10 py-4 bg-gold text-obsidian rounded-sm hover:-translate-y-px transition-all duration-700 text-sm tracking-[0.15em] uppercase font-medium flex items-center justify-center gap-3 shadow-[0_0_20px_rgba(200,160,100,0.2)] hover:shadow-[0_0_30px_rgba(200,160,100,0.4)]"
                  >
                    <Camera className="w-5 h-5" />
                    免费试用
                  </button>
                  <button
                    onClick={() => navigate('gallery')}
                    className="px-10 py-4 border border-white/20 text-alabaster rounded-sm hover:bg-white/5 transition-colors duration-700 text-sm tracking-[0.15em] uppercase font-medium flex items-center justify-center gap-3"
                  >
                    <ImageIcon className="w-5 h-5" />
                    查看效果
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

      {/* The Portfolio (Domains) - Cinematic Dark Series */}
      <section className="py-32 bg-obsidian text-alabaster relative border-t border-white/5">
        <div className="px-4 mx-auto max-w-7xl sm:px-6 lg:px-8">
          <FadeIn>
            <div className="mb-20 text-center space-y-6">
              <h2 className="text-xs font-medium tracking-[0.4em] text-gold uppercase">写真风格</h2>
              <p className="text-4xl md:text-5xl font-display text-alabaster tracking-tight">
                选择你喜欢的 <span className="italic text-gold/80 font-serif">AI 写真风格</span>
              </p>
            </div>
          </FadeIn>

          {/* Horizontal scroll on mobile, Grid on desktop */}
          <div className="flex overflow-x-auto sm:grid sm:grid-cols-2 lg:grid-cols-4 gap-6 sm:gap-8 pb-10 sm:pb-0 snap-x snap-mandatory [scrollbar-width:none] [&::-webkit-scrollbar]:hidden -mx-4 px-4 sm:mx-0 sm:px-0">
            {domainsLoading ? (
              <div className="col-span-full py-16 text-center text-pearl/60">加载风格中...</div>
            ) : (
              domains.map((domain, index) => {
                const Icon = getDomainIcon(domain.icon);
                const coverSrc = domain.cover_image || DOMAIN_IMAGES[domain.slug] || DEFAULT_COVER;
                return (
                  <FadeIn key={domain.id} delay={0.1 * index} className="min-w-[80vw] sm:min-w-0 snap-center">
                    <Link href={`/create?domain=${domain.slug}`} className="group block relative aspect-[3/4] overflow-hidden rounded-sm bg-obsidian shadow-2xl border border-white/5">
                      <Image
                        src={coverSrc}
                        alt={domain.name}
                        fill
                        className="object-cover transition-transform duration-1500 ease-smooth group-hover:scale-105"
                        sizes="(max-width: 768px) 80vw, (max-width: 1200px) 50vw, 25vw"
                      />
                      {/* Darker base gradient for text readability, with a subtle glow on hover */}
                      <div className="absolute inset-0 bg-gradient-to-t from-obsidian/95 via-obsidian/40 to-transparent opacity-80 transition-opacity duration-1000 group-hover:opacity-100" />

                      {/* Subtle border glow effect on hover */}
                      <div className="absolute inset-0 border border-transparent transition-colors duration-1000 group-hover:border-gold/20 rounded-sm z-20 pointer-events-none" />

                      <div className="absolute bottom-0 left-0 p-8 w-full z-10 transform transition-transform duration-1000 ease-smooth translate-y-0 sm:translate-y-4 sm:group-hover:translate-y-0">
                        <Icon className="h-6 w-6 mb-6 text-gold opacity-90 drop-shadow-[0_0_10px_rgba(200,160,100,0.5)]" />
                        <h3 className="text-2xl font-display text-alabaster mb-3 tracking-wide">{domain.name}</h3>
                        <p className="text-sm text-pearl/70 font-light opacity-100 sm:opacity-0 transition-opacity duration-1200 ease-smooth delay-100 sm:group-hover:opacity-100 line-clamp-2">
                          {domain.description}
                        </p>
                      </div>
                    </Link>
                  </FadeIn>
                );
              })
            )}
          </div>
        </div>
      </section>

      {/* The Craft (Features) - Editorial Overlapping Layout */}
      <section className="py-32 bg-obsidian text-alabaster border-t border-white/5 relative overflow-hidden">
        {/* Subtle background glow for depth */}
        <div className="absolute right-0 top-1/4 w-[600px] h-[600px] bg-gold/5 rounded-full blur-[100px] pointer-events-none translate-x-1/3" />

        <div className="px-4 mx-auto max-w-7xl sm:px-6 lg:px-8 relative z-10">
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-12 lg:gap-8 items-center">

            {/* Left Column: Text Content (Takes up 5 columns on large screens) */}
            <FadeIn className="lg:col-span-5 lg:pr-8 z-20">
              <div className="space-y-10">
                <div className="inline-flex items-center gap-3">
                  <span className="w-8 h-[1px] bg-gold/50"></span>
                  <h2 className="text-xs font-medium tracking-[0.4em] text-gold uppercase">极致品质</h2>
                </div>

                <h3 className="text-4xl sm:text-5xl md:text-6xl font-display leading-tight tracking-tight">
                  专业级画质，<br />
                  <span className="italic font-serif text-pearl">自然的美。</span>
                </h3>

                <p className="text-lg text-pearl/70 font-light leading-relaxed">
                  无需实体影棚，即可拥有媚美专业摄影的画质与光影质感。
                </p>

                <div className="space-y-8 pt-10 border-t border-white/10">
                  {[
                    { title: '高清无损画质', desc: '媚美影棚级别的画质，放大打印也清晰，满足各种场景需求。' },
                    { title: '隐私安全保障', desc: '照片仅用于生成过程，生成后自动清除，绝不外泄。' },
                    { title: '海量风格模板', desc: '从清新日系到复古胶片，100+ 专业风格任选。' }
                  ].map((feature, idx) => (
                    <div key={idx} className="flex gap-6 group">
                      <div className="mt-1 flex-shrink-0 w-8 h-8 rounded-full border border-gold/20 flex items-center justify-center bg-gold/5 group-hover:bg-gold/20 transition-colors duration-500">
                        <Check className="w-4 h-4 text-gold group-hover:scale-110 transition-transform duration-500" />
                      </div>
                      <div>
                        <h4 className="text-lg font-medium tracking-wide text-alabaster group-hover:text-gold transition-colors duration-300">{feature.title}</h4>
                        <p className="text-pearl/50 text-sm mt-2 font-light leading-relaxed">{feature.desc}</p>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </FadeIn>

            {/* Right Column: Parallax Image (Takes up 7 columns on large screens) */}
            <FadeIn delay={0.3} className="lg:col-span-7 relative h-[600px] lg:h-[800px] w-full mt-10 lg:mt-0 lg:-ml-12 z-10">
              {/* Decorative frame border */}
              <div className="absolute inset-0 border border-white/10 translate-x-4 translate-y-4 rounded-sm hidden lg:block pointer-events-none" />

              <div className="relative w-full h-full overflow-hidden rounded-sm shadow-2xl bg-stone/5">
                <Image
                  src="https://images.unsplash.com/photo-1544005313-94ddf0286df2?q=80&w=1200&auto=format&fit=crop"
                  alt="极致的摄影匠心"
                  fill
                  className="object-cover transition-transform duration-2000 hover:scale-105 ease-out"
                  sizes="(max-width: 1024px) 100vw, 60vw"
                />
                {/* Vintage grain overlay */}
                <div className="absolute inset-0 bg-obsidian mix-blend-overlay opacity-20 pointer-events-none" />
                <div className="absolute inset-0 bg-gradient-to-tr from-obsidian/60 to-transparent pointer-events-none" />
              </div>
            </FadeIn>
          </div>
        </div>
      </section>

      {/* The Process (How It Works) - Immersive Cinematic Timeline */}
      <section className="py-40 px-4 mx-auto w-full sm:px-6 lg:px-8 bg-obsidian relative border-t border-white/5">
        {/* Abstract background elements */}
        <div className="absolute inset-0 opacity-[0.03] bg-[radial-gradient(ellipse_at_center,_var(--tw-gradient-stops))] from-gold via-obsidian to-obsidian pointer-events-none" />

        <FadeIn>
          <div className="mb-32 text-center space-y-6 relative z-10">
            <h2 className="text-xs font-medium tracking-[0.4em] text-gold uppercase">使用流程</h2>
            <p className="text-4xl md:text-5xl font-display text-alabaster tracking-tight">
              简单三步，<span className="italic font-serif text-gold/80">即刻出片</span>
            </p>
          </div>
        </FadeIn>

        <div className="max-w-6xl mx-auto relative z-10">
          {/* Desktop continuous glowing line */}
          <div className="hidden md:block absolute top-[44px] left-[10%] right-[10%] h-[1px] bg-gradient-to-r from-transparent via-gold/30 to-transparent" />

          <div className="grid grid-cols-1 gap-20 md:gap-10 md:grid-cols-3">
            {[
              {
                step: '01',
                title: '上传照片',
                description: '选择 3-5 张日常照片上传，正面清晰即可，无需专业设备。',
                icon: Upload,
              },
              {
                step: '02',
                title: '选择风格',
                description: '浏览丰富的风格模板，或输入自定义描述，定制你的专属写真。',
                icon: Palette,
              },
              {
                step: '03',
                title: '获取成品',
                description: '几秒钟后，下载你的高清 AI 写真作品，即刻分享或打印。',
                icon: Heart,
              },
            ].map((step, i) => (
              <FadeIn key={i} delay={0.2 * i}>
                <div className="relative flex flex-col items-center text-center group cursor-default">

                  {/* Glowing Node */}
                  <div className="relative mb-12">
                    {/* Background pulse effect on hover */}
                    <div className="absolute inset-0 bg-gold/20 rounded-full blur-xl scale-0 group-hover:scale-150 transition-transform duration-1000 ease-out opacity-0 group-hover:opacity-100" />

                    {/* The circle */}
                    <div className="relative w-24 h-24 bg-obsidian border border-white/10 group-hover:border-gold/50 rounded-full flex items-center justify-center z-10 text-alabaster shadow-2xl transition-all duration-700 ease-smooth">
                      <step.icon className="w-8 h-8 text-pearl group-hover:text-gold transition-colors duration-500" />

                      {/* Huge background numbers watermark */}
                      <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 text-[120px] font-serif font-bold text-white/[0.02] -z-10 group-hover:text-gold/[0.05] transition-colors duration-700 pointer-events-none select-none">
                        {step.step}
                      </div>
                    </div>
                  </div>

                  <div className="space-y-5 px-4">
                    <span className="text-xs font-mono text-gold tracking-[0.3em] uppercase opacity-80">{`Phase ${step.step}`}</span>
                    <h3 className="text-2xl font-display text-alabaster tracking-wide">{step.title}</h3>
                    <p className="text-pearl/60 font-light max-w-[280px] leading-relaxed mx-auto group-hover:text-pearl/90 transition-colors duration-500 text-sm">
                      {step.description}
                    </p>
                  </div>
                </div>
              </FadeIn>
            ))}
          </div>
        </div>
      </section>

      {/* CTA Section - The Invitation (Cinematic Finale) */}
      <section className="relative py-40 bg-obsidian text-alabaster overflow-hidden border-t border-white/5">
        {/* Deep immersive background */}
        <div className="absolute inset-0 bg-[url('https://images.unsplash.com/photo-1492684223066-81342ee5ff30?q=80&w=2000&auto=format&fit=crop')] bg-cover bg-fixed bg-center opacity-[0.07] mix-blend-luminosity grayscale" />
        <div className="absolute inset-0 bg-gradient-to-b from-obsidian via-obsidian/90 to-black backdrop-blur-[1px]" />

        <div className="relative z-10 px-4 mx-auto max-w-4xl text-center sm:px-6 lg:px-8">
          <FadeIn>
            <div className="inline-flex items-center gap-3 mb-8">
              <span className="w-12 h-[1px] bg-gold/30"></span>
              <span className="text-xs font-medium tracking-[0.4em] text-gold uppercase">开始体验</span>
              <span className="w-12 h-[1px] bg-gold/30"></span>
            </div>

            <h2 className="mb-10 text-5xl md:text-7xl font-display tracking-tight leading-tight mix-blend-plus-lighter">
              想看看 AI 把你变成 <br className="hidden sm:block" />
              <span className="italic font-serif text-gold/90">什么样</span> 吗？
            </h2>

            <p className="mb-14 text-xl text-pearl/60 font-light max-w-2xl mx-auto leading-relaxed">
              已有万名用户用焕影 AI 生成了心仪的照片。上传照片，几秒钟即可获得婚纱照、证件照、艺术写真等多种风格作品。
            </p>

            <button
              onClick={handleGetStarted}
              className="group relative px-12 py-6 bg-transparent overflow-hidden text-alabaster border border-white/20 rounded-sm hover:border-gold/50 transition-colors duration-700 text-sm tracking-[0.2em] uppercase font-medium inline-flex items-center gap-4 hover:shadow-[0_0_40px_rgba(200,160,100,0.15)]"
            >
              {/* Button Hover Glow Background */}
              <div className="absolute inset-0 bg-gold/10 translate-y-full group-hover:translate-y-0 transition-transform duration-500 ease-smooth" />
              <span className="relative z-10">立即免费试用</span>
              <ArrowRight className="w-5 h-5 relative z-10 group-hover:translate-x-1 transition-transform duration-500" />
            </button>

            <div className="flex flex-wrap justify-center mt-16 gap-x-12 gap-y-6 text-xs tracking-[0.2em] text-pearl/40 uppercase font-mono">
              <span className="flex items-center gap-3"><Check className="w-3.5 h-3.5 text-gold/70" /> 无需绑定信用卡</span>
              <span className="w-1 h-1 rounded-full bg-stone/30 hidden sm:block"></span>
              <span className="flex items-center gap-3"><Check className="w-3.5 h-3.5 text-gold/70" /> 新用户赠送 50 张免费额度</span>
            </div>
          </FadeIn>
        </div>
      </section>

    </div>
  );
}
