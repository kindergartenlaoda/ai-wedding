import { useState } from 'react';
import { X, Mail, Lock, User, Loader2 } from 'lucide-react';
import { useAuth } from '@/contexts/AuthContext';
import { Toast } from './Toast';

interface AuthModalProps {
  onClose: () => void;
}

export function AuthModal({ onClose }: AuthModalProps) {
  const { signIn, signUp } = useAuth();
  const [isLogin, setIsLogin] = useState(true);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [showSuccessToast, setShowSuccessToast] = useState(false);
  const [formData, setFormData] = useState({
    email: '',
    password: '',
    fullName: ''
  });

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setLoading(true);

    try {
      if (isLogin) {
        await signIn(formData.email, formData.password);
        onClose();
      } else {
        await signUp(formData.email, formData.password, formData.fullName);
        // 注册成功后显示提醒消息
        setShowSuccessToast(true);
        // 3秒后关闭弹窗
        setTimeout(() => {
          onClose();
        }, 3000);
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : '发生错误');
    } finally {
      setLoading(false);
    }
  };

  return (
    <>
      {showSuccessToast && (
        <Toast
          message="注册成功！请查看您的邮箱并点击确认链接来激活账号。"
          type="success"
          onClose={() => setShowSuccessToast(false)}
          duration={3000}
        />
      )}

      <div className="flex fixed inset-0 z-50 justify-center items-center p-4 backdrop-blur-sm bg-black/60">
        <div className="relative w-full max-w-md rounded-xl border shadow-2xl bg-black/90 border-white/10">
          <button
            onClick={onClose}
            className="absolute top-4 right-4 p-2 rounded-md transition-colors text-pearl/60 hover:text-alabaster hover:bg-white/10"
          >
            <X className="w-5 h-5" />
          </button>

          <div className="p-8">
            <h2 className="mb-2 text-3xl font-medium font-display text-alabaster">
              {isLogin ? '欢迎回来' : '创建账号'}
            </h2>
            <p className="mb-6 text-pearl/60">
              {isLogin ? '登录以访问您的项目' : '开始创作精美作品'}
            </p>

            <div className="flex gap-4 items-center my-6">
              <div className="flex-1 h-px bg-white/20" />
              <span className="text-xs text-pearl/60">或使用邮箱{isLogin ? '登录' : '注册'}</span>
              <div className="flex-1 h-px bg-white/20" />
            </div>

            <form onSubmit={handleSubmit} className="space-y-4">
              {!isLogin && (
                <div>
                  <label className="block mb-2 text-sm font-medium text-alabaster">姓名</label>
                  <div className="relative">
                    <User className="absolute left-3 top-1/2 w-5 h-5 -translate-y-1/2 text-pearl/60" />
                    <input
                      type="text"
                      value={formData.fullName}
                      onChange={(e) => setFormData({ ...formData, fullName: e.target.value })}
                      className="py-3 pr-4 pl-11 w-full rounded-md border transition-all border-white/20 bg-black/40 text-alabaster focus:ring-2 focus:ring-gold/30 focus:border-gold placeholder:text-pearl/40"
                      placeholder="请输入您的姓名"
                      required={!isLogin}
                    />
                  </div>
                </div>
              )}

              <div>
                <label className="block mb-2 text-sm font-medium text-alabaster">邮箱</label>
                <div className="relative">
                  <Mail className="absolute left-3 top-1/2 w-5 h-5 -translate-y-1/2 text-pearl/60" />
                  <input
                    type="email"
                    value={formData.email}
                    onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                    className="py-3 pr-4 pl-11 w-full rounded-md border transition-all border-white/20 bg-black/40 text-alabaster focus:ring-2 focus:ring-gold/30 focus:border-gold placeholder:text-pearl/40"
                    placeholder="请输入邮箱"
                    required
                  />
                </div>
              </div>

              <div>
                <label className="block mb-2 text-sm font-medium text-alabaster">密码</label>
                <div className="relative">
                  <Lock className="absolute left-3 top-1/2 w-5 h-5 -translate-y-1/2 text-pearl/60" />
                  <input
                    type="password"
                    value={formData.password}
                    onChange={(e) => setFormData({ ...formData, password: e.target.value })}
                    className="py-3 pr-4 pl-11 w-full rounded-md border transition-all border-white/20 bg-black/40 text-alabaster focus:ring-2 focus:ring-gold/30 focus:border-gold placeholder:text-pearl/40"
                    placeholder="请输入密码"
                    required
                  />
                </div>
              </div>

              {error && (
                <div className="p-3 rounded-md border bg-destructive/10 border-destructive/20">
                  <p className="text-sm text-destructive">{error}</p>
                </div>
              )}

              <button
                type="submit"
                disabled={loading}
                className="flex gap-2 justify-center items-center py-3 w-full font-medium rounded-md shadow-md transition-all duration-300 bg-gold text-obsidian hover:shadow-[0_0_15px_rgba(200,160,100,0.4)] disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {loading ? (
                  <>
                    <Loader2 className="w-5 h-5 animate-spin" />
                    处理中...
                  </>
                ) : (
                  <>{isLogin ? '登录' : '创建账号'}</>
                )}
              </button>
            </form>

            <div className="mt-6 text-center">
              <button
                onClick={() => {
                  setIsLogin(!isLogin);
                  setError('');
                }}
                className="text-sm font-medium transition-all text-gold hover:text-gold/80 hover:drop-shadow-[0_0_8px_rgba(200,160,100,0.4)]"
              >
                {isLogin ? '没有账号？注册' : '已有账号？登录'}
              </button>
            </div>
          </div>
        </div>
      </div>
    </>
  );
}
