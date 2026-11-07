// client/src/components/Scene/Hardware/Cpu.jsx
import React from 'react';
import styles from './Hardware.module.css';
import { THEME, hexToRgba } from '../hardwareConfig.js';

export default function Cpu({
  width = 95,
  height = 95,
  color = THEME.orange,
  opacity = THEME.bigPieceOpacity,
  floatVariant = 'C',
  hasHalo = true,
  haloStrong = false,
  className = '',
  style = {},
}) {
  const primary = hexToRgba(color, opacity);
  const primaryFaint = hexToRgba(color, opacity * 0.8);
  const cream = hexToRgba(THEME.cream, Math.min(THEME.creamDetailOpacity * 1.4, 0.7));
  const creamFaint = hexToRgba(THEME.cream, Math.min(THEME.creamDetailOpacity, 0.5));
  const accent = hexToRgba(color, Math.min(opacity + 0.15, 0.75));

  // 10 pins per side
  const pinPositions = [18, 24, 30, 36, 42, 48, 54, 60, 66, 72];

  return (
    <div
      className={`${styles.hardwarePiece} ${styles['float' + floatVariant]} ${className}`}
      style={{ width, height, ...style }}
      aria-hidden="true"
    >
      {hasHalo && (
        <div className={`${styles.halo} ${haloStrong ? styles.haloStrong : ''}`} />
      )}
      <svg
        className={styles.pieceSvg}
        width={width}
        height={height}
        viewBox="0 0 95 95"
        fill="none"
        xmlns="http://www.w3.org/2000/svg"
      >
        {/* Outgoing PCB Circuit Traces */}
        {pinPositions.map((p, idx) => (
          <g key={idx}>
            <line x1={p} y1="0" x2={p} y2="10" stroke={creamFaint} strokeWidth="1.2" />
            <line x1={p} y1="85" x2={p} y2="95" stroke={creamFaint} strokeWidth="1.2" />
            <line x1="0" y1={p} x2="10" y2={p} stroke={creamFaint} strokeWidth="1.2" />
            <line x1="85" y1={p} x2="95" y2={p} stroke={creamFaint} strokeWidth="1.2" />
          </g>
        ))}

        {/* 10 Pins per side (extending outward) */}
        {pinPositions.map((p, idx) => (
          <g key={`p-${idx}`}>
            <rect x={p - 1.5} y="2" width="3" height="8" rx="0.5" fill="none" stroke={cream} strokeWidth="1.2" />
            <rect x={p - 1.5} y="85" width="3" height="8" rx="0.5" fill="none" stroke={cream} strokeWidth="1.2" />
            <rect x="2" y={p - 1.5} width="8" height="3" rx="0.5" fill="none" stroke={cream} strokeWidth="1.2" />
            <rect x="85" y={p - 1.5} width="8" height="3" rx="0.5" fill="none" stroke={cream} strokeWidth="1.2" />
          </g>
        ))}

        {/* Green/Black PCB Substrate - Pure Line Art */}
        <rect
          x="10"
          y="10"
          width="75"
          height="75"
          rx="5"
          fill="none"
          stroke={primary}
          strokeWidth="2.2"
        />

        {/* Gold Corner Alignment Triangle Indicator */}
        <polygon points="12,12 21,12 12,21" fill="none" stroke={accent} strokeWidth="1.8" />

        {/* Metallic Integrated Heat Spreader (IHS) */}
        <rect
          x="20"
          y="20"
          width="55"
          height="55"
          rx="5"
          fill="none"
          stroke={primary}
          strokeWidth="2"
        />
        <rect
          x="24"
          y="24"
          width="47"
          height="47"
          rx="3"
          fill="none"
          stroke={primaryFaint}
          strokeWidth="1.4"
        />

        {/* Die Engraving Laser Text & Logo Details */}
        <line x1="32" y1="36" x2="63" y2="36" stroke={primary} strokeWidth="1.6" strokeLinecap="round" />
        <line x1="32" y1="44" x2="55" y2="44" stroke={cream} strokeWidth="1.4" strokeLinecap="round" />
        <line x1="32" y1="52" x2="48" y2="52" stroke={cream} strokeWidth="1.4" strokeLinecap="round" />

        {/* Silicon Die Accent Dot */}
        <circle cx="60" cy="58" r="2.5" fill="none" stroke={accent} strokeWidth="1.6" />
      </svg>
    </div>
  );
}
