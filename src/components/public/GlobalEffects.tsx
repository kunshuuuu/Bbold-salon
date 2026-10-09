import React, { useEffect, useRef, useState } from 'react';
import { useLocation } from 'react-router-dom';
import { motion } from 'framer-motion';
import {
  Scissors,
  Sparkles,
  Heart,
  Star,
  Crown,
  Gem,
  Wand2,
  Award,
  Flame,
} from 'lucide-react';
import { ROOM_SWATCHES } from '../../config/site';
import type { RoomId } from '../../types/database';

export function usePrefersReducedMotion(): boolean {
  const [reduced, setReduced] = useState(false);

  useEffect(() => {
    if (typeof window === 'undefined') return;
    const mq = window.matchMedia('(prefers-reduced-motion: reduce)');
    const navConn = (navigator as unknown as { connection?: { saveData?: boolean } }).connection;
    setReduced(mq.matches || Boolean(navConn?.saveData));

    const listener = (e: MediaQueryListEvent) => setReduced(e.matches);
    mq.addEventListener('change', listener);
    return () => mq.removeEventListener('change', listener);
  }, []);

  return reduced;
}

// =============================================================================
// 1. PRELOADER (2.6s, once per session; skipped in /book and /admin)
// =============================================================================

const PRELOADER_SESSION_KEY = 'bbold_preloader_seen_v1';
let preloaderCurrentlyActive = false;
const preloaderListeners = new Set<() => void>();

function notifyPreloaderComplete() {
  preloaderCurrentlyActive = false;
  preloaderListeners.forEach((cb) => cb());
}

export function usePreloaderReady(): boolean {
  const [ready, setReady] = useState(() => !preloaderCurrentlyActive);

  useEffect(() => {
    if (!preloaderCurrentlyActive) {
      setReady(true);
      return;
    }
    const handleDone = () => setReady(true);
    preloaderListeners.add(handleDone);
    return () => {
      preloaderListeners.delete(handleDone);
    };
  }, []);

  return ready;
}

