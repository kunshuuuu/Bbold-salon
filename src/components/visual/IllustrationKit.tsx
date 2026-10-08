import React, { useEffect, useRef, useState } from 'react';
import type { IllustrationKey } from '../../types/database';

// Global tracker to ensure at most 3 illustrations animate simultaneously
let activeAnimationCount = 0;
const MAX_CONCURRENT_ANIMATIONS = 3;

export interface IllustrationProps {
  name: IllustrationKey;
  className?: string;
  animateOnView?: boolean;
}

export const ALL_ILLUSTRATION_KEYS: IllustrationKey[] = [
  'profile-bob',
  'profile-long-waves',
  'profile-updo',
  'man-profile-fade',
  'comb-and-scissors',
  'hair-dryer',
  'lipstick-and-mirror',
  'makeup-brushes',
  'nail-polish-bottles',
  'hand-with-nails',
  'facial-jar-and-leaf',
  'bridal-veil-and-flowers',
  'razor-and-brush',
  'salon-chair',
];

export const Illustration: React.FC<IllustrationProps> = ({
  name,
  className = 'w-full h-full',
  animateOnView = true,
}) => {
  const svgRef = useRef<SVGSVGElement | null>(null);
  const [hasDrawn, setHasDrawn] = useState(!animateOnView);
  const [isAnimating, setIsAnimating] = useState(false);

  useEffect(() => {
    if (!animateOnView || hasDrawn) return;

    const prefersReduced =
      typeof window !== 'undefined' &&
      window.matchMedia?.('(prefers-reduced-motion: reduce)').matches;

    if (prefersReduced) {
      setHasDrawn(true);
      return;
    }

    const node = svgRef.current;
    if (!node || typeof IntersectionObserver === 'undefined') {
      setHasDrawn(true);
      return;
    }

    let timerId: number | null = null;

    const observer = new IntersectionObserver(
      (entries) => {
        const entry = entries[0];
        if (!entry) return;

        if (entry.isIntersecting && !hasDrawn) {
          if (activeAnimationCount < MAX_CONCURRENT_ANIMATIONS) {
            activeAnimationCount += 1;
            setIsAnimating(true);
            setHasDrawn(true);
            timerId = window.setTimeout(() => {
              activeAnimationCount = Math.max(0, activeAnimationCount - 1);
              setIsAnimating(false);
            }, 1250);
          } else {
            // If 3 are already animating, reveal cleanly without queuing lag
            setHasDrawn(true);
          }
          observer.disconnect();
        }
      },
      { threshold: 0.2 }
    );

    observer.observe(node);

    return () => {
      observer.disconnect();
      if (timerId !== null) {
        window.clearTimeout(timerId);
        activeAnimationCount = Math.max(0, activeAnimationCount - 1);
      }
    };
  }, [animateOnView, hasDrawn]);

  const strokeStyle: React.CSSProperties = {
    strokeDasharray: 1,
    strokeDashoffset: hasDrawn ? 0 : 1,
    transition: isAnimating
      ? 'stroke-dashoffset 1200ms cubic-bezier(0.65, 0, 0.35, 1)'
      : 'none',
  };

  const fillStyle: React.CSSProperties = {
    opacity: hasDrawn ? 1 : 0,
    transition: isAnimating ? 'opacity 700ms cubic-bezier(0.16, 1, 0.3, 1) 250ms' : 'none',
  };

  return (
    <svg
      ref={svgRef}
      viewBox="0 0 240 280"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      aria-hidden="true"
      focusable="false"
      className={`select-none ${className}`}
    >
      {renderIllustrationArtwork(name, strokeStyle, fillStyle)}
    </svg>
  );
};

