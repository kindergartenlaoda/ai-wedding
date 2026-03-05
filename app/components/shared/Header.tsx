import { Camera, Sparkles, LogIn, LogOut, User, Menu, X, Github, Settings } from 'lucide-react';
import { useState } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { AuthModal } from './AuthModal';
import { GITHUB_REPO_URL } from '@/lib/constants';

interface HeaderProps {
  onNavigate: (page: string) => void;
  currentPage: string;
}

export function Header({ onNavigate, currentPage }: HeaderProps) {
  const { user, profile, signOut } = useAuth();
  const [showAuthModal, setShowAuthModal] = useState(false);
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  const handleSignOut = async () => {
    await signOut();
    onNavigate('home');
  };

  return (
    <>
      <header className="sticky top-0 z-50 border-b shadow-sm backdrop-blur-md bg-obsidian/80 border-white/10">
        <div className="px-4 mx-auto max-w-7xl sm:px-6 lg:px-8">
          <div className="flex justify-between items-center h-18">
            <div className="flex gap-8 items-center">
              <button
                onClick={() => onNavigate('home')}
                className="flex items-center gap-2.5 group"
              >
                <div className="flex justify-center items-center w-9 h-9 bg-obsidian rounded-sm shadow-sm border border-white/10 group-hover:border-gold/30 transition-colors duration-500">
                  <Camera className="w-5 h-5 text-gold group-hover:scale-110 transition-transform duration-500" />
                </div>
                <span className="text-xl font-medium tracking-wide font-display text-alabaster uppercase group-hover:text-gold transition-colors duration-500">
                  焕影 AI
                </span>
              </button>

              <nav className="hidden gap-8 items-center md:flex">
                <button
                  onClick={() => onNavigate('create')}
                  className={`text-sm font-medium tracking-wide transition-colors duration-200 uppercase ${currentPage === 'create' || currentPage === 'templates' ? 'text-gold' : 'text-pearl/70 hover:text-alabaster'
                    }`}
                >
                  创建
                </button>
                <button
                  onClick={() => onNavigate('gallery')}
                  className={`text-sm font-medium tracking-wide transition-colors duration-200 uppercase ${currentPage === 'gallery' || currentPage === 'testimonials' ? 'text-gold' : 'text-pearl/70 hover:text-alabaster'
                    }`}
                >
                  画廊
                </button>
                <button
                  onClick={() => onNavigate('pricing')}
                  className={`text-sm font-medium tracking-wide transition-colors duration-200 uppercase ${currentPage === 'pricing' ? 'text-gold' : 'text-pearl/70 hover:text-alabaster'
                    }`}
                >
                  定价
                </button>
                {user && (
                  <button
                    onClick={() => onNavigate('dashboard')}
                    className={`text-sm font-medium tracking-wide transition-colors duration-200 uppercase ${currentPage === 'dashboard' ? 'text-gold' : 'text-pearl/70 hover:text-alabaster'
                      }`}
                  >
                    我的作品
                  </button>
                )}
              </nav>
            </div>

            <div className="hidden gap-4 items-center md:flex">
              <a
                href={GITHUB_REPO_URL}
                target="_blank"
                rel="noopener noreferrer"
                className="p-2 rounded-sm transition-all duration-200 text-pearl/70 hover:text-alabaster hover:bg-white/5"
                aria-label="GitHub 仓库"
              >
                <Github className="w-5 h-5" />
              </a>
              {user ? (
                <>
                  <button
                    onClick={() => onNavigate('generate-single')}
                    className={`text-xs tracking-wider uppercase font-medium px-3 py-2 rounded-sm transition-all duration-200 ${currentPage === 'generate-single' ? 'text-gold bg-white/5' : 'text-pearl/70 hover:text-alabaster hover:bg-white/5'}`}
                  >
                    快速生成
                  </button>
                  <div className="flex items-center gap-2.5 px-4 py-2 bg-obsidian border border-white/10 rounded-sm shadow-[0_4px_20px_rgba(0,0,0,0.5)]">
                    <Sparkles className="w-4 h-4 text-gold" />
                    <span className="text-sm font-medium text-alabaster">{profile?.credits || 0}</span>
                  </div>
                  <button
                    onClick={() => onNavigate('profile')}
                    className="flex gap-2 items-center px-3 py-2 rounded-sm transition-all duration-200 text-pearl/70 hover:text-alabaster hover:bg-white/5 uppercase text-xs tracking-wider font-medium"
                  >
                    <User className="w-4 h-4" />
                    <span>{profile?.full_name || '账户'}</span>
                  </button>
                  {profile?.role === 'admin' && (
                    <a
                      href="/admin/templates"
                      className="flex gap-1.5 items-center px-3 py-2 rounded-sm transition-all duration-200 text-pearl/70 hover:text-alabaster hover:bg-white/5 uppercase text-xs tracking-wider font-medium"
                    >
                      <Settings className="w-3.5 h-3.5" />
                    </a>
                  )}
                  <button
                    onClick={handleSignOut}
                    className="flex gap-2 items-center px-3 py-2 rounded-sm transition-all duration-200 text-pearl/70 hover:text-alabaster hover:bg-white/5 uppercase text-xs tracking-wider font-medium"
                  >
                    <LogOut className="w-4 h-4" />
                  </button>
                </>
              ) : (
                <button
                  onClick={() => setShowAuthModal(true)}
                  className="flex items-center gap-2 px-6 py-2.5 bg-gold text-obsidian rounded-sm transition-all duration-500 shadow-[0_0_15px_rgba(200,160,100,0.3)] hover:-translate-y-px hover:shadow-[0_0_20px_rgba(200,160,100,0.5)] font-medium uppercase text-xs tracking-wider"
                >
                  <LogIn className="w-4 h-4" />
                  开始使用
                </button>
              )}
            </div>

            <button
              onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
              className="p-2 transition-colors md:hidden text-pearl hover:text-gold"
              aria-label={mobileMenuOpen ? '关闭菜单' : '打开菜单'}
              aria-expanded={mobileMenuOpen}
            >
              {mobileMenuOpen ? <X className="w-6 h-6" /> : <Menu className="w-6 h-6" />}
            </button>
          </div>
        </div>

        {mobileMenuOpen && (
          <div className="border-t md:hidden border-white/10 bg-obsidian shadow-2xl">
            <nav className="px-4 py-4 space-y-2">
              <button
                onClick={() => { onNavigate('create'); setMobileMenuOpen(false); }}
                className="px-4 py-3 w-full text-xs tracking-wider uppercase font-medium text-left rounded-sm transition-colors text-pearl/70 hover:text-alabaster hover:bg-white/5"
              >
                创建
              </button>
              <button
                onClick={() => { onNavigate('gallery'); setMobileMenuOpen(false); }}
                className="px-4 py-3 w-full text-xs tracking-wider uppercase font-medium text-left rounded-sm transition-colors text-pearl/70 hover:text-alabaster hover:bg-white/5"
              >
                画廊
              </button>
              <button
                onClick={() => { onNavigate('pricing'); setMobileMenuOpen(false); }}
                className="px-4 py-3 w-full text-xs tracking-wider uppercase font-medium text-left rounded-sm transition-colors text-pearl/70 hover:text-alabaster hover:bg-white/5"
              >
                定价
              </button>
              {user ? (
                <>
                  <button
                    onClick={() => { onNavigate('generate-single'); setMobileMenuOpen(false); }}
                    className="px-4 py-3 w-full text-xs tracking-wider uppercase font-medium text-left rounded-sm transition-colors text-pearl/70 hover:text-alabaster hover:bg-white/5"
                  >
                    快速生成
                  </button>
                  <div className="px-4 py-2">
                    <div className="flex items-center gap-2 px-3 py-1.5 bg-white/5 border border-white/10 rounded-sm">
                      <Sparkles className="w-4 h-4 text-gold" />
                      <span className="text-sm font-medium text-alabaster">{profile?.credits || 0} 积分</span>
                    </div>
                  </div>
                  <button
                    onClick={() => { onNavigate('dashboard'); setMobileMenuOpen(false); }}
                    className="px-4 py-3 w-full text-xs tracking-wider uppercase font-medium text-left rounded-sm transition-colors text-pearl/70 hover:text-alabaster hover:bg-white/5"
                  >
                    我的作品
                  </button>
                  {profile?.role === 'admin' && (
                    <a
                      href="/admin/templates"
                      onClick={() => setMobileMenuOpen(false)}
                      className="flex gap-2 items-center px-4 py-3 w-full text-xs tracking-wider uppercase font-medium text-left rounded-sm transition-colors text-pearl/70 hover:text-alabaster hover:bg-white/5"
                    >
                      <Settings className="w-4 h-4" />
                      <span>管理后台</span>
                    </a>
                  )}
                  <button
                    onClick={handleSignOut}
                    className="px-4 py-3 w-full text-xs tracking-wider uppercase font-medium text-left rounded-sm transition-colors text-red-400 hover:bg-red-400/10"
                  >
                    退出登录
                  </button>
                </>
              ) : (
                <button
                  onClick={() => { setShowAuthModal(true); setMobileMenuOpen(false); }}
                  className="px-4 py-3 w-full font-medium rounded-sm transition-all bg-gold text-obsidian hover:shadow-[0_0_15px_rgba(200,160,100,0.4)] text-xs tracking-wider uppercase mt-4"
                >
                  开始使用
                </button>
              )}
            </nav>
          </div>
        )}
      </header>

      {showAuthModal && <AuthModal onClose={() => setShowAuthModal(false)} />}
    </>
  );
}
