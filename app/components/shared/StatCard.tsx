import { LucideIcon } from 'lucide-react';

interface StatCardProps {
  icon: LucideIcon;
  label: string;
  value: number;
  color?: 'rose-gold' | 'dusty-rose' | 'navy' | 'forest';
}

const colorClasses = {
  'rose-gold': {
    icon: 'text-gold',
    bg: 'bg-gold/10',
    border: 'border-gold/20'
  },
  'dusty-rose': {
    icon: 'text-yellow-600',
    bg: 'bg-yellow-600/10',
    border: 'border-yellow-600/20'
  },
  navy: {
    icon: 'text-alabaster',
    bg: 'bg-white/10',
    border: 'border-white/20'
  },
  forest: {
    icon: 'text-pearl/60',
    bg: 'bg-white/5',
    border: 'border-white/10'
  }
};

export function StatCard({ icon: Icon, label, value, color = 'rose-gold' }: StatCardProps) {
  const colors = colorClasses[color];

  return (
    <div className={`px-6 py-4 ${colors.bg} backdrop-blur-sm rounded-xl border ${colors.border} transition-all duration-300 hover:shadow-md`}>
      <div className="flex items-center gap-3">
        <Icon className={`w-6 h-6 ${colors.icon}`} />
        <div>
          <div className="text-2xl font-display font-semibold text-alabaster">{value}</div>
          <div className="text-sm text-pearl/60">{label}</div>
        </div>
      </div>
    </div>
  );
}