export const Preloader: React.FC = () => {
  const location = useLocation();
  const reducedMotion = usePrefersReducedMotion();
  const [visible, setVisible] = useState(() => {
    if (typeof window === 'undefined') return false;
    if (
      window.location.pathname.startsWith('/book') ||
      window.location.pathname.startsWith('/admin')
    ) {
      preloaderCurrentlyActive = false;
      return false;
    }
    const shouldShow = !window.sessionStorage.getItem(PRELOADER_SESSION_KEY);
    preloaderCurrentlyActive = shouldShow;
    return shouldShow;
  });
  const [phase, setPhase] = useState<'draw' | 'crimson-swipe' | 'paper-wipe'>('draw');

  useEffect(() => {
    if (!visible) {
      notifyPreloaderComplete();
      return;
    }
    if (
      location.pathname.startsWith('/book') ||
      location.pathname.startsWith('/admin')
    ) {
      setVisible(false);
      notifyPreloaderComplete();
      return;
    }

    window.sessionStorage.setItem(PRELOADER_SESSION_KEY, '1');

    if (reducedMotion) {
      const t = window.setTimeout(() => {
        setVisible(false);
        notifyPreloaderComplete();
      }, 300);
      return () => window.clearTimeout(t);
    }

    const t1 = window.setTimeout(() => setPhase('crimson-swipe'), 1200);
    const t2 = window.setTimeout(() => setPhase('paper-wipe'), 1900);
    const t3 = window.setTimeout(() => {
      setVisible(false);
      notifyPreloaderComplete();
    }, 2600);

    return () => {
      window.clearTimeout(t1);
      window.clearTimeout(t2);
      window.clearTimeout(t3);
    };
  }, [visible, reducedMotion, location.pathname]);

  if (!visible) return null;

  if (reducedMotion) {
    return (
      <div className="fixed inset-0 z-[500] bg-[#15110F] text-[#F5F0E8] flex items-center justify-center transition-opacity duration-300">
        <div className="text-center flex flex-col items-center">
          <img
            src="/bbold-logo-light.png"
            alt="BBOLD Salon & Academy"
            className="h-20 sm:h-24 w-auto object-contain"
          />
          <div className="font-mono text-xs uppercase tracking-widest mt-3 text-[#F2C9C0]">
            Mumbai
          </div>
        </div>
      </div>
    );
  }

  return (
    <div
      aria-hidden="true"
      className="fixed inset-0 z-[500] bg-[#15110F] text-[#F5F0E8] flex items-center justify-center overflow-hidden select-none"
    >
      {/* Official BBOLD Salon & Academy Brand Mark Reveal */}
      <div className="flex flex-col items-center justify-center transition-all duration-700">
        <img
          src="/bbold-logo-light.png"
          alt="BBOLD Salon & Academy"
          className="h-24 sm:h-32 w-auto object-contain drop-shadow-[0_12px_32px_rgba(0,0,0,0.4)]"
        />
      </div>

      {/* Thick Crimson Brush Stroke + Official Logo Reveal */}
      <div
        className="absolute inset-0 flex items-center justify-center transition-transform duration-600 ease-[cubic-bezier(0.76,0,0.24,1)]"
        style={{
          backgroundColor: '#C4262E',
          transform:
            phase === 'draw'
              ? 'translateX(-102%)'
              : phase === 'crimson-swipe'
              ? 'translateX(0%)'
              : 'translateX(0%)',
        }}
      >
        <div className="text-center flex flex-col items-center">
          <img
            src="/bbold-logo-light.png"
            alt="BBOLD Salon & Academy"
            className="h-24 sm:h-32 w-auto object-contain"
          />
          <div className="font-mono text-xs uppercase tracking-[0.2em] text-[#F5F0E8]/90 mt-3">
            Salon &amp; Academy · Mumbai
          </div>
        </div>
      </div>

      {/* Second Stroke in Paper Revealing the Hero */}
      <div
        className="absolute inset-0 bg-[#F5F0E8] transition-transform duration-700 ease-[cubic-bezier(0.76,0,0.24,1)]"
        style={{
          transform: phase === 'paper-wipe' ? 'translateX(0%)' : 'translateX(-102%)',
        }}
      />
    </div>
  );
};

// =============================================================================
// 2. CUSTOM CURSOR (Fine pointers only; never in /admin, /book, or over form inputs)
// =============================================================================

