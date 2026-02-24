import { Sparkles } from 'lucide-react';
import { FadeIn } from '@/components/react-bits';
import type { Profile } from '@/types/database';

interface DashboardHeaderProps {
  profile: Profile | null;
  onNavigateToPricing: () => void;
}

export function DashboardHeader({
  profile,
  onNavigateToPricing,
}: DashboardHeaderProps) {
  return (
    <FadeIn delay={0.1}>
      <div className="mb-8 space-y-6">
        <div>
          <h1 className="mb-2 text-4xl font-medium font-display text-obsidian uppercase tracking-wide">
            欢迎回来，{profile?.full_name || '探索者'}
          </h1>
          <p className="text-lg text-stone font-light tracking-wide">
            准备好创作另一次电影级视觉体验了吗？
          </p>
        </div>

        <div className="flex gap-4">
          <div className="flex items-center gap-3 px-6 py-4 bg-alabaster border border-stone/20 rounded-sm shadow-sm transition-all duration-500 hover:shadow-lg hover:border-gold/30">
            <div className="flex justify-center items-center w-10 h-10 bg-stone/5 rounded-full border border-stone/10">
              <Sparkles className="w-5 h-5 text-gold" />
            </div>
            <div>
              <p className="text-xs font-medium text-stone uppercase tracking-widest">额度余额</p>
              <div className="flex items-baseline gap-2">
                <p className="text-2xl font-bold font-display text-obsidian tracking-tight">
                  {profile?.credits || 0}
                </p>
              </div>
            </div>
          </div>
        </div>

        <div className="flex justify-end">
          <button
            onClick={onNavigateToPricing}
            className="px-6 py-4 font-medium transition-all duration-500 rounded-sm shadow-sm bg-obsidian text-alabaster hover:bg-gold hover:text-obsidian hover:shadow-md uppercase tracking-[0.2em] text-xs h-full flex items-center border border-transparent"
            title="购买额度"
          >
            购买更多积分
          </button>
        </div>
      </div>
    </FadeIn>
  );
}

