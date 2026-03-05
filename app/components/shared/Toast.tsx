import { useEffect } from 'react';
import { X, CheckCircle, AlertCircle, Info, AlertTriangle } from 'lucide-react';

interface ToastProps {
  message: string;
  type?: 'success' | 'error' | 'info' | 'warning';
  onClose: () => void;
  duration?: number;
}

// 根据类型自动设置持续时间
const getDefaultDuration = (type: ToastProps['type']) => {
  switch (type) {
    case 'success':
      return 3000; // 3秒
    case 'error':
      return 5000; // 5秒
    case 'warning':
      return 4000; // 4秒
    case 'info':
      return 3000; // 3秒
    default:
      return 3000;
  }
};

export function Toast({ message, type = 'success', onClose, duration }: ToastProps) {
  const finalDuration = duration ?? getDefaultDuration(type);

  useEffect(() => {
    const timer = setTimeout(() => {
      onClose();
    }, finalDuration);

    return () => clearTimeout(timer);
  }, [finalDuration, onClose]);

  const icons = {
    success: CheckCircle,
    error: AlertCircle,
    info: Info,
    warning: AlertTriangle
  };

  const styles = {
    success: {
      bg: 'bg-gold/10 border-gold/30',
      text: 'text-alabaster',
      icon: 'text-gold'
    },
    error: {
      bg: 'bg-red-500/10 border-red-500/30',
      text: 'text-red-400',
      icon: 'text-red-400'
    },
    info: {
      bg: 'bg-white/5 border-white/10',
      text: 'text-alabaster',
      icon: 'text-pearl'
    },
    warning: {
      bg: 'bg-yellow-50 border-yellow-300',
      text: 'text-yellow-900',
      icon: 'text-yellow-600'
    }
  };

  const Icon = icons[type];
  const style = styles[type];

  return (
    <div className="fixed top-4 right-4 z-[9999] animate-in slide-in-from-top-2 fade-in duration-300">
      <div className={`flex items-center gap-3 px-5 py-4 rounded-sm border shadow-2xl backdrop-blur-md ${style.bg} ${style.text} min-w-[320px] max-w-md`}>
        <Icon className={`w-5 h-5 flex-shrink-0 ${style.icon}`} />
        <p className="flex-1 font-light text-sm tracking-wide leading-relaxed">{message}</p>
        <button
          onClick={onClose}
          className="p-1.5 hover:bg-white/10 rounded-sm transition-colors flex-shrink-0"
          aria-label="关闭提示"
        >
          <X className="w-4 h-4 text-pearl/60 hover:text-alabaster transition-colors" />
        </button>
      </div>
    </div>
  );
}