export const CustomCursor: React.FC<{ activeRoom?: RoomId }> = ({ activeRoom = 'hair' }) => {
  const location = useLocation();
  const reducedMotion = usePrefersReducedMotion();
  const ringRef = useRef<HTMLDivElement | null>(null);
  const dotRef = useRef<HTMLDivElement | null>(null);
  const [cursorMode, setCursorMode] = useState<'default' | 'link' | 'view' | 'drag' | 'book' | 'try' | 'hidden'>('default');
  const [isFinePointer, setIsFinePointer] = useState(false);

  const disabledRoute =
    location.pathname.startsWith('/admin') || location.pathname.startsWith('/book');

  useEffect(() => {
    if (typeof window === 'undefined') return;
    const mq = window.matchMedia('(pointer: fine)');
    setIsFinePointer(mq.matches);
    const handler = (e: MediaQueryListEvent) => setIsFinePointer(e.matches);
    mq.addEventListener('change', handler);
    return () => mq.removeEventListener('change', handler);
  }, []);

  useEffect(() => {
    if (!isFinePointer || reducedMotion || disabledRoute) return;

    let mouseX = -100;
    let mouseY = -100;
    let ringX = -100;
    let ringY = -100;
    let rafId = 0;

    const onMouseMove = (e: MouseEvent) => {
      mouseX = e.clientX;
      mouseY = e.clientY;

      if (dotRef.current) {
        dotRef.current.style.transform = `translate3d(${mouseX - 3}px, ${mouseY - 3}px, 0)`;
      }

      const target = e.target as HTMLElement | null;
      if (!target) return;

      if (target.closest('input, textarea, select, [data-cursor="none"]')) {
        setCursorMode('hidden');
        return;
      }

      const customAttr = target.closest('[data-cursor]')?.getAttribute('data-cursor');
      if (
        customAttr === 'view' ||
        customAttr === 'drag' ||
        customAttr === 'book' ||
        customAttr === 'try'
      ) {
        setCursorMode(customAttr);
      } else if (target.closest('a, button')) {
        setCursorMode('link');
      } else {
        setCursorMode('default');
      }
    };

    const tick = () => {
      ringX += (mouseX - ringX) * 0.16;
      ringY += (mouseY - ringY) * 0.16;
      if (ringRef.current) {
        ringRef.current.style.transform = `translate3d(${ringX}px, ${ringY}px, 0)`;
      }
      rafId = window.requestAnimationFrame(tick);
    };

    window.addEventListener('mousemove', onMouseMove, { passive: true });
    rafId = window.requestAnimationFrame(tick);

    return () => {
      window.removeEventListener('mousemove', onMouseMove);
      window.cancelAnimationFrame(rafId);
    };
  }, [isFinePointer, reducedMotion, disabledRoute]);

  if (!isFinePointer || reducedMotion || disabledRoute || cursorMode === 'hidden') {
    return null;
  }

  const swatch = ROOM_SWATCHES[activeRoom] || ROOM_SWATCHES.hair;
  const isPillLabel =
    cursorMode === 'view' ||
    cursorMode === 'drag' ||
    cursorMode === 'book' ||
    cursorMode === 'try';

  return (
    <div aria-hidden="true" className="pointer-events-none fixed inset-0 z-[900] overflow-hidden">
      <div
        ref={dotRef}
        className="w-1.5 h-1.5 rounded-full fixed top-0 left-0"
        style={{ backgroundColor: swatch.hex }}
      />
      <div
        ref={ringRef}
        className="fixed top-0 left-0 -translate-x-1/2 -translate-y-1/2 flex items-center justify-center transition-[width,height,background-color] duration-200"
        style={{
          width: isPillLabel ? 58 : cursorMode === 'link' ? 32 : 48,
          height: isPillLabel ? 28 : cursorMode === 'link' ? 32 : 48,
          borderRadius: 9999,
          border: `2px solid ${swatch.hex}`,
          backgroundColor: isPillLabel
            ? swatch.hex
            : cursorMode === 'link'
            ? `${swatch.hex}24`
            : 'transparent',
          color: swatch.inkHex,
        }}
      >
        {isPillLabel && (
          <span className="font-mono text-[10px] font-semibold uppercase tracking-wider">
            {cursorMode.toUpperCase()}
          </span>
        )}
      </div>
    </div>
  );
};

// =============================================================================
// 3. MAGNETIC PRIMARY CTA BUTTON
// =============================================================================

export const MagneticButton: React.FC<{
  children: React.ReactNode;
  className?: string;
  onClick?: () => void;
  cursorLabel?: 'book' | 'try' | 'link';
}> = ({ children, className = '', onClick, cursorLabel = 'book' }) => {
  const reducedMotion = usePrefersReducedMotion();
  const ref = useRef<HTMLDivElement | null>(null);
  const [offset, setOffset] = useState({ x: 0, y: 0 });

  const handleMouseMove = (e: React.MouseEvent<HTMLDivElement>) => {
    if (reducedMotion || !ref.current) return;
    const rect = ref.current.getBoundingClientRect();
    const centerX = rect.left + rect.width / 2;
    const centerY = rect.top + rect.height / 2;
    const dx = e.clientX - centerX;
    const dy = e.clientY - centerY;
    const dist = Math.hypot(dx, dy);

    if (dist < 80) {
      setOffset({ x: dx * 0.3, y: dy * 0.3 });
    } else {
      setOffset({ x: 0, y: 0 });
    }
  };

  return (
    <div
      ref={ref}
      data-cursor={cursorLabel}
      onClick={onClick}
      onMouseMove={handleMouseMove}
      onMouseLeave={() => setOffset({ x: 0, y: 0 })}
      style={{
        transform: `translate3d(${offset.x}px, ${offset.y}px, 0)`,
        transition: 'transform 600ms cubic-bezier(0.16, 1, 0.3, 1)',
      }}
      className={`inline-block ${className}`}
    >
      <span
        style={{
          transform: `translate3d(${offset.x * 0.15}px, ${offset.y * 0.15}px, 0)`,
          transition: 'transform 600ms cubic-bezier(0.16, 1, 0.3, 1)',
        }}
        className="inline-flex items-center justify-center"
      >
        {children}
      </span>
    </div>
  );
};