function renderIllustrationArtwork(
  name: IllustrationKey,
  strokeStyle: React.CSSProperties,
  fillStyle: React.CSSProperties
) {
  switch (name) {
    case 'profile-bob':
      return (
        <g>
          {/* Flat organic fills */}
          <path
            d="M66 64C64 36 96 24 132 30C168 36 184 68 180 112C176 154 162 178 134 180C106 182 70 156 66 64Z"
            fill="#F2C9C0"
            style={fillStyle}
          />
          <circle cx="152" cy="182" r="14" fill="#E8A317" fillOpacity="0.45" style={fillStyle} />
          {/* Hand-drawn 1.5px strokes */}
          <path
            pathLength={1}
            style={strokeStyle}
            d="M84 48C108 30 152 34 170 68C184 96 182 146 164 174C144 176 122 175 106 168"
            stroke="#15110F"
            strokeWidth="1.5"
            strokeLinecap="round"
          />
          <path
            pathLength={1}
            style={strokeStyle}
            d="M114 52C94 64 82 94 78 136C76 158 84 172 102 174"
            stroke="#C4262E"
            strokeWidth="1.5"
            strokeLinecap="round"
          />
          {/* Face profile & neck */}
          <path
            pathLength={1}
            style={strokeStyle}
            d="M100 84C92 98 82 112 76 122C74 126 78 130 84 131C80 140 81 148 87 154C95 162 112 162 122 156"
            stroke="#15110F"
            strokeWidth="1.5"
            strokeLinecap="round"
            strokeLinejoin="round"
          />
          <path
            pathLength={1}
            style={strokeStyle}
            d="M98 106C103 104 108 105 111 108M108 162L104 226M142 174L146 232"
            stroke="#15110F"
            strokeWidth="1.5"
            strokeLinecap="round"
          />
          <path
            pathLength={1}
            style={strokeStyle}
            d="M72 232C98 218 148 218 174 234"
            stroke="#C4262E"
            strokeWidth="1.5"
            strokeLinecap="round"
          />
        </g>
      );

    case 'profile-long-waves':
      return (
        <g>
          <path
            d="M62 72C68 34 118 26 154 44C190 62 194 128 184 192C174 234 124 246 86 226C54 208 56 110 62 72Z"
            fill="#E9DDD0"
            style={fillStyle}
          />
          <path
            d="M126 142C154 140 176 168 170 206C164 236 130 242 112 220"
            fill="#F2C9C0"
            style={fillStyle}
          />
          <path
            pathLength={1}
            style={strokeStyle}
            d="M86 58C112 34 158 42 172 78C184 110 166 136 178 168C188 196 172 228 148 240"
            stroke="#15110F"
            strokeWidth="1.5"
            strokeLinecap="round"
          />
          <path
            pathLength={1}
            style={strokeStyle}
            d="M122 50C144 74 132 110 146 142C160 174 142 206 156 236"
            stroke="#C4262E"
            strokeWidth="1.5"
            strokeLinecap="round"
          />
          <path
            pathLength={1}
            style={strokeStyle}
            d="M92 68C74 96 86 128 70 160C56 188 74 218 96 236"
            stroke="#15110F"
            strokeWidth="1.5"
            strokeLinecap="round"
          />
          <path
            pathLength={1}
            style={strokeStyle}
            d="M98 88C88 102 80 114 76 124C75 128 80 130 85 132C82 142 86 152 98 156C108 160 120 156 128 148"
            stroke="#15110F"
            strokeWidth="1.5"
            strokeLinecap="round"
          />
        </g>
      );

    case 'profile-updo':
      return (
        <g>
          <circle cx="142" cy="62" r="36" fill="#F2C9C0" style={fillStyle} />
          <path
            d="M78 118C78 82 106 62 136 68C164 74 174 108 158 144C144 176 96 172 78 118Z"
            fill="#E9DDD0"
            style={fillStyle}
          />
          {/* Sculpted bun + hairpins */}
          <path
            pathLength={1}
            style={strokeStyle}
            d="M116 62C116 40 138 26 158 34C178 42 184 68 168 86C154 102 126 94 116 62Z"
            stroke="#15110F"
            strokeWidth="1.5"
            strokeLinecap="round"
          />
          <path
            pathLength={1}
            style={strokeStyle}
            d="M104 38L178 82M112 84L182 44"
            stroke="#C4262E"
            strokeWidth="1.5"
            strokeLinecap="round"
          />
          <path
            pathLength={1}
            style={strokeStyle}
            d="M94 94C84 110 74 124 70 134C68 138 74 141 80 142C78 152 82 162 92 166C104 170 120 166 130 154"
            stroke="#15110F"
            strokeWidth="1.5"
            strokeLinecap="round"
          />
          <path
            pathLength={1}
            style={strokeStyle}
            d="M106 168L102 234M136 152C142 184 148 214 156 236"
            stroke="#15110F"
            strokeWidth="1.5"
            strokeLinecap="round"
          />
        </g>
      );

    case 'man-profile-fade':
      return (
        <g>
          <path
            d="M74 68C80 40 124 32 156 48C178 60 182 96 172 132C162 168 118 184 88 168C64 154 68 96 74 68Z"
            fill="#E9DDD0"
            style={fillStyle}
          />
          <path
            d="M84 142C96 144 112 152 122 136C128 160 112 182 88 180C76 178 74 158 84 142Z"
            fill="#9AAA94"
            fillOpacity="0.45"
            style={fillStyle}
          />
          {/* Clean crop & fade lines */}
          <path
            pathLength={1}
            style={strokeStyle}
            d="M84 76C88 46 126 38 156 54C176 66 178 98 168 128"
            stroke="#15110F"
            strokeWidth="1.5"
            strokeLinecap="round"
          />
          <path
            pathLength={1}
            style={strokeStyle}
            d="M116 96C134 92 152 98 164 112"
            stroke="#C4262E"
            strokeWidth="1.5"
            strokeDasharray="4 4"
            strokeLinecap="round"
          />
          {/* Face + structured beard */}
          <path
            pathLength={1}
            style={strokeStyle}
            d="M86 78C78 96 68 112 62 124C60 128 66 132 72 133C68 148 70 168 84 176C102 184 124 174 134 156"
            stroke="#15110F"
            strokeWidth="1.5"
            strokeLinecap="round"
          />
          <path
            pathLength={1}
            style={strokeStyle}
            d="M72 146C88 150 106 146 118 130C122 146 116 166 98 174"
            stroke="#15110F"
            strokeWidth="1.5"
            strokeLinecap="round"
          />
          <path
            pathLength={1}
            style={strokeStyle}
            d="M104 180L100 236M148 148L154 236"
            stroke="#15110F"
            strokeWidth="1.5"
            strokeLinecap="round"
          />
        </g>
      );

    case 'comb-and-scissors':
      return (
        <g>
          <rect
            x="48"
            y="54"
            width="52"
            height="168"
            rx="16"
            transform="rotate(-14 48 54)"
            fill="#F2C9C0"
            style={fillStyle}
          />
          <circle cx="152" cy="196" r="28" fill="#E8A317" fillOpacity="0.38" style={fillStyle} />
          {/* Tall styling comb */}
          <path
            pathLength={1}
            style={strokeStyle}
            d="M58 58L94 48L128 198L92 208L58 58Z"
            stroke="#15110F"
            strokeWidth="1.5"
            strokeLinejoin="round"
          />
          <path
            pathLength={1}
            style={strokeStyle}
            d="M64 74L84 69M68 88L88 83M71 102L91 97M75 116L95 111M78 130L98 125M82 144L102 139M85 158L105 153M89 172L109 167M92 186L112 181"
            stroke="#15110F"
            strokeWidth="1.5"
            strokeLinecap="round"
          />
          {/* Open barber shears */}
          <path
            pathLength={1}
            style={strokeStyle}
            d="M132 186L184 52M168 188L124 56"
            stroke="#C4262E"
            strokeWidth="1.5"
            strokeLinecap="round"
          />
          <circle
            pathLength={1}
            style={strokeStyle}
            cx="126"
            cy="204"
            r="18"
            stroke="#15110F"
            strokeWidth="1.5"
          />
          <circle
            pathLength={1}
            style={strokeStyle}
            cx="172"
            cy="206"
            r="18"
            stroke="#15110F"
            strokeWidth="1.5"
          />
          <path
            pathLength={1}
            style={strokeStyle}
            d="M188 198C196 196 202 202 200 210"
            stroke="#C4262E"
            strokeWidth="1.5"
            strokeLinecap="round"
          />
        </g>
      );

    case 'hair-dryer':
      return (
        <g>
          <path
            d="M54 88C54 64 94 56 142 64C182 70 194 94 182 122C170 150 132 142 98 136C64 130 54 112 54 88Z"
            fill="#F2C9C0"
            style={fillStyle}
          />
          <rect x="116" y="130" width="34" height="78" rx="14" fill="#E9DDD0" style={fillStyle} />
          {/* Dryer barrel & nozzle */}
          <path
            pathLength={1}
            style={strokeStyle}
            d="M46 78L82 70V126L46 118V78Z"
            stroke="#C4262E"
            strokeWidth="1.5"
            strokeLinejoin="round"
          />
          <path
            pathLength={1}
            style={strokeStyle}
            d="M82 68H154C178 68 194 84 194 102C194 120 178 134 154 134H82V68Z"
            stroke="#15110F"
            strokeWidth="1.5"
            strokeLinejoin="round"
          />
          <circle
            pathLength={1}
            style={strokeStyle}
            cx="158"
            cy="101"
            r="18"
            stroke="#15110F"
            strokeWidth="1.5"
          />
          {/* Handle & cord */}
          <path
            pathLength={1}
            style={strokeStyle}
            d="M126 134L114 204C112 214 120 222 130 222C140 222 146 214 148 204L158 134"
            stroke="#15110F"
            strokeWidth="1.5"
            strokeLinecap="round"
          />
          <path
            pathLength={1}
            style={strokeStyle}
            d="M128 222C126 242 148 250 166 238C184 226 196 240 192 256"
            stroke="#C4262E"
            strokeWidth="1.5"
            strokeLinecap="round"
          />
        </g>
      );

    case 'lipstick-and-mirror':
      return (
        <g>
          <ellipse cx="104" cy="118" rx="54" ry="72" fill="#F2C9C0" style={fillStyle} />
          <rect x="148" y="138" width="40" height="88" rx="10" fill="#E9DDD0" style={fillStyle} />
          {/* Hand mirror */}
          <ellipse
            pathLength={1}
            style={strokeStyle}
            cx="100"
            cy="112"
            rx="48"
            ry="64"
            stroke="#15110F"
            strokeWidth="1.5"
          />
          <ellipse
            pathLength={1}
            style={strokeStyle}
            cx="100"
            cy="112"
            rx="38"
            ry="52"
            stroke="#15110F"
            strokeWidth="1.5"
          />
          <path
            pathLength={1}
            style={strokeStyle}
            d="M82 84L114 136M94 76L120 118"
            stroke="#C4262E"
            strokeWidth="1.5"
            strokeLinecap="round"
          />
          <path
            pathLength={1}
            style={strokeStyle}
            d="M92 176V228C92 236 108 236 108 228V176"
            stroke="#15110F"
            strokeWidth="1.5"
            strokeLinecap="round"
          />
          {/* Lipstick bullet & tube */}
          <path
            pathLength={1}
            style={strokeStyle}
            d="M158 112C158 94 178 86 182 98V140H158V112Z"
            fill="#C4262E"
            fillOpacity="0.82"
            stroke="#C4262E"
            strokeWidth="1.5"
          />
          <rect
            pathLength={1}
            style={strokeStyle}
            x="152"
            y="140"
            width="36"
            height="86"
            rx="6"
            stroke="#15110F"
            strokeWidth="1.5"
          />
          <path
            pathLength={1}
            style={strokeStyle}
            d="M152 172H188"
            stroke="#15110F"
            strokeWidth="1.5"
          />
        </g>
      );

    case 'makeup-brushes':
      return (
        <g>
          <circle cx="88" cy="78" r="34" fill="#F2C9C0" style={fillStyle} />
          <circle cx="154" cy="96" r="26" fill="#E8A317" fillOpacity="0.35" style={fillStyle} />
          <path
            d="M68 156H172L160 238H80L68 156Z"
            fill="#E9DDD0"
            style={fillStyle}
          />
          {/* Fan & powder brush */}
          <path
            pathLength={1}
            style={strokeStyle}
            d="M60 80C60 52 116 52 116 80C116 96 104 108 88 108C72 108 60 96 60 80Z"
            stroke="#15110F"
            strokeWidth="1.5"
          />
          <path
            pathLength={1}
            style={strokeStyle}
            d="M80 108L92 228M96 108L104 228"
            stroke="#15110F"
            strokeWidth="1.5"
            strokeLinecap="round"
          />
          {/* Angled contour brush */}
          <path
            pathLength={1}
            style={strokeStyle}
            d="M136 96C136 74 172 66 174 92C176 110 162 118 148 118C138 118 136 108 136 96Z"
            stroke="#C4262E"
            strokeWidth="1.5"
          />
          <path
            pathLength={1}
            style={strokeStyle}
            d="M146 118L132 228M158 118L144 228"
            stroke="#15110F"
            strokeWidth="1.5"
            strokeLinecap="round"
          />
          {/* Fine liner brush + holder cup */}
          <path
            pathLength={1}
            style={strokeStyle}
            d="M118 64L122 92L116 228"
            stroke="#C4262E"
            strokeWidth="1.5"
            strokeLinecap="round"
          />
          <path
            pathLength={1}
            style={strokeStyle}
            d="M66 160H174L162 238H78L66 160Z"
            stroke="#15110F"
            strokeWidth="1.5"
            strokeLinejoin="round"
          />
        </g>
      );

    case 'nail-polish-bottles':
      return (
        <g>
          <rect
            x="52"
            y="122"
            width="68"
            height="92"
            rx="18"
            fill="#E8A317"
            fillOpacity="0.45"
            style={fillStyle}
          />
          <rect
            x="124"
            y="138"
            width="64"
            height="82"
            rx="22"
            fill="#F2C9C0"
            style={fillStyle}
          />
          {/* Bottle 1 */}
          <path
            pathLength={1}
            style={strokeStyle}
            d="M74 52H98L102 118H70L74 52Z"
            stroke="#15110F"
            strokeWidth="1.5"
            strokeLinejoin="round"
          />
          <rect
            pathLength={1}
            style={strokeStyle}
            x="52"
            y="118"
            width="68"
            height="96"
            rx="16"
            stroke="#15110F"
            strokeWidth="1.5"
          />
          <path
            pathLength={1}
            style={strokeStyle}
            d="M64 156C78 148 96 164 108 154"
            stroke="#C4262E"
            strokeWidth="1.5"
            strokeLinecap="round"
          />
          {/* Bottle 2 (tilted) */}
          <path
            pathLength={1}
            style={strokeStyle}
            d="M146 74H168L172 134H142L146 74Z"
            stroke="#15110F"
            strokeWidth="1.5"
            strokeLinejoin="round"
          />
          <rect
            pathLength={1}
            style={strokeStyle}
            x="126"
            y="134"
            width="64"
            height="86"
            rx="20"
            stroke="#15110F"
            strokeWidth="1.5"
          />
          {/* Polish drop */}
          <path
            pathLength={1}
            style={strokeStyle}
            d="M116 86C116 96 108 102 116 108C124 102 116 96 116 86Z"
            fill="#C4262E"
            stroke="#C4262E"
            strokeWidth="1.5"
          />
        </g>
      );

    case 'hand-with-nails':
      return (
        <g>
          <path
            d="M68 176C64 120 88 68 124 68C160 68 182 116 176 184C172 224 144 242 112 240C80 238 72 212 68 176Z"
            fill="#F2C9C0"
            style={fillStyle}
          />
          {/* Graceful hand & fingers */}
          <path
            pathLength={1}
            style={strokeStyle}
            d="M78 234V142C78 130 94 130 94 142V176"
            stroke="#15110F"
            strokeWidth="1.5"
            strokeLinecap="round"
          />
          <path
            pathLength={1}
            style={strokeStyle}
            d="M94 172V96C94 82 112 82 112 96V168"
            stroke="#15110F"
            strokeWidth="1.5"
            strokeLinecap="round"
          />
          <path
            pathLength={1}
            style={strokeStyle}
            d="M112 168V82C112 68 132 68 132 82V170"
            stroke="#15110F"
            strokeWidth="1.5"
            strokeLinecap="round"
          />
          <path
            pathLength={1}
            style={strokeStyle}
            d="M132 170V102C132 88 150 88 150 102V182"
            stroke="#15110F"
            strokeWidth="1.5"
            strokeLinecap="round"
          />
          <path
            pathLength={1}
            style={strokeStyle}
            d="M150 182L172 150C180 140 192 150 184 162L158 214L146 242"
            stroke="#15110F"
            strokeWidth="1.5"
            strokeLinecap="round"
          />
          {/* Crimson almond nails */}
          <ellipse
            cx="86"
            cy="128"
            rx="5"
            ry="9"
            fill="#C4262E"
            style={fillStyle}
          />
          <ellipse
            cx="103"
            cy="82"
            rx="5.5"
            ry="10"
            fill="#C4262E"
            style={fillStyle}
          />
          <ellipse
            cx="122"
            cy="68"
            rx="6"
            ry="11"
            fill="#C4262E"
            style={fillStyle}
          />
          <ellipse
            cx="141"
            cy="88"
            rx="5.5"
            ry="10"
            fill="#C4262E"
            style={fillStyle}
          />
          <ellipse
            cx="184"
            cy="144"
            rx="5"
            ry="8"
            transform="rotate(32 184 144)"
            fill="#C4262E"
            style={fillStyle}
          />
        </g>
      );

    case 'facial-jar-and-leaf':
      return (
        <g>
          <circle cx="132" cy="108" r="56" fill="#9AAA94" fillOpacity="0.42" style={fillStyle} />
          <rect x="56" y="148" width="116" height="74" rx="24" fill="#E9DDD0" style={fillStyle} />
          {/* Botanical stem & leaves */}
          <path
            pathLength={1}
            style={strokeStyle}
            d="M138 148C142 106 160 72 184 46"
            stroke="#15110F"
            strokeWidth="1.5"
            strokeLinecap="round"
          />
          <path
            pathLength={1}
            style={strokeStyle}
            d="M146 112C122 104 114 80 132 68C150 76 154 96 146 112Z"
            stroke="#15110F"
            strokeWidth="1.5"
            strokeLinejoin="round"
          />
          <path
            pathLength={1}
            style={strokeStyle}
            d="M162 84C182 82 198 66 190 50C172 52 162 68 162 84Z"
            stroke="#C4262E"
            strokeWidth="1.5"
            strokeLinejoin="round"
          />
          {/* Cream jar & lid */}
          <rect
            pathLength={1}
            style={strokeStyle}
            x="66"
            y="132"
            width="96"
            height="18"
            rx="8"
            stroke="#15110F"
            strokeWidth="1.5"
          />
          <rect
            pathLength={1}
            style={strokeStyle}
            x="54"
            y="150"
            width="120"
            height="72"
            rx="22"
            stroke="#15110F"
            strokeWidth="1.5"
          />
          <path
            pathLength={1}
            style={strokeStyle}
            d="M78 186H150"
            stroke="#C4262E"
            strokeWidth="1.5"
            strokeLinecap="round"
          />
        </g>
      );

    case 'bridal-veil-and-flowers':
      return (
        <g>
          <path
            d="M52 104C58 52 104 34 148 48C190 62 200 136 184 218C144 236 86 232 62 204C44 182 46 156 52 104Z"
            fill="#F2C9C0"
            style={fillStyle}
          />
          <circle cx="118" cy="72" r="24" fill="#E8A317" fillOpacity="0.35" style={fillStyle} />
          {/* Draped bridal veil */}
          <path
            pathLength={1}
            style={strokeStyle}
            d="M78 68C62 114 52 172 58 232M162 68C182 114 192 174 182 232"
            stroke="#15110F"
            strokeWidth="1.5"
            strokeLinecap="round"
          />
          <path
            pathLength={1}
            style={strokeStyle}
            d="M96 86C88 134 84 184 90 232M144 86C154 134 158 184 152 232"
            stroke="#C4262E"
            strokeWidth="1.5"
            strokeDasharray="3 5"
            strokeLinecap="round"
          />
          {/* Jasmine / floral crown */}
          <circle
            pathLength={1}
            style={strokeStyle}
            cx="92"
            cy="72"
            r="14"
            stroke="#15110F"
            strokeWidth="1.5"
          />
          <circle
            pathLength={1}
            style={strokeStyle}
            cx="120"
            cy="64"
            r="16"
            stroke="#C4262E"
            strokeWidth="1.5"
          />
          <circle
            pathLength={1}
            style={strokeStyle}
            cx="148"
            cy="72"
            r="14"
            stroke="#15110F"
            strokeWidth="1.5"
          />
        </g>
      );

    case 'razor-and-brush':
      return (
        <g>
          <circle cx="92" cy="112" r="42" fill="#9AAA94" fillOpacity="0.4" style={fillStyle} />
          <path
            d="M68 152H116L108 222H76L68 152Z"
            fill="#E9DDD0"
            style={fillStyle}
          />
          {/* Shaving brush */}
          <path
            pathLength={1}
            style={strokeStyle}
            d="M58 118C58 82 126 82 126 118C126 138 112 150 92 150C72 150 58 138 58 118Z"
            stroke="#15110F"
            strokeWidth="1.5"
          />
          <path
            pathLength={1}
            style={strokeStyle}
            d="M72 150H112L106 220C104 228 80 228 78 220L72 150Z"
            stroke="#15110F"
            strokeWidth="1.5"
            strokeLinejoin="round"
          />
          {/* Folding straight razor */}
          <path
            pathLength={1}
            style={strokeStyle}
            d="M148 56L176 48L158 148L134 144L148 56Z"
            stroke="#15110F"
            strokeWidth="1.5"
            strokeLinejoin="round"
          />
          <path
            pathLength={1}
            style={strokeStyle}
            d="M146 144L184 226C188 234 174 242 168 232L134 148"
            stroke="#C4262E"
            strokeWidth="1.5"
            strokeLinecap="round"
          />
        </g>
      );

    case 'salon-chair':
    default:
      return (
        <g>
          <path
            d="M68 62C68 42 172 42 172 62V138C172 158 68 158 68 138V62Z"
            fill="#F2C9C0"
            style={fillStyle}
          />
          <rect x="56" y="136" width="128" height="34" rx="14" fill="#E9DDD0" style={fillStyle} />
          {/* Styling chair backrest & armrests */}
          <rect
            pathLength={1}
            style={strokeStyle}
            x="72"
            y="48"
            width="96"
            height="92"
            rx="26"
            stroke="#15110F"
            strokeWidth="1.5"
          />
          <rect
            pathLength={1}
            style={strokeStyle}
            x="58"
            y="138"
            width="124"
            height="30"
            rx="12"
            stroke="#15110F"
            strokeWidth="1.5"
          />
          <path
            pathLength={1}
            style={strokeStyle}
            d="M58 104H46V152H58M182 104H194V152H182"
            stroke="#C4262E"
            strokeWidth="1.5"
            strokeLinecap="round"
            strokeLinejoin="round"
          />
          {/* Hydraulic base & footrest */}
          <path
            pathLength={1}
            style={strokeStyle}
            d="M120 168V228M82 228H158M92 204H148"
            stroke="#15110F"
            strokeWidth="1.5"
            strokeLinecap="round"
          />
        </g>
      );
  }
}
