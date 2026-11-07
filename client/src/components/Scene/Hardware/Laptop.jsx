// client/src/components/Scene/Hardware/Laptop.jsx
import React, { useState, useEffect, useRef } from 'react';
import styles from './Hardware.module.css';
import { THEME, hexToRgba, LAPTOP_HALO } from '../hardwareConfig.js';
import ScreenCode from './ScreenCode.jsx';

export default function Laptop({
  width = 240,
  height = 150,
  color = THEME.orange,
  opacity = THEME.bigPieceOpacity,
  floatVariant = 'A',
  hasHalo = true,
  haloStrong = false,
  isHero = false,
  className = '',
  style = {},
}) {
  const containerRef = useRef(null);
  const [isVisible, setIsVisible] = useState(true);

  useEffect(() => {
    if (typeof IntersectionObserver === 'undefined') return;
    const observer = new IntersectionObserver(
      ([entry]) => {
        setIsVisible(entry.isIntersecting);
      },
      { threshold: 0.05 }
    );
    if (containerRef.current) {
      observer.observe(containerRef.current);
    }
    return () => observer.disconnect();
  }, []);

  const effectiveOpacity = isHero ? Math.max(opacity, 0.70) : opacity;
  const primary = hexToRgba(color, effectiveOpacity);
  const primaryFaint = hexToRgba(color, effectiveOpacity * 0.8);
  const cream = hexToRgba(THEME.cream, effectiveOpacity > 0.3 ? 0.90 : THEME.creamDetailOpacity);
  const creamFaint = hexToRgba(THEME.cream, effectiveOpacity > 0.3 ? 0.70 : THEME.creamDetailOpacity * 0.7);
  const creamDim = hexToRgba(THEME.cream, effectiveOpacity > 0.3 ? 0.55 : THEME.creamDetailOpacity * 0.5);
  const accent = hexToRgba(color, effectiveOpacity > 0.3 ? 0.90 : Math.min(effectiveOpacity + 0.15, 0.6));

  const svgWidth = width === 'auto' ? undefined : width;
  const svgHeight = height === 'auto' ? undefined : height;

  return (
    <div
      ref={containerRef}
      className={`${styles.hardwarePiece} ${styles['float' + floatVariant]} ${isVisible ? styles.screenActive : styles.screenPaused} ${isHero ? styles.heroLaptopPiece : ''} ${className}`}
      style={{ width, height, ...style }}
      aria-hidden="true"
    >
      {hasHalo && LAPTOP_HALO && (
        <div className={`${styles.halo} ${haloStrong ? styles.haloStrong : ''}`} />
      )}
      <svg
        className={styles.pieceSvg}
        width={svgWidth}
        height={svgHeight}
        viewBox="0 0 240 150"
        fill="none"
        xmlns="http://www.w3.org/2000/svg"
      >
        {/* Open Screen Lid - Pure Line Art */}
        <rect
          x="30"
          y="10"
          width="180"
          height="106"
          rx="10"
          fill="none"
          stroke={primary}
          strokeWidth="2.4"
        />
        <rect
          x="40"
          y="20"
          width="160"
          height="86"
          rx="5"
          fill="none"
          stroke={primaryFaint}
          strokeWidth="1.5"
        />
        {/* Webcam */}
        <circle cx="120" cy="15" r="1.5" fill="none" stroke={cream} strokeWidth="1.2" />

        {/* Dynamic Cancelled Code Sequence */}
        <ScreenCode
          startX={48}
          startY={38}
          lineGap={14}
          orange={THEME.orange}
          cream="rgba(247, 237, 216, 0.92)"
          faintCream="rgba(247, 237, 216, 0.72)"
        />

        {/* Hinge */}
        <line x1="88" y1="116" x2="152" y2="116" stroke={primary} strokeWidth="2.5" strokeLinecap="round" />

        {/* Keyboard Base Baseplate - Pure Line Art */}
        <path
          d="M 12 124 L 38 118 L 202 118 L 228 124 Q 234 126 226 134 L 210 142 Q 202 144 186 144 L 54 144 Q 38 144 30 142 L 14 134 Q 6 126 12 124 Z"
          fill="none"
          stroke={primary}
          strokeWidth="2.4"
        />

        {/* Keyboard Keys Grid (subtle slit rows) */}
        <line x1="48" y1="124" x2="192" y2="124" stroke={creamDim} strokeWidth="1.3" strokeDasharray="8 4" />
        <line x1="44" y1="130" x2="196" y2="130" stroke={creamDim} strokeWidth="1.3" strokeDasharray="10 5" />

        {/* Trackpad */}
        <rect x="96" y="133" width="48" height="9" rx="2" fill="none" stroke={creamFaint} strokeWidth="1.2" />
        {/* Status LED */}
        <circle cx="120" cy="120" r="1.5" fill="none" stroke={accent} strokeWidth="1.5" />
      </svg>
    </div>
  );
}