// =============================================================================
// 4. CUTLINE DIVIDER (Bold dark black border line with travelling scissors icon)
// =============================================================================

export const CutLine: React.FC<{ className?: string }> = ({ className = '' }) => {
  const reducedMotion = usePrefersReducedMotion();
  const ref = useRef<HTMLDivElement | null>(null);
  const [cutTriggered, setCutTriggered] = useState(false);

  useEffect(() => {
    if (reducedMotion || !ref.current || typeof IntersectionObserver === 'undefined') {
      setCutTriggered(true);
      return;
    }
    const obs = new IntersectionObserver(
      (entries) => {
        if (entries[0]?.isIntersecting) {
          setCutTriggered(true);
          obs.disconnect();
        }
      },
      { threshold: 0.25 }
    );
    obs.observe(ref.current);
    return () => obs.disconnect();
  }, [reducedMotion]);

  return (
    <div
      ref={ref}
      aria-hidden="true"
      className={`relative w-full py-6 flex items-center overflow-hidden select-none ${className}`}
    >
      <div className="w-full border-t-[2.5px] border-[#15110F]" />
      <div
        className="absolute top-1/2 -translate-y-1/2 flex items-center justify-center w-9 h-9 rounded-full bg-[#E8A317] border-2 border-[#15110F] text-[#15110F] shadow-[2px_2px_0px_#15110F]"
        style={{
          left: cutTriggered ? 'calc(100% - 48px)' : '16px',
          transition: reducedMotion
            ? 'none'
            : 'left 1200ms cubic-bezier(0.65, 0, 0.35, 1)',
        }}
      >
        <Scissors size={16} />
      </div>
    </div>
  );
};

// =============================================================================
// 5. DIE-CUT STICKERS & STICKER DROP (Smooth Fall from Above + Bouncy Landing)
// =============================================================================

export type StickerVariant =
  | 'stamp'
  | 'lipstick'
  | 'nail-polish'
  | 'scissors'
  | 'comb'
  | 'flower'
  | 'blowdryer'
  | 'mirror'
  | 'sparkle-badge'
  | 'crown'
  | 'academy-star';

const VARIANT_STAGGER_MAP: Record<StickerVariant, number> = {
  scissors: 0.06,
  blowdryer: 0.16,
  'nail-polish': 0.12,
  stamp: 0.22,
  comb: 0.1,
  'sparkle-badge': 0.14,
  crown: 0.08,
  lipstick: 0.12,
  mirror: 0.18,
  'academy-star': 0.1,
  flower: 0.14,
};

