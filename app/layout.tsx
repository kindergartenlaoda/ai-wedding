import type { Metadata } from 'next';
import { Cormorant, Inter } from 'next/font/google';
import './globals.css';
import { Providers } from '@/components/Providers';
import { AuthProvider } from '@/contexts/AuthContext';
import HeaderBridge from './shared/HeaderBridge';
import { AnnouncementBanner } from './components/AnnouncementBanner';
import { ProgressBar } from '@/components/ui/progress-bar';
import { GITHUB_REPO_URL } from '@/lib/constants';

const cormorant = Cormorant({
  subsets: ['latin'],
  weight: ['300', '400', '500', '600', '700'],
  variable: '--font-cormorant',
  display: 'swap',
});

const inter = Inter({
  subsets: ['latin'],
  weight: ['400', '500', '600', '700'],
  variable: '--font-inter',
  display: 'swap',
});

export const metadata: Metadata = {
  title: '焕影 AI — AI 智能写真',
  description: '上传照片，AI 即刻生成婚纱照、证件照、艺术写真等多种风格高清影像',
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="zh-CN">
      <body className={`${cormorant.variable} ${inter.variable} font-body`}>
        <Providers>
          <AuthProvider>
            <ProgressBar />
            <div className="min-h-screen bg-white">
              <HeaderBridge />
              <AnnouncementBanner />
              {children}
              <footer className="bg-obsidian text-alabaster py-20 border-t border-white/10">
                <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
                  <div className="grid grid-cols-1 md:grid-cols-4 gap-12">
                    <div className="col-span-1 md:col-span-2">
                      <h3 className="text-2xl font-display font-medium mb-4 uppercase tracking-widest text-pearl">焕影 AI</h3>
                      <p className="text-pearl/60 mb-6 max-w-sm leading-relaxed font-light">
                        上传照片，AI 即刻生成婚纱照、证件照、艺术写真等多种风格高清影像。让每一张照片都焕发新生。
                      </p>
                    </div>
                    <div>
                      <h4 className="font-medium mb-6 uppercase tracking-widest text-sm text-gold">产品</h4>
                      <ul className="space-y-4 text-pearl/60 text-sm font-light">
                        <li><a href="/templates" className="hover:text-gold transition-colors">影棚系列</a></li>
                        <li><a href="/pricing" className="hover:text-gold transition-colors">创作方案</a></li>
                        <li><a href="/dashboard" className="hover:text-gold transition-colors">我的作品</a></li>
                      </ul>
                    </div>
                    <div>
                      <h4 className="font-medium mb-6 uppercase tracking-widest text-sm text-gold">公司</h4>
                      <ul className="space-y-4 text-pearl/60 text-sm font-light">
                        <li><a href="#" className="hover:text-gold transition-colors">关于我们</a></li>
                        <li><a href="#" className="hover:text-gold transition-colors">灵感周刊</a></li>
                        <li><a href="#" className="hover:text-gold transition-colors">联系方式</a></li>
                        <li><a href="#" className="hover:text-gold transition-colors">隐私协议</a></li>
                        <li>
                          <a
                            href={GITHUB_REPO_URL}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="hover:text-gold transition-colors inline-flex items-center gap-2"
                          >
                            GitHub 服务
                          </a>
                        </li>
                      </ul>
                    </div>
                  </div>
                  <div className="border-t border-white/5 mt-16 pt-8 text-center text-pearl/40 text-sm font-light tracking-wide">
                    <p>&copy; 2025 焕影 AI. 保留所有权利。</p>
                  </div>
                </div>
              </footer>
            </div>
          </AuthProvider>
        </Providers>
      </body>
    </html>
  );
}
