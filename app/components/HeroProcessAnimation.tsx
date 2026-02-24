'use client';

import { useRef } from 'react';
import { gsap } from 'gsap';
import { useGSAP } from '@gsap/react';
import { Upload, Sparkles, Wand2 } from 'lucide-react';

gsap.registerPlugin(useGSAP);

export function HeroProcessAnimation() {
    const containerRef = useRef<HTMLDivElement>(null);
    const uploadBoxRef = useRef<HTMLDivElement>(null);
    const originalImageRef = useRef<HTMLDivElement>(null);
    const styleTagsRef = useRef<HTMLDivElement>(null);
    const scanningLineRef = useRef<HTMLDivElement>(null);
    const finalImageRef = useRef<HTMLDivElement>(null);
    const successBadgeRef = useRef<HTMLDivElement>(null);

    useGSAP(() => {
        // Initial State Setup
        gsap.set([originalImageRef.current, styleTagsRef.current, finalImageRef.current, scanningLineRef.current, successBadgeRef.current], {
            autoAlpha: 0
        });

        gsap.set(styleTagsRef.current, { y: 20 });
        gsap.set(scanningLineRef.current, { top: '0%' });
        gsap.set(successBadgeRef.current, { scale: 0.9 });

        const tl = gsap.timeline({ repeat: -1, repeatDelay: 1.5 });

        // Phase 1: Upload (pulse a bit, then fade out)
        tl.to(uploadBoxRef.current, { scale: 1.02, duration: 0.8, ease: "sine.inOut", yoyo: true, repeat: 1 })
            .to(uploadBoxRef.current, { autoAlpha: 0, scale: 0.95, duration: 0.5 })
            // Original photo appears
            .to(originalImageRef.current, { autoAlpha: 1, duration: 0.8, ease: "power2.out" }, "-=0.2")

            // Phase 2: Style Selection
            .to(styleTagsRef.current, { autoAlpha: 1, y: 0, duration: 0.6, ease: "back.out(1.7)" }, "+=0.3")
            // Highlight "王家卫电影" target tag
            .to('.style-tag-target', {
                backgroundColor: 'rgba(200, 160, 100, 0.15)',
                borderColor: 'rgba(200, 160, 100, 0.5)',
                color: '#D4AF37',
                duration: 0.4
            }, "+=0.6")

            // Phase 3: Generation & Masterpiece
            .to(styleTagsRef.current, { autoAlpha: 0, y: 10, duration: 0.4 }, "+=0.6")
            // Show scanning line
            .to(scanningLineRef.current, { autoAlpha: 1, duration: 0.2 })
            // Move scanning line down while fading in final image
            .to(scanningLineRef.current, { top: '100%', duration: 2, ease: "power1.inOut" })
            .to(finalImageRef.current, { autoAlpha: 1, duration: 2, ease: "power1.inOut" }, "-=2")
            .to(scanningLineRef.current, { autoAlpha: 0, duration: 0.2 })
            // Success badge pops up
            .to(successBadgeRef.current, { autoAlpha: 1, scale: 1, duration: 0.6, ease: "back.out(2)" })
            // Hold for a moment, then fade everything out for reset
            .to([originalImageRef.current, finalImageRef.current, successBadgeRef.current], {
                autoAlpha: 0,
                duration: 0.8,
                delay: 2.5
            })
            // Reset upload box for next loop
            .set(scanningLineRef.current, { top: '0%' })
            .to(uploadBoxRef.current, { autoAlpha: 1, scale: 1, duration: 0.5 });
    }, { scope: containerRef });

    return (
        <div
            ref={containerRef}
            className="relative w-full max-w-[360px] h-[480px] mx-auto bg-stone/5 border border-white/10 rounded-2xl overflow-hidden backdrop-blur-md shadow-[0_20px_50px_-12px_rgba(0,0,0,0.5)]"
        >
            {/* Layer 1: Upload Box */}
            <div
                ref={uploadBoxRef}
                className="absolute inset-0 flex flex-col items-center justify-center border-2 border-dashed border-white/10 m-6 rounded-xl bg-white/5 transition-colors group-hover:bg-white/10"
            >
                <div className="w-16 h-16 rounded-full bg-white/5 flex items-center justify-center mb-6 shadow-lg">
                    <Upload className="w-8 h-8 text-pearl/50" />
                </div>
                <div className="text-base text-pearl/80 font-medium tracking-wide mb-2">上传原始照片</div>
                <div className="text-xs text-pearl/30 font-light">支持高分辨率人像</div>
            </div>

            {/* Layer 2: Original Image */}
            <div ref={originalImageRef} className="absolute inset-0">
                <img
                    src="https://images.unsplash.com/photo-1554151228-14d9def656e4?q=80&w=800&auto=format&fit=crop"
                    className="w-full h-full object-cover"
                    alt="Original portrait"
                />
                {/* Subtle dark overlay to make elements on top pop */}
                <div className="absolute inset-0 bg-obsidian/30" />
            </div>

            {/* Layer 3: Style Selection Panel */}
            <div
                ref={styleTagsRef}
                className="absolute bottom-8 left-6 right-6 p-5 rounded-xl bg-obsidian/80 backdrop-blur-lg border border-white/10 shadow-2xl"
            >
                <div className="text-xs text-pearl/70 mb-4 flex items-center gap-2 font-light tracking-wide">
                    <Wand2 className="w-3.5 h-3.5 text-gold" />
                    正在选择风格意境
                </div>
                <div className="flex flex-wrap gap-2.5">
                    <span className="px-3 py-1.5 rounded-sm bg-white/5 text-xs text-pearl border border-white/5 font-light">极简黑白</span>
                    <span className="style-tag-target px-3 py-1.5 rounded-sm bg-white/5 text-xs text-pearl border border-white/5 font-light transition-colors duration-300">王家卫电影</span>
                    <span className="px-3 py-1.5 rounded-sm bg-white/5 text-xs text-pearl border border-white/5 font-light">古典油画</span>
                </div>
            </div>

            {/* Layer 4: Final Image & Scanning Line */}
            <div ref={finalImageRef} className="absolute inset-0">
                <img
                    src="https://images.unsplash.com/photo-1534528741775-53994a69daeb?q=80&w=800&auto=format&fit=crop"
                    className="w-full h-full object-cover"
                    alt="Cinematic masterpiece"
                />
            </div>

            <div
                ref={scanningLineRef}
                className="absolute left-0 w-full h-[2px] bg-gradient-to-r from-transparent via-gold to-transparent shadow-[0_0_20px_2px_rgba(200,160,100,0.6)] z-20"
            />

            {/* Layer 5: Success Badge */}
            <div
                ref={successBadgeRef}
                className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 bg-obsidian/90 backdrop-blur-md border border-gold/30 text-gold px-6 py-3 rounded-full flex items-center gap-2.5 shadow-2xl z-30"
            >
                <Sparkles className="w-4 h-4" />
                <span className="text-sm font-medium tracking-[0.2em]">杰作已成</span>
            </div>
        </div>
    );
}