export const StickerDrop: React.FC<{
  children: React.ReactNode;
  className?: string;
  rotate?: number;
  delay?: number;
  dropDistance?: number;
  idleFloat?: boolean;
}> = ({
  children,
  className = '',
  rotate = -3,
  delay = 0,
  dropDistance = 135,
  idleFloat = true,
}) => {
  const preloaderReady = usePreloaderReady();
  const anchorRef = useRef<HTMLDivElement | null>(null);
  const [inView, setInView] = useState(false);

  useEffect(() => {
    const node = anchorRef.current;
    if (!node || typeof IntersectionObserver === 'undefined') {
      setInView(true);
      return;
    }

    const observer = new IntersectionObserver(
      (entries) => {
        const entry = entries[0];
        if (!entry) return;

        if (entry.isIntersecting && entry.intersectionRatio >= 0.08) {
          setInView(true);
        } else if (!entry.isIntersecting) {
          const rect = entry.boundingClientRect;
          const vh = window.innerHeight || 800;
          const vw = window.innerWidth || 1200;
          if (
            rect.bottom < -36 ||
            rect.top > vh + 36 ||
            rect.right < -36 ||
            rect.left > vw + 36
          ) {
            setInView(false);
          }
        }
      },
      {
        threshold: [0, 0.08, 0.2],
        rootMargin: '24px 0px 24px 0px',
      }
    );

    observer.observe(node);
    return () => observer.disconnect();
  }, []);

  const shouldAnimate = inView && preloaderReady;
  const tiltDirection = rotate >= 0 ? 1 : -1;
  const initialTilt = -14 * tiltDirection;
  const overshootTilt = 7 * tiltDirection;
  const reboundTilt = -4.5 * tiltDirection;

  return (
    <div
      ref={anchorRef}
      className={`relative inline-flex items-center justify-center align-middle ${className}`}
    >
      <motion.div
        initial={{
          y: -dropDistance,
          opacity: 0,
          scaleX: 0.88,
          scaleY: 1.08,
          rotate: initialTilt,
        }}
        animate={
          shouldAnimate
            ? {
                y: [-dropDistance, -Math.round(dropDistance * 0.78), 18, -24, 8, -5, 0],
                opacity: [0, 1, 1, 1, 1, 1, 1],
                scaleX: [0.88, 0.92, 1.08, 0.95, 1.03, 0.99, 1],
                scaleY: [1.08, 1.05, 0.9, 1.04, 0.97, 1.01, 1],
                rotate: [
                  initialTilt,
                  initialTilt * 0.7,
                  overshootTilt,
                  reboundTilt,
                  overshootTilt * 0.35,
                  reboundTilt * 0.25,
                  0,
                ],
              }
            : {
                y: -dropDistance,
                opacity: 0,
                scaleX: 0.88,
                scaleY: 1.08,
                rotate: initialTilt,
              }
        }
        transition={
          shouldAnimate
            ? {
                duration: 1.12,
                delay,
                times: [0, 0.1, 0.36, 0.56, 0.74, 0.88, 1],
                ease: [
                  'easeOut',
                  [0.42, 0, 0.72, 0.08],
                  [0.22, 1, 0.36, 1],
                  [0.42, 0, 0.72, 0.08],
                  [0.22, 1, 0.36, 1],
                  [0.25, 1, 0.5, 1],
                ],
              }
            : { duration: 0 }
        }
        className="inline-flex items-center justify-center will-change-transform [backface-visibility:hidden]"
      >
        {idleFloat ? (
          <motion.div
            animate={{
              y: [0, -4, 0, 2, 0],
              rotate: [rotate * 0.35 - 1.5, rotate * 0.35 + 1.5, rotate * 0.35 - 1.5],
            }}
            transition={{
              duration: 3.8,
              repeat: Infinity,
              ease: 'easeInOut',
            }}
            whileHover={{ scale: 1.06, rotate: rotate + 4 }}
            className="inline-flex items-center justify-center will-change-transform"
          >
            {children}
          </motion.div>
        ) : (
          children
        )}
      </motion.div>
    </div>
  );
};

