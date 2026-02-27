import { X, Copy, Download, Share2, Check, Gift } from 'lucide-react';
import { useMemo, useState } from 'react';
import Image from 'next/image';
import { generateShareText, copyShareLink, shareToSocial, downloadShareCard, generateShareCardImage } from '@/lib/share-card';
import { useAuth } from '@/contexts/AuthContext';

interface ShareModalProps {
  projectName: string;
  templateName: string;
  imageUrl: string;
  imageCount: number;
  shareUrl: string;
  onClose: () => void;
}

export function ShareModal({
  projectName,
  templateName,
  imageUrl,
  imageCount,
  shareUrl,
  onClose,
}: ShareModalProps) {
  const { profile } = useAuth();
  const [copied, setCopied] = useState(false);
  const [downloading, setDownloading] = useState(false);
  const inviteCode = profile?.invite_code ?? undefined;

  const finalShareUrl = useMemo(() => {
    if (!shareUrl) return shareUrl;
    if (!inviteCode) return shareUrl;
    return shareUrl.includes('?') ? `${shareUrl}&inv=${inviteCode}` : `${shareUrl}?inv=${inviteCode}`;
  }, [shareUrl, inviteCode]);

  const shareText = generateShareText({
    projectName,
    templateName,
    imageUrl,
    imageCount,
    inviteCode: inviteCode ?? undefined,
    siteUrl: typeof window !== 'undefined' ? window.location.origin : undefined,
  });

  const handleCopyLink = async () => {
    const success = await copyShareLink(finalShareUrl);
    if (success) {
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    }
  };

  const handleCopyText = async () => {
    const success = await copyShareLink(shareText);
    if (success) {
      alert('分享文案已复制！');
    }
  };

  // 下载逻辑在下方按钮的 onClick 内联处理

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm p-4">
      <div className="bg-obsidian rounded-sm shadow-2xl max-w-2xl w-full max-h-[90vh] overflow-y-auto border border-white/10">
        {/* 头部 */}
        <div className="flex items-center justify-between p-6 border-b border-white/10 bg-white/5">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-white/5 rounded-sm flex items-center justify-center border border-white/10">
              <Share2 className="w-5 h-5 text-gold opacity-80" />
            </div>
            <div>
              <h2 className="text-xl font-display font-medium text-alabaster tracking-wider">分享作品</h2>
              <p className="text-sm text-pearl/60 font-light">分享您的精美作品</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="w-8 h-8 rounded-sm hover:bg-white/10 transition-colors flex items-center justify-center"
            aria-label="关闭"
          >
            <X className="w-5 h-5 text-pearl/60 hover:text-alabaster" />
          </button>
        </div>

        {/* 预览卡片 */}
        <div className="p-6 space-y-6">
          <div className="bg-black/40 rounded-sm p-6 border border-white/5 shadow-inner">
            <div className="aspect-video relative rounded-sm overflow-hidden mb-4 border border-white/10">
              <Image
                src={imageUrl}
                alt={projectName}
                fill
                className="object-cover"
                sizes="(max-width: 768px) 100vw, 600px"
              />
              {/* 水印 */}
              <div className="absolute bottom-4 right-4 bg-obsidian/80 backdrop-blur-md px-4 py-2 rounded-sm shadow-xl border border-white/10">
                <p className="text-sm font-medium tracking-widest uppercase text-pearl/80">焕影 AI</p>
              </div>
            </div>
            <div className="space-y-2">
              <h3 className="text-lg font-display font-medium text-alabaster tracking-wider">{projectName}</h3>
              <p className="text-sm text-pearl/60 font-light tracking-wide">
                {templateName} 风格 • {imageCount} 张照片
              </p>
              {inviteCode && (
                <div className="mt-4 inline-flex items-center gap-2 px-3 py-1.5 bg-white/5 border border-white/10 rounded-sm">
                  <Gift className="w-4 h-4 text-gold opacity-80" />
                  <span className="text-xs text-pearl tracking-widest uppercase">我的邀请码：<span className="text-gold font-medium">{inviteCode}</span></span>
                </div>
              )}
            </div>
          </div>

          {/* 分享文案 */}
          <div>
            <div className="flex items-center justify-between mb-2">
              <label className="text-sm font-medium text-pearl/60 tracking-wider">分享文案</label>
              <button
                onClick={handleCopyText}
                className="text-xs text-gold hover:text-gold/80 font-medium tracking-widest uppercase"
              >
                复制文案
              </button>
            </div>
            <div className="bg-white/5 rounded-sm p-4 border border-white/10 shadow-inner">
              <p className="text-sm text-alabaster font-light leading-relaxed whitespace-pre-wrap">{shareText}</p>
            </div>
          </div>

          {/* 分享链接 */}
          <div>
            <label className="text-sm font-medium text-pearl/60 mb-2 block tracking-wider">分享链接</label>
            <div className="flex items-center gap-2">
              <input
                type="text"
                value={finalShareUrl}
                readOnly
                className="flex-1 px-4 py-3 bg-black/40 border border-white/10 rounded-sm text-sm text-pearl font-light focus:outline-none focus:border-white/20 transition-colors"
              />
              <button
                onClick={handleCopyLink}
                className={`px-6 py-3 rounded-sm font-medium tracking-widest text-xs uppercase transition-all duration-500 flex items-center gap-2 shadow-md ${copied
                  ? 'bg-green-500/20 text-green-400 border border-green-500/30'
                  : 'bg-gold border border-gold text-obsidian hover:shadow-[0_0_15px_rgba(200,160,100,0.3)]'
                  }`}
              >
                {copied ? (
                  <>
                    <Check className="w-4 h-4" />
                    已复制
                  </>
                ) : (
                  <>
                    <Copy className="w-4 h-4" />
                    复制
                  </>
                )}
              </button>
            </div>
          </div>

          {/* 社交平台分享 */}
          <div>
            <label className="text-sm font-medium text-pearl/60 mb-3 block tracking-wider">分享到社交平台</label>
            <div className="grid grid-cols-4 gap-3">
              <button
                onClick={() => shareToSocial('weibo', {
                  url: finalShareUrl,
                  title: shareText,
                  image: imageUrl,
                })}
                className="flex flex-col items-center gap-2 p-4 bg-white/5 hover:bg-white/10 rounded-sm transition-colors border border-white/10 group"
              >
                <div className="w-10 h-10 bg-black/40 border border-red-500/20 rounded-full flex items-center justify-center text-red-400 font-bold group-hover:scale-110 transition-transform duration-500">
                  微
                </div>
                <span className="text-[10px] text-pearl/60 font-medium tracking-widest uppercase group-hover:text-alabaster transition-colors">微博</span>
              </button>
              <button
                onClick={() => shareToSocial('wechat', {
                  url: finalShareUrl,
                  title: shareText,
                })}
                className="flex flex-col items-center gap-2 p-4 bg-white/5 hover:bg-white/10 rounded-sm transition-colors border border-white/10 group"
              >
                <div className="w-10 h-10 bg-black/40 border border-green-500/20 rounded-full flex items-center justify-center text-green-400 font-bold group-hover:scale-110 transition-transform duration-500">
                  微
                </div>
                <span className="text-[10px] text-pearl/60 font-medium tracking-widest uppercase group-hover:text-alabaster transition-colors">微信</span>
              </button>
              <button
                onClick={() => shareToSocial('qq', {
                  url: finalShareUrl,
                  title: shareText,
                  description: `${templateName} 风格作品`,
                  image: imageUrl,
                })}
                className="flex flex-col items-center gap-2 p-4 bg-white/5 hover:bg-white/10 rounded-sm transition-colors border border-white/10 group"
              >
                <div className="w-10 h-10 bg-black/40 border border-blue-500/20 rounded-full flex items-center justify-center text-blue-400 font-bold group-hover:scale-110 transition-transform duration-500">
                  Q
                </div>
                <span className="text-[10px] text-pearl/60 font-medium tracking-widest uppercase group-hover:text-alabaster transition-colors">QQ</span>
              </button>
              <button
                onClick={() => shareToSocial('twitter', {
                  url: finalShareUrl,
                  title: shareText,
                })}
                className="flex flex-col items-center gap-2 p-4 bg-white/5 hover:bg-white/10 rounded-sm transition-colors border border-white/10 group"
              >
                <div className="w-10 h-10 bg-black/40 border border-blue-400/20 rounded-full flex items-center justify-center text-blue-300 font-bold group-hover:scale-110 transition-transform duration-500">
                  𝕏
                </div>
                <span className="text-[10px] text-pearl/60 font-medium tracking-widest uppercase group-hover:text-alabaster transition-colors">Twitter</span>
              </button>
            </div>
          </div>

          <button
            onClick={async () => {
              try {
                setDownloading(true);
                const card = await generateShareCardImage({
                  projectName,
                  templateName,
                  imageUrl,
                  imageCount,
                  inviteCode: inviteCode ?? undefined,
                  siteUrl: typeof window !== 'undefined' ? window.location.origin : undefined,
                });
                await downloadShareCard(card, projectName);
              } catch {
                alert('生成/下载分享图失败，请重试');
              } finally {
                setDownloading(false);
              }
            }}
            disabled={downloading}
            className="w-full px-6 py-3.5 bg-white/5 border border-white/10 text-alabaster rounded-sm hover:bg-white/10 transition-all duration-500 font-medium tracking-widest text-xs uppercase flex items-center justify-center gap-2 disabled:opacity-50 shadow-sm"
          >
            <Download className="w-4 h-4" />
            {downloading ? '生成中...' : '生成并下载分享图（含邀请码）'}
          </button>
        </div>
      </div>
    </div>
  );
}
