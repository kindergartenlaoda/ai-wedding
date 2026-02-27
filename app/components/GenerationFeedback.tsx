'use client';

import { useState, useEffect } from 'react';
import { Star, Send, Check } from 'lucide-react';

interface GenerationFeedbackProps {
  generationId: string;
}

export function GenerationFeedback({ generationId }: GenerationFeedbackProps) {
  const [rating, setRating] = useState(0);
  const [hoveredRating, setHoveredRating] = useState(0);
  const [comment, setComment] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [submitted, setSubmitted] = useState(false);
  const [existingRating, setExistingRating] = useState(0);

  useEffect(() => {
    fetch(`/api/generations/${generationId}/feedback`, { credentials: 'include' })
      .then((res) => res.json())
      .then((data) => {
        if (data.feedback) {
          setRating(data.feedback.rating);
          setExistingRating(data.feedback.rating);
          setComment(data.feedback.comment || '');
          setSubmitted(true);
        }
      })
      .catch(() => {});
  }, [generationId]);

  const handleSubmit = async () => {
    if (rating === 0) return;
    setSubmitting(true);

    try {
      const res = await fetch(`/api/generations/${generationId}/feedback`, {
        method: 'POST',
        credentials: 'include',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ rating, comment: comment.trim() || undefined }),
      });

      if (res.ok) {
        setSubmitted(true);
        setExistingRating(rating);
      }
    } catch {
      // Silently fail
    } finally {
      setSubmitting(false);
    }
  };

  const displayRating = hoveredRating || rating;

  const ratingLabels: Record<number, string> = {
    1: '不满意',
    2: '一般',
    3: '还不错',
    4: '满意',
    5: '非常满意',
  };

  return (
    <div className="p-6 bg-white/5 border border-white/10 rounded-sm">
      <h3 className="text-sm font-display font-medium text-alabaster tracking-wider uppercase mb-4">
        {submitted && existingRating > 0 ? '感谢您的反馈' : '对生成结果满意吗？'}
      </h3>

      <div className="flex items-center gap-1 mb-3">
        {[1, 2, 3, 4, 5].map((value) => (
          <button
            key={value}
            onClick={() => {
              setRating(value);
              setSubmitted(false);
            }}
            onMouseEnter={() => setHoveredRating(value)}
            onMouseLeave={() => setHoveredRating(0)}
            className="p-1 transition-transform duration-200 hover:scale-110"
          >
            <Star
              className={`w-6 h-6 transition-colors duration-200 ${
                value <= displayRating
                  ? 'text-gold fill-gold'
                  : 'text-pearl/30'
              }`}
            />
          </button>
        ))}
        {displayRating > 0 && (
          <span className="ml-3 text-xs text-pearl/60 tracking-wider">
            {ratingLabels[displayRating]}
          </span>
        )}
      </div>

      {rating > 0 && !submitted && (
        <div className="space-y-3 mt-4">
          <textarea
            value={comment}
            onChange={(e) => setComment(e.target.value)}
            placeholder="告诉我们您的想法（可选）"
            rows={2}
            maxLength={500}
            className="w-full px-4 py-2.5 border border-white/20 rounded-sm text-sm text-alabaster bg-black/40 focus:outline-none focus:border-gold transition-colors resize-none placeholder:text-pearl/30"
          />
          <button
            onClick={handleSubmit}
            disabled={submitting}
            className="inline-flex items-center gap-2 px-5 py-2.5 bg-gold text-obsidian rounded-sm text-xs font-medium tracking-wider uppercase hover:shadow-glow transition-all duration-500 disabled:opacity-50"
          >
            {submitting ? (
              '提交中...'
            ) : (
              <>
                <Send className="w-3.5 h-3.5" />
                提交反馈
              </>
            )}
          </button>
        </div>
      )}

      {submitted && existingRating > 0 && (
        <div className="flex items-center gap-2 mt-2 text-xs text-pearl/50">
          <Check className="w-3.5 h-3.5 text-gold" />
          <span>已提交，点击星星可修改评分</span>
        </div>
      )}
    </div>
  );
}