export const DieCutSticker: React.FC<{
  variant: StickerVariant;
  className?: string;
  rotate?: number;
  label?: string;
  delay?: number;
}> = ({ variant, className = '', rotate = -5, label, delay }) => {
  const uid = React.useId().replace(/:/g, '');
  const circlePathId = `bbold-stamp-circle-${uid}`;
  const resolvedDelay =
    typeof delay === 'number'
      ? delay
      : (VARIANT_STAGGER_MAP[variant] ?? 0.08) + (Math.abs(rotate) % 4) * 0.025;

  if (variant === 'stamp') {
    return (
      <StickerDrop
        rotate={rotate}
        delay={resolvedDelay}
        dropDistance={145}
        idleFloat={false}
        className={className}
      >
        <motion.div
          data-cursor="drag"
          drag
          dragConstraints={{ left: 0, right: 0, top: 0, bottom: 0 }}
          animate={{
            y: [0, -6, 0],
            rotate: [rotate - 2, rotate + 2, rotate - 2],
          }}
          transition={{
            y: {
              duration: 3.2,
              repeat: Infinity,
              ease: 'easeInOut',
            },
            rotate: {
              duration: 4.0,
              repeat: Infinity,
              ease: 'easeInOut',
            },
          }}
          whileHover={{ scale: 1.08 }}
          className="relative inline-flex items-center justify-center w-32 h-32 rounded-full bg-[#C4262E] text-[#F5F0E8] border-[3px] border-[#15110F] ring-4 ring-[#FFFFFF] shadow-[4px_4px_0px_#15110F] cursor-grab active:cursor-grabbing select-none will-change-transform"
        >
          {/* Rotating Circular Text Ring in Perpetual Loop */}
          <svg
            viewBox="0 0 120 120"
            className="w-full h-full p-1.5 animate-bbold-spin"
          >
            <defs>
              <path
                id={circlePathId}
                d="M 60, 60 m -42, 0 a 42,42 0 1,1 84,0 a 42,42 0 1,1 -84,0"
              />
            </defs>
            <text className="font-mono text-[9.5px] font-bold uppercase tracking-[0.13em] fill-[#F5F0E8]">
              <textPath href={`#${circlePathId}`}>
                BBOLD · SALON &amp; ACADEMY · MUMBAI ·
              </textPath>
            </text>
          </svg>

          {/* Stationary Center Monogram */}
          <div className="absolute inset-0 flex flex-col items-center justify-center pointer-events-none">
            <span className="font-display font-black text-2xl leading-none text-[#F5F0E8] drop-shadow-[1px_1px_0px_#15110F]">
              Bb
            </span>
            <span className="font-mono text-[8px] uppercase tracking-widest text-[#E8A317] font-bold mt-0.5">
              EST · MUMBAI
            </span>
          </div>
        </motion.div>
      </StickerDrop>
    );
  }

  const labelMap: Record<
    StickerVariant,
    { title: string; bg: string; ink: string; icon: React.ReactNode }
  > = {
    stamp: {
      title: 'Bbold Mumbai',
      bg: '#C4262E',
      ink: '#F5F0E8',
      icon: <Sparkles size={15} />,
    },
    lipstick: {
      title: 'Glam Makeup Bar',
      bg: '#F2C9C0',
      ink: '#15110F',
      icon: <Heart size={15} />,
    },
    'nail-polish': {
      title: 'Gel & Nail Art Studio',
      bg: '#E8A317',
      ink: '#15110F',
      icon: <Gem size={15} />,
    },
    scissors: {
      title: 'Precision Cut & Style',
      bg: '#C4262E',
      ink: '#FFFFFF',
      icon: <Scissors size={15} />,
    },
    comb: {
      title: 'Balayage & Colour Lab',
      bg: '#E9DDD0',
      ink: '#15110F',
      icon: <Wand2 size={15} />,
    },
    flower: {
      title: 'Skin & Glow Facial',
      bg: '#9AAA94',
      ink: '#15110F',
      icon: <Sparkles size={15} />,
    },
    blowdryer: {
      title: 'Silk Blowout Bar',
      bg: '#E8A317',
      ink: '#15110F',
      icon: <Flame size={15} />,
    },
    mirror: {
      title: 'Bridal Trial Suite',
      bg: '#F2C9C0',
      ink: '#15110F',
      icon: <Crown size={15} />,
    },
    'sparkle-badge': {
      title: '100% Hygienic Tools',
      bg: '#9AAA94',
      ink: '#15110F',
      icon: <Award size={15} />,
    },
    crown: {
      title: 'Mumbai Salon Studio',
      bg: '#C4262E',
      ink: '#F5F0E8',
      icon: <Crown size={15} />,
    },
    'academy-star': {
      title: 'Certified Pro Academy',
      bg: '#E8A317',
      ink: '#15110F',
      icon: <Star size={15} />,
    },
  };

  const cfg = labelMap[variant] || labelMap.scissors;

  return (
    <StickerDrop
      rotate={rotate}
      delay={resolvedDelay}
      dropDistance={135}
      idleFloat={false}
      className={className}
    >
      <motion.div
        data-cursor="drag"
        drag
        dragConstraints={{ left: 0, right: 0, top: 0, bottom: 0 }}
        animate={{
          y: [0, -6, 0, 3, 0],
          rotate: [rotate - 2.5, rotate + 3, rotate - 2.5],
          scale: [1, 1.025, 1],
        }}
        transition={{
          duration: 3.6,
          repeat: Infinity,
          ease: 'easeInOut',
        }}
        whileHover={{ rotate: rotate + 8, scale: 1.09 }}
        style={{
          backgroundColor: cfg.bg,
          color: cfg.ink,
        }}
        className="inline-flex items-center gap-2 px-4 py-2 rounded-full border-[2.5px] border-[#15110F] ring-2 ring-[#FFFFFF] shadow-[3px_3px_0px_#15110F] font-display font-extrabold text-xs uppercase tracking-wider cursor-grab active:cursor-grabbing select-none will-change-transform"
      >
        <span aria-hidden="true" className="shrink-0">
          {cfg.icon}
        </span>
        <span>{label || cfg.title}</span>
      </motion.div>
    </StickerDrop>
  );
};

