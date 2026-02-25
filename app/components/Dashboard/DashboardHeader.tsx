import { Sparkles } from 'lucide-react';
import { FadeIn } from '@/components/react-bits';
import type { Profile } from '@/types/database';

interface DashboardHeaderProps {
  profile: Profile | null;
}

export function DashboardHeader({
  profile,
}: DashboardHeaderProps) {
  return (
    <FadeIn delay={0.1}>
      <div className="mb-8 space-y-6">
        <div>
          <h1 className="mb-2 text-4xl font-medium font-display text-alabaster uppercase tracking-wide">
            欢迎回来，{profile?.full_name || '探索者'}
          </h1>
          <p className="text-lg text-pearl/70 font-light tracking-wide">
            准备好创作另一次电影级视觉体验了吗？
          </p>
        </div>

        <div className="flex gap-4">
          <div className="flex items-center gap-4 px-8 py-5 bg-white/5 border border-white/10 rounded-sm shadow-xl transition-all duration-500 hover:shadow-2xl hover:border-gold/30 group">
            <div className="flex justify-center items-center w-12 h-12 bg-obsidian rounded-full border border-gold/20 shadow-[0_0_15px_rgba(200,160,100,0.1)] group-hover:border-gold/40 transition-colors duration-500">
              <Sparkles className="w-5 h-5 text-gold group-hover:scale-110 transition-transform duration-500" />
            </div>
            <div>
              <p className="text-xs font-medium text-gold uppercase tracking-widest mb-1 opacity-80">额度余额</p>
              <div className="flex items-baseline gap-2">
                <p className="text-3xl font-bold font-display text-alabaster tracking-tight">
                  {profile?.credits || 0}
                </p>
              </div>
            </div>
          </div>
        </div>

        <div className="flex justify-end hidden">
          {/* Moved the pricing button to the end of the dashboard layout to avoid clutter */}
        </div>
      </div>
    </FadeIn>
  );
}

