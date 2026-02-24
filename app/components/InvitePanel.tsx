'use client';

import { useState } from 'react';
import { Copy, Check, Users, Gift } from 'lucide-react';

interface InvitePanelProps {
  inviteCode: string;
  inviteCount: number;
  rewardCredits: number;
}

export function InvitePanel({ inviteCode, inviteCount, rewardCredits }: InvitePanelProps) {
  const [copied, setCopied] = useState(false);

  const inviteUrl = typeof window !== 'undefined'
    ? `${window.location.origin}?inv=${inviteCode}`
    : '';

  const handleCopy = async () => {
    try {
      await navigator.clipboard.writeText(inviteUrl);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      // fallback
    }
  };

  return (
    <div className="p-6 bg-stone/5 rounded-sm border border-stone/10">
      <div className="flex items-center gap-3 mb-4">
        <div className="w-10 h-10 bg-obsidian rounded-sm flex items-center justify-center">
          <Users className="w-5 h-5 text-gold" />
        </div>
        <div>
          <h3 className="font-display font-medium text-obsidian tracking-wider uppercase text-sm">
            邀请好友
          </h3>
          <p className="text-xs text-stone font-light">邀请好友注册，双方均可获得积分奖励</p>
        </div>
      </div>

      {/* Invite code display */}
      <div className="flex items-center gap-2 mb-4">
        <div className="flex-1 px-4 py-2.5 bg-alabaster border border-stone/15 rounded-sm text-sm font-mono text-obsidian tracking-wider truncate">
          {inviteCode}
        </div>
        <button
          onClick={handleCopy}
          aria-live="polite"
          className="flex items-center gap-1.5 px-4 py-2.5 bg-obsidian text-alabaster rounded-sm hover:bg-gold hover:text-obsidian transition-colors duration-500 text-xs tracking-wider uppercase font-medium whitespace-nowrap"
        >
          {copied ? (
            <>
              <Check className="w-3.5 h-3.5" />
              已复制
            </>
          ) : (
            <>
              <Copy className="w-3.5 h-3.5" />
              复制链接
            </>
          )}
        </button>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 gap-3">
        <div className="p-3 bg-alabaster border border-stone/10 rounded-sm text-center">
          <div className="flex items-center justify-center gap-1.5 mb-1">
            <Users className="w-3.5 h-3.5 text-stone" />
            <span className="text-xs text-stone tracking-wider uppercase">已邀请</span>
          </div>
          <span className="text-lg font-display font-medium text-obsidian">{inviteCount}</span>
          <span className="text-xs text-stone ml-1">人</span>
        </div>
        <div className="p-3 bg-alabaster border border-stone/10 rounded-sm text-center">
          <div className="flex items-center justify-center gap-1.5 mb-1">
            <Gift className="w-3.5 h-3.5 text-stone" />
            <span className="text-xs text-stone tracking-wider uppercase">奖励积分</span>
          </div>
          <span className="text-lg font-display font-medium text-gold">{rewardCredits}</span>
          <span className="text-xs text-stone ml-1">分</span>
        </div>
      </div>
    </div>
  );
}
