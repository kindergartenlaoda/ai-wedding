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
      <header className="sticky top-0 z-50 border-b shadow-sm backdrop-blur-md bg-alabaster/90 border-stone/10">
        <div className="px-4 mx-auto max-w-7xl sm:px-6 lg:px-8">
          <div className="flex justify-between items-center h-18">
            <div className="flex gap-8 items-center">
              <button
                onClick={() => onNavigate('home')}
                className="flex items-center gap-2.5"
              >
                <div className="flex justify-center items-center w-9 h-9 bg-obsidian rounded-sm shadow-sm border border-stone/20">
                  <Camera className="w-5 h-5 text-gold" />
                </div>
                <span className="text-xl font-medium tracking-wide font-display text-obsidian uppercase">
                  AI 图片生成
                </span>
              </button>

              <nav className="hidden gap-8 items-center md:flex">
                <button
                  onClick={() => onNavigate('templates')}
                  className={`text-sm font-medium tracking-wide transition-colors duration-200 uppercase ${currentPage === 'templates' ? 'text-gold' : 'text-stone hover:text-obsidian'
                    }`}
                >
                  模板
                </button>
                <button
                  onClick={() => onNavigate('create')}
                  className={`text-sm font-medium tracking-wide transition-colors duration-200 uppercase ${currentPage === 'create' ? 'text-gold' : 'text-stone hover:text-obsidian'
                    }`}
                >
                  创建
                </button>
                <button
                  onClick={() => onNavigate('generate-single')}
                  className={`text-sm font-medium tracking-wide transition-colors duration-200 uppercase ${currentPage === 'generate-single' ? 'text-gold' : 'text-stone hover:text-obsidian'
                    }`}
                >
                  生成单张
                </button>
                <button
                  onClick={() => onNavigate('gallery')}
                  className={`text-sm font-medium tracking-wide transition-colors duration-200 uppercase ${currentPage === 'gallery' ? 'text-gold' : 'text-stone hover:text-obsidian'
                    }`}
                >
                  画廊
                </button>
                <button
                  onClick={() => onNavigate('pricing')}
                  className={`text-sm font-medium tracking-wide transition-colors duration-200 uppercase ${currentPage === 'pricing' ? 'text-gold' : 'text-stone hover:text-obsidian'
                    }`}
                >
                  价格
                </button>
                <a
                  href="/testimonials"
                  className={`text-sm font-medium tracking-wide transition-colors duration-200 uppercase ${currentPage === 'testimonials' ? 'text-gold' : 'text-stone hover:text-obsidian'
                    }`}
                >
                  案例
                </a>
                {user && (
                  <button
                    onClick={() => onNavigate('dashboard')}
                    className={`text-sm font-medium tracking-wide transition-colors duration-200 uppercase ${currentPage === 'dashboard' ? 'text-gold' : 'text-stone hover:text-obsidian'
                      }`}
                  >
                    我的项目
                  </button>
                )}
                {profile?.role === 'admin' && (
                  <a
                    href="/admin/templates"
                    className={`text-sm font-medium tracking-wide transition-colors duration-200 uppercase flex items-center gap-1.5 ${
                      currentPage === 'admin' ? 'text-gold' : 'text-stone hover:text-obsidian'
                    }`}
                  >
                    <Settings className="w-3.5 h-3.5" />
                    管理后台
                  </a>
                )}
              </nav>
            </div>

            <div className="hidden gap-4 items-center md:flex">
              <a
                href={GITHUB_REPO_URL}
                target="_blank"
                rel="noopener noreferrer"
                className="p-2 rounded-sm transition-all duration-200 text-stone hover:text-obsidian hover:bg-stone/5"
                aria-label="GitHub 仓库"
              >
                <Github className="w-5 h-5" />
              </a>
              {user ? (
                <>
                  <div className="flex items-center gap-2.5 px-4 py-2 bg-alabaster border border-stone/20 rounded-sm shadow-sm">
                    <Sparkles className="w-4 h-4 text-gold" />
                    <span className="text-sm font-medium text-obsidian">{profile?.credits || 0}</span>
                  </div>
                  <button
                    onClick={() => onNavigate('profile')}
                    className="flex gap-2 items-center px-4 py-2 rounded-sm transition-all duration-200 text-stone hover:text-obsidian hover:bg-stone/5 uppercase text-xs tracking-wider font-medium"
                  >
                    <User className="w-4 h-4" />
                    <span>{profile?.full_name || '账户'}</span>
                  </button>
                  <button
                    onClick={handleSignOut}
                    className="flex gap-2 items-center px-4 py-2 rounded-sm transition-all duration-200 text-stone hover:text-obsidian hover:bg-stone/5 uppercase text-xs tracking-wider font-medium"
                  >
                    <LogOut className="w-4 h-4" />
                    <span>退出</span>
                  </button>
                </>
              ) : (
                <button
                  onClick={() => setShowAuthModal(true)}
                  className="flex items-center gap-2 px-6 py-2.5 bg-obsidian text-alabaster rounded-sm hover:bg-gold hover:text-obsidian transition-all duration-500 shadow-sm hover:shadow-md font-medium uppercase text-xs tracking-wider"
                >
                  <LogIn className="w-4 h-4" />
                  开始使用
                </button>
              )}
            </div>

            <button
              onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
              className="p-2 transition-colors md:hidden text-stone hover:text-navy"
              aria-label={mobileMenuOpen ? '关闭菜单' : '打开菜单'}
              aria-expanded={mobileMenuOpen}
            >
              {mobileMenuOpen ? <X className="w-6 h-6" /> : <Menu className="w-6 h-6" />}
            </button>
          </div>
        </div>

        {mobileMenuOpen && (
          <div className="border-t md:hidden border-stone/10 bg-alabaster">
            <nav className="px-4 py-4 space-y-2">
              <button
                onClick={() => {
                  onNavigate('templates');
                  setMobileMenuOpen(false);
                }}
                className="px-4 py-3 w-full text-xs tracking-wider uppercase font-medium text-left rounded-sm transition-colors text-stone hover:text-obsidian hover:bg-stone/5"
              >
                模板
              </button>
              <button
                onClick={() => {
                  onNavigate('create');
                  setMobileMenuOpen(false);
                }}
                className="px-4 py-3 w-full text-xs tracking-wider uppercase font-medium text-left rounded-sm transition-colors text-stone hover:text-obsidian hover:bg-stone/5"
              >
                创建
              </button>
              <button
                onClick={() => {
                  onNavigate('generate-single');
                  setMobileMenuOpen(false);
                }}
                className="px-4 py-3 w-full text-xs tracking-wider uppercase font-medium text-left rounded-sm transition-colors text-stone hover:text-obsidian hover:bg-stone/5"
              >
                生成单张
              </button>
              <button
                onClick={() => {
                  onNavigate('gallery');
                  setMobileMenuOpen(false);
                }}
                className="px-4 py-3 w-full text-xs tracking-wider uppercase font-medium text-left rounded-sm transition-colors text-stone hover:text-obsidian hover:bg-stone/5"
              >
                画廊
              </button>
              <button
                onClick={() => {
                  onNavigate('pricing');
                  setMobileMenuOpen(false);
                }}
                className="px-4 py-3 w-full text-xs tracking-wider uppercase font-medium text-left rounded-sm transition-colors text-stone hover:text-obsidian hover:bg-stone/5"
              >
                价格
              </button>
              <a
                href="/testimonials"
                onClick={() => setMobileMenuOpen(false)}
                className="block px-4 py-3 w-full text-xs tracking-wider uppercase font-medium text-left rounded-sm transition-colors text-stone hover:text-obsidian hover:bg-stone/5"
              >
                案例
              </a>
              <a
                href={GITHUB_REPO_URL}
                target="_blank"
                rel="noopener noreferrer"
                onClick={() => setMobileMenuOpen(false)}
                className="flex gap-2 items-center px-4 py-3 w-full text-xs tracking-wider uppercase font-medium text-left rounded-sm transition-colors text-stone hover:text-obsidian hover:bg-stone/5"
              >
                <Github className="w-4 h-4" />
                <span>GitHub</span>
              </a>
              {user ? (
                <>
                  <div className="px-4 py-2">
                    <div className="flex items-center gap-2 px-3 py-1.5 bg-stone/5 border border-stone/20 rounded-sm">
                      <Sparkles className="w-4 h-4 text-gold" />
                      <span className="text-sm font-medium text-obsidian">{profile?.credits || 0} 积分</span>
                    </div>
                  </div>
                  <button
                    onClick={() => {
                      onNavigate('dashboard');
                      setMobileMenuOpen(false);
                    }}
                    className="px-4 py-3 w-full text-xs tracking-wider uppercase font-medium text-left rounded-sm transition-colors text-stone hover:text-obsidian hover:bg-stone/5"
                  >
                    我的项目
                  </button>
                  {profile?.role === 'admin' && (
                    <a
                      href="/admin/templates"
                      onClick={() => setMobileMenuOpen(false)}
                      className="flex gap-2 items-center px-4 py-3 w-full text-xs tracking-wider uppercase font-medium text-left rounded-sm transition-colors text-stone hover:text-obsidian hover:bg-stone/5"
                    >
                      <Settings className="w-4 h-4" />
                      <span>管理后台</span>
                    </a>
                  )}
                  <button
                    onClick={handleSignOut}
                    className="px-4 py-3 w-full text-xs tracking-wider uppercase font-medium text-left rounded-sm transition-colors text-destructive hover:bg-destructive/10"
                  >
                    退出登录
                  </button>
                </>
              ) : (
                <button
                  onClick={() => {
                    setShowAuthModal(true);
                    setMobileMenuOpen(false);
                  }}
                  className="px-4 py-3 w-full font-medium rounded-sm transition-colors bg-obsidian text-alabaster hover:bg-gold hover:text-obsidian text-xs tracking-wider uppercase mt-4"
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