// =============================================================================
// 6. MARQUEE BAND (Single tall yellow strip with black borders, right-to-left infinite loop)
// =============================================================================

export const MarqueeBand: React.FC<{
  phrases?: string[];
  dark?: boolean;
}> = ({ phrases = [] }) => {
  const trackRef = useRef<HTMLDivElement | null>(null);

  const defaultRichPhrases = [
    'Haircuts & Precision Restyling',
    'Dimensional Balayage & Global Colour',
    'HD & Airbrush Bridal Makeup Studio',
    'Soft-Gel Extensions & Custom Nail Art',
    'Hydrating Glow Facials & Skin Prep',
    "Men's Grooming, Fade & Beard Sculpt",
    'Keratin, Cysteine & Hair Botox Smoothing',
    'Pre-Bridal Trials & Saree Draping',
    'Luxury Spa Manicures & Pedicures',
    'Bbold Professional Training Academy · Mumbai',
    'Scalp Detox & Deep Repair Hair Spas',
    'Hospital-Grade Tool Sterilisation',
    'Walk-Ins Welcome · Book Your Chair Online',
  ];

  const mergedPhrases = Array.from(new Set([...phrases, ...defaultRichPhrases]));
  // Duplicate twice so the first half and second half are identical
  const seamlessLoop = [...mergedPhrases, ...mergedPhrases];

  useEffect(() => {
    const el = trackRef.current;
    if (!el) return;

    let rafId = 0;
    let lastTime = performance.now();
    let offsetPx = 0;
    const speedPxPerSec = 95; // Smooth continuous right-to-left speed

    const step = (now: number) => {
      const dt = Math.min(0.1, (now - lastTime) / 1000);
      lastTime = now;

      const halfWidth = el.scrollWidth / 2;
      if (halfWidth > 0) {
        offsetPx -= speedPxPerSec * dt;
        if (Math.abs(offsetPx) >= halfWidth) {
          offsetPx += halfWidth;
        }
        el.style.transform = `translate3d(${offsetPx}px, 0, 0)`;
      }

      rafId = window.requestAnimationFrame(step);
    };

    rafId = window.requestAnimationFrame(step);
    return () => window.cancelAnimationFrame(rafId);
  }, [mergedPhrases.length]);

  return (
    <div
      aria-label="Salon services marquee"
      className="w-full overflow-hidden py-7 sm:py-9 bg-[#E8A317] text-[#15110F] border-y-[3.5px] border-x-[3.5px] border-[#15110F] shadow-[0_5px_0_#15110F] select-none"
    >
      <div
        ref={trackRef}
        className="flex w-max whitespace-nowrap items-center will-change-transform"
      >
        {seamlessLoop.map((phrase, idx) => (
          <span
            key={`marquee-item-${idx}`}
            className="inline-flex items-center font-display text-3xl sm:text-4xl lg:text-5xl font-black uppercase tracking-tight text-[#15110F] mx-8"
          >
            <span className="drop-shadow-[2px_2px_0px_#F5F0E8]">{phrase}</span>
            <span className="ml-14 inline-flex items-center justify-center w-10 h-10 rounded-full bg-[#C4262E] text-[#F5F0E8] border-[2.5px] border-[#15110F] text-lg font-mono shadow-[2px_2px_0px_#15110F]">
              ✦
            </span>
          </span>
        ))}
      </div>
    </div>
  );
};

