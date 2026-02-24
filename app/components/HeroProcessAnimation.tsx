'use client';

import { useRef } from 'react';
import { gsap } from 'gsap';
import { useGSAP } from '@gsap/react';
import {
  UploadBox,
  StyleTagPanel,
  ScanningLine,
  SuccessBadge,
} from '@/components/shared-animations';

gsap.registerPlugin(useGSAP);

const HERO_STYLE_TAGS = ['极简黑白', '王家卫电影', '古典油画'];

export function HeroProcessAnimation() {
  const containerRef = useRef<HTMLDivElement>(null);
  const uploadBoxRef = useRef<HTMLDivElement>(null);
  const originalImageRef = useRef<HTMLDivElement>(null);
  const styleTagsRef = useRef<HTMLDivElement>(null);
  const scanningLineRef = useRef<HTMLDivElement>(null);
  const finalImageRef = useRef<HTMLDivElement>(null);
  const successBadgeRef = useRef<HTMLDivElement>(null);

  useGSAP(
    () => {
      gsap.set(
        [
          originalImageRef.current,
          styleTagsRef.current,
          finalImageRef.current,
          scanningLineRef.current,
          successBadgeRef.current,
        ],
        { autoAlpha: 0 }
      );
      gsap.set(styleTagsRef.current, { y: 20 });
      gsap.set(scanningLineRef.current, { top: '0%' });
      gsap.set(successBadgeRef.current, { scale: 0.9 });

      const tl = gsap.timeline({ repeat: -1, repeatDelay: 1.5 });

      tl.to(uploadBoxRef.current, {
        scale: 1.02,
        duration: 0.8,
        ease: 'sine.inOut',
        yoyo: true,
        repeat: 1,
      })
        .to(uploadBoxRef.current, {
          autoAlpha: 0,
          scale: 0.95,
          duration: 0.5,
        })
        .to(
          originalImageRef.current,
          { autoAlpha: 1, duration: 0.8, ease: 'power2.out' },
          '-=0.2'
        )

        .to(
          styleTagsRef.current,
          { autoAlpha: 1, y: 0, duration: 0.6, ease: 'back.out(1.7)' },
          '+=0.3'
        )
        .to(
          '[data-tag="王家卫电影"]',
          {
            backgroundColor: 'rgba(200, 160, 100, 0.15)',
            borderColor: 'rgba(200, 160, 100, 0.5)',
            color: '#D4AF37',
            duration: 0.4,
          },
          '+=0.6'
        )

        .to(
          styleTagsRef.current,
          { autoAlpha: 0, y: 10, duration: 0.4 },
          '+=0.6'
        )
        .to(scanningLineRef.current, { autoAlpha: 1, duration: 0.2 })
        .to(scanningLineRef.current, {
          top: '100%',
          duration: 2,
          ease: 'power1.inOut',
        })
        .to(
          finalImageRef.current,
          { autoAlpha: 1, duration: 2, ease: 'power1.inOut' },
          '-=2'
        )
        .to(scanningLineRef.current, { autoAlpha: 0, duration: 0.2 })

        .to(successBadgeRef.current, {
          autoAlpha: 1,
          scale: 1,
          duration: 0.6,
          ease: 'back.out(2)',
        })
        .to(
          [
            originalImageRef.current,
            finalImageRef.current,
            successBadgeRef.current,
          ],
          { autoAlpha: 0, duration: 0.8, delay: 2.5 }
        )
        .set(scanningLineRef.current, { top: '0%' })
        .to(uploadBoxRef.current, { autoAlpha: 1, scale: 1, duration: 0.5 });
    },
    { scope: containerRef }
  );

  return (
    <div
      ref={containerRef}
      className="relative w-full max-w-[360px] h-[480px] mx-auto bg-stone/5 border border-white/10 rounded-2xl overflow-hidden backdrop-blur-md shadow-[0_20px_50px_-12px_rgba(0,0,0,0.5)]"
    >
      <UploadBox ref={uploadBoxRef} />

      <div ref={originalImageRef} className="absolute inset-0">
        <img
          src="https://images.unsplash.com/photo-1554151228-14d9def656e4?q=80&w=800&auto=format&fit=crop"
          className="w-full h-full object-cover"
          alt="Original portrait"
        />
        <div className="absolute inset-0 bg-obsidian/30" />
      </div>

      <StyleTagPanel ref={styleTagsRef} tags={HERO_STYLE_TAGS} />

      <div ref={finalImageRef} className="absolute inset-0">
        <img
          src="https://images.unsplash.com/photo-1534528741775-53994a69daeb?q=80&w=800&auto=format&fit=crop"
          className="w-full h-full object-cover"
          alt="Cinematic masterpiece"
        />
      </div>

      <ScanningLine ref={scanningLineRef} />
      <SuccessBadge ref={successBadgeRef} />
    </div>
  );
}