// =============================================================================
// 7. RIGHT-EDGE STACKED FOUR-STATION SWATCH PROGRESS INDICATOR
// =============================================================================

export const SwatchScrollProgress: React.FC = () => {
  const [progress, setProgress] = useState(0);

  useEffect(() => {
    const onScroll = () => {
      const docHeight =
        document.documentElement.scrollHeight - document.documentElement.clientHeight;
      if (docHeight <= 0) {
        setProgress(0);
      } else {
        setProgress(Math.min(1, Math.max(0, window.scrollY / docHeight)));
      }
    };
    window.addEventListener('scroll', onScroll, { passive: true });
    onScroll();
    return () => window.removeEventListener('scroll', onScroll);
  }, []);

  const swatches = [
    { color: '#C4262E', label: 'Hair', threshold: 0.15 },
    { color: '#F2C9C0', label: 'Makeup', threshold: 0.4 },
    { color: '#E8A317', label: 'Nails', threshold: 0.65 },
    { color: '#9AAA94', label: 'Skin', threshold: 0.85 },
  ];

  return (
    <div
      aria-hidden="true"
      className="hidden xl:flex fixed right-4 top-1/2 -translate-y-1/2 z-[90] flex-col items-center gap-2 pointer-events-none no-print"
    >
      <div className="w-0.5 h-16 bg-[#15110F]/15 rounded-full overflow-hidden">
        <div
          className="w-full bg-[#15110F] transition-all duration-150"
          style={{ height: `${progress * 100}%` }}
        />
      </div>
      {swatches.map((s) => {
        const active = progress >= s.threshold;
        return (
          <div
            key={s.label}
            title={s.label}
            className="w-2.5 h-2.5 rounded-full border border-[#15110F]/40 transition-transform duration-200"
            style={{
              backgroundColor: active ? s.color : 'transparent',
              transform: active ? 'scale(1.25)' : 'scale(1)',
            }}
          />
        );
      })}
    </div>
  );
};

// =============================================================================
// 8. COUNT-UP NUMBER (0 -> n over 1200ms on view)
// =============================================================================

export const CountUpNumber: React.FC<{ value: number }> = ({ value }) => {
  const reducedMotion = usePrefersReducedMotion();
  const [display, setDisplay] = useState(reducedMotion ? value : 0);
  const ref = useRef<HTMLSpanElement | null>(null);

  useEffect(() => {
    if (reducedMotion) {
      setDisplay(value);
      return;
    }

    let rafId = 0;
    const node = ref.current;
    if (!node || typeof IntersectionObserver === 'undefined') {
      setDisplay(value);
      return;
    }

    const obs = new IntersectionObserver(
      (entries) => {
        if (entries[0]?.isIntersecting) {
          const start = performance.now();
          const duration = 1200;
          const step = (now: number) => {
            const p = Math.min(1, (now - start) / duration);
            const eased = 1 - Math.pow(1 - p, 3);
            setDisplay(Math.round(eased * value));
            if (p < 1) {
              rafId = window.requestAnimationFrame(step);
            }
          };
          rafId = window.requestAnimationFrame(step);
          obs.disconnect();
        }
      },
      { threshold: 0.2 }
    );

    obs.observe(node);
    return () => {
      obs.disconnect();
      window.cancelAnimationFrame(rafId);
    };
  }, [value, reducedMotion]);

  return (
    <span ref={ref} className="font-mono tabular-nums">
      {display}
    </span>
  );
};
