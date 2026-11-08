// client/src/components/Events/TugOfAuraVisual.jsx
import React, { memo } from 'react';
import styles from './Events.module.css';

function TugOfAuraVisual() {
  return (
    <div className={styles.tugCard}>
      {/* Arena Stage */}
      <div className={styles.arenaSvgContainer}>
        <svg
          className={styles.tugArenaSvg}
          viewBox="0 0 540 195"
          preserveAspectRatio="xMidYMid meet"
          aria-label="Tug of War battle between Team Omega and Team Alpha"
          role="img"
        >
          <defs>
            {/* Glowing Team Auras */}
            <radialGradient id="omegaAuraGlow" cx="50%" cy="50%" r="50%">
              <stop offset="0%" stopColor="#FAA012" stopOpacity="0.32" />
              <stop offset="100%" stopColor="#FAA012" stopOpacity="0" />
            </radialGradient>
            <radialGradient id="alphaAuraGlow" cx="50%" cy="50%" r="50%">
              <stop offset="0%" stopColor="#F26B3A" stopOpacity="0.32" />
              <stop offset="100%" stopColor="#F26B3A" stopOpacity="0" />
            </radialGradient>

            {/* Rope Manila Gradient */}
            <linearGradient id="ropeCoreGrad" x1="0%" y1="0%" x2="0%" y2="100%">
              <stop offset="0%" stopColor="#D48A37" />
              <stop offset="35%" stopColor="#B36820" />
              <stop offset="70%" stopColor="#874712" />
              <stop offset="100%" stopColor="#4A2608" />
            </linearGradient>

            {/* Center Deadlock Laser Line */}
            <linearGradient id="centerLaserGrad" x1="0%" y1="0%" x2="0%" y2="100%">
              <stop offset="0%" stopColor="#FFFFFF" stopOpacity="0" />
              <stop offset="45%" stopColor="#FFFFFF" stopOpacity="0.9" />
              <stop offset="100%" stopColor="#FFFFFF" stopOpacity="0.15" />
            </linearGradient>
          </defs>

          {/* Background Arena Subtle Glows */}
          <circle cx="120" cy="115" r="85" fill="url(#omegaAuraGlow)" />
          <circle cx="420" cy="115" r="85" fill="url(#alphaAuraGlow)" />

          {/* Team Titles: Only text in the visual */}
          <text x="60" y="38" fill="#FAA012" fontSize="13.5" fontFamily="var(--font-mono, monospace)" fontWeight="800" letterSpacing="0.08em">TEAM OMEGA</text>
          <text x="480" y="38" textAnchor="end" fill="#F26B3A" fontSize="13.5" fontFamily="var(--font-mono, monospace)" fontWeight="800" letterSpacing="0.08em">TEAM ALPHA</text>

          {/* Turf / Ground Baseline */}
          <line x1="20" y1="168" x2="520" y2="168" stroke="rgba(247, 237, 216, 0.12)" strokeWidth="2" strokeDasharray="5 5" />
          <line x1="160" y1="168" x2="380" y2="168" stroke="rgba(255, 255, 255, 0.28)" strokeWidth="2.5" />

          {/* Boundary Threshold Marks */}
          <line x1="210" y1="158" x2="210" y2="174" stroke="#FAA012" strokeWidth="2" strokeOpacity="0.8" />
          <line x1="330" y1="158" x2="330" y2="174" stroke="#F26B3A" strokeWidth="2" strokeOpacity="0.8" />

          {/* Deadlock Centerline */}
          <line x1="270" y1="65" x2="270" y2="172" stroke="url(#centerLaserGrad)" strokeWidth="2" strokeDasharray="3 3" />
          <polygon points="266,172 274,172 270,165" fill="#FFFFFF" />

          {/* Dynamic Ground Friction Sparks (shown during pulls) */}
          <g className={styles.groundSparksOmega}>
            <line x1="72" y1="168" x2="56" y2="163" stroke="#FAA012" strokeWidth="2" strokeLinecap="round" />
            <line x1="142" y1="168" x2="128" y2="162" stroke="#FAA012" strokeWidth="2" strokeLinecap="round" />
            <circle cx="58" cy="162" r="1.5" fill="#FAA012" />
            <circle cx="130" cy="161" r="1.5" fill="#FAA012" />
          </g>
          <g className={styles.groundSparksAlpha}>
            <line x1="398" y1="168" x2="414" y2="163" stroke="#F26B3A" strokeWidth="2" strokeLinecap="round" />
            <line x1="468" y1="168" x2="484" y2="162" stroke="#F26B3A" strokeWidth="2" strokeLinecap="round" />
            <circle cx="412" cy="162" r="1.5" fill="#F26B3A" />
            <circle cx="482" cy="161" r="1.5" fill="#F26B3A" />
          </g>

          {/* ============================================================== */}
          {/* THE TUG-OF-WAR ACTIVE CONTEST ASSEMBLY (Animated Battle Group) */}
          {/* ============================================================== */}
          <g className={styles.tugActiveAssembly}>
            {/* 1. Heavy Manila Braided Rope Under High Tension */}
            <g className={styles.ropeStrandGroup}>
              {/* Rope Under-shadow */}
              <line x1="20" y1="114" x2="520" y2="114" stroke="#1A0D04" strokeWidth="12" strokeLinecap="round" />
              {/* Main Rope Body */}
              <line x1="20" y1="112" x2="520" y2="112" stroke="url(#ropeCoreGrad)" strokeWidth="10" strokeLinecap="round" />
              
              {/* Twisted Braided Fiber Ridges (Authentic braided rope texture) */}
              <line x1="20" y1="109" x2="520" y2="109" stroke="#E5A855" strokeWidth="2.5" strokeDasharray="9 6" strokeLinecap="round" />
              <line x1="20" y1="112" x2="520" y2="112" stroke="#5E2F0A" strokeWidth="2" strokeDasharray="4 8" strokeLinecap="round" />
              <line x1="20" y1="115" x2="520" y2="115" stroke="#2E1402" strokeWidth="2.5" strokeDasharray="7 7" strokeLinecap="round" />

              {/* Frayed Ends with Whipping Twine */}
              {/* Left End */}
              <rect x="22" y="106" width="8" height="12" rx="2" fill="#2E1402" stroke="#E5A855" strokeWidth="1" />
              <path d="M 22 108 Q 14 102 8 106 M 22 112 Q 12 112 6 111 M 22 116 Q 14 120 8 118" stroke="#D48A37" strokeWidth="1.8" fill="none" strokeLinecap="round" />
              {/* Right End */}
              <rect x="510" y="106" width="8" height="12" rx="2" fill="#2E1402" stroke="#E5A855" strokeWidth="1" />
              <path d="M 518 108 Q 526 102 532 106 M 518 112 Q 528 112 534 111 M 518 116 Q 526 120 532 118" stroke="#D48A37" strokeWidth="1.8" fill="none" strokeLinecap="round" />
            </g>

            {/* 2. Authentic Center Tied Ribbon / Bandana Marker */}
            <g className={styles.centerRibbonGroup} transform="translate(270, 112)">
              {/* Crimson aura around center marker */}
              <circle cx="0" cy="0" r="16" fill="rgba(255, 59, 48, 0.28)" />
              {/* Tied Knot around rope */}
              <rect x="-9" y="-8" width="18" height="16" rx="4" fill="#FF3B30" stroke="#FFFFFF" strokeWidth="1.6" />
              <line x1="-9" y1="0" x2="9" y2="0" stroke="#8A0D06" strokeWidth="2" />
              {/* Twin Hanging Fabric Ribbon Tails */}
              <path
                className={styles.ribbonTailLeft}
                d="M -5 7 C -9 20 -14 32 -8 44 L -2 41 C -6 28 -2 19 0 7 Z"
                fill="#FF3B30"
                stroke="#FFFFFF"
                strokeWidth="0.8"
              />
              <path
                className={styles.ribbonTailRight}
                d="M 1 7 C 5 20 10 32 4 44 L 10 41 C 14 28 8 19 6 7 Z"
                fill="#E02424"
                stroke="#FFFFFF"
                strokeWidth="0.8"
              />
              {/* Center Ring Indicator */}
              <circle cx="0" cy="0" r="4" fill="#FFD600" stroke="#8A0D06" strokeWidth="1.2" />
            </g>

            {/* 3. Team OMEGA Pullers (Leaning Back Hard at 40 Degrees to the Left) */}
            <g className={styles.omegaPullersGroup}>
              {/* Omega Puller 1: Back Anchor (Heavy Heaver) */}
              <g transform="translate(85, -4)">
                {/* Boots braced deep into ground */}
                <polygon points="-18,172 2,172 0,164 -16,164" fill="#1C1C20" stroke="#FAA012" strokeWidth="1.2" />
                <polygon points="12,172 32,172 30,164 14,164" fill="#1C1C20" stroke="#FAA012" strokeWidth="1.2" />
                {/* Powerful legs braced back */}
                <path d="M -8 164 L 6 142 L 18 126" stroke="#141418" strokeWidth="9" strokeLinecap="round" strokeLinejoin="round" />
                <path d="M 22 164 L 14 140 L 18 126" stroke="#222228" strokeWidth="8" strokeLinecap="round" strokeLinejoin="round" />
                {/* Torso heaved back at 42 degrees */}
                <path d="M 18 126 L -6 94" stroke="#1A1A20" strokeWidth="14" strokeLinecap="round" />
                {/* Cyber harness strap */}
                <line x1="8" y1="120" x2="-4" y2="98" stroke="#FAA012" strokeWidth="2.8" strokeLinecap="round" />
                {/* Athlete Head with Amber Visor */}
                <circle cx="-14" cy="84" r="9.5" fill="#111114" stroke="#FAA012" strokeWidth="1.5" />
                <path d="M -19 84 L -9 84" stroke="#FAA012" strokeWidth="3" strokeLinecap="round" />
                {/* Arms tightly clutched around rope */}
                <path d="M -4 96 L 10 108 L 26 114" stroke="#25252E" strokeWidth="6.5" strokeLinecap="round" strokeLinejoin="round" />
                <circle cx="26" cy="114" r="5" fill="#FAA012" stroke="#0B0B0D" strokeWidth="1.2" />
              </g>

              {/* Omega Puller 2: Front Heaver (Explosive Tug Posture) */}
              <g transform="translate(150, -4)">
                {/* Boots braced deep into ground */}
                <polygon points="-16,172 4,172 2,164 -14,164" fill="#1C1C20" stroke="#FAA012" strokeWidth="1.2" />
                <polygon points="16,172 36,172 34,164 18,164" fill="#1C1C20" stroke="#FAA012" strokeWidth="1.2" />
                {/* Legs heaving back */}
                <path d="M -6 164 L 10 142 L 24 126" stroke="#141418" strokeWidth="9.5" strokeLinecap="round" strokeLinejoin="round" />
                <path d="M 26 164 L 18 140 L 24 126" stroke="#222228" strokeWidth="8" strokeLinecap="round" strokeLinejoin="round" />
                {/* Torso heaved back */}
                <path d="M 24 126 L 0 92" stroke="#1A1A20" strokeWidth="15" strokeLinecap="round" />
                {/* Cyber harness strap */}
                <line x1="14" y1="118" x2="2" y2="96" stroke="#FAA012" strokeWidth="2.8" strokeLinecap="round" />
                {/* Head with Amber Visor */}
                <circle cx="-9" cy="82" r="10" fill="#111114" stroke="#FAA012" strokeWidth="1.5" />
                <path d="M -14 82 L -4 82" stroke="#FAA012" strokeWidth="3" strokeLinecap="round" />
                {/* Arms gripping rope */}
                <path d="M 2 94 L 18 107 L 30 114" stroke="#25252E" strokeWidth="7" strokeLinecap="round" strokeLinejoin="round" />
                <circle cx="30" cy="114" r="5.5" fill="#FAA012" stroke="#0B0B0D" strokeWidth="1.2" />
              </g>
            </g>

            {/* 4. Team ALPHA Pullers (Leaning Back Hard at 40 Degrees to the Right) */}
            <g className={styles.alphaPullersGroup}>
              {/* Alpha Puller 1: Front Heaver (Explosive Tug Posture facing left, pulling right) */}
              <g transform="translate(390, -4)">
                {/* Boots braced deep into ground */}
                <polygon points="16,172 -4,172 -2,164 14,164" fill="#1C1C20" stroke="#F26B3A" strokeWidth="1.2" />
                <polygon points="-16,172 -36,172 -34,164 -18,164" fill="#1C1C20" stroke="#F26B3A" strokeWidth="1.2" />
                {/* Legs heaving back right */}
                <path d="M 6 164 L -10 142 L -24 126" stroke="#141418" strokeWidth="9.5" strokeLinecap="round" strokeLinejoin="round" />
                <path d="M -26 164 L -18 140 L -24 126" stroke="#222228" strokeWidth="8" strokeLinecap="round" strokeLinejoin="round" />
                {/* Torso heaved back right */}
                <path d="M -24 126 L 0 92" stroke="#1A1A20" strokeWidth="15" strokeLinecap="round" />
                {/* Cyber harness strap */}
                <line x1="-14" y1="118" x2="-2" y2="96" stroke="#F26B3A" strokeWidth="2.8" strokeLinecap="round" />
                {/* Head with Orange Visor */}
                <circle cx="9" cy="82" r="10" fill="#111114" stroke="#F26B3A" strokeWidth="1.5" />
                <path d="M 14 82 L 4 82" stroke="#F26B3A" strokeWidth="3" strokeLinecap="round" />
                {/* Arms gripping rope */}
                <path d="M -2 94 L -18 107 L -30 114" stroke="#25252E" strokeWidth="7" strokeLinecap="round" strokeLinejoin="round" />
                <circle cx="-30" cy="114" r="5.5" fill="#F26B3A" stroke="#0B0B0D" strokeWidth="1.2" />
              </g>

              {/* Alpha Puller 2: Back Anchor (Heavy Heaver facing left, pulling right) */}
              <g transform="translate(455, -4)">
                {/* Boots braced deep into ground */}
                <polygon points="18,172 -2,172 0,164 16,164" fill="#1C1C20" stroke="#F26B3A" strokeWidth="1.2" />
                <polygon points="-12,172 -32,172 -30,164 -14,164" fill="#1C1C20" stroke="#F26B3A" strokeWidth="1.2" />
                {/* Powerful legs braced back */}
                <path d="M 8 164 L -6 142 L -18 126" stroke="#141418" strokeWidth="9" strokeLinecap="round" strokeLinejoin="round" />
                <path d="M -22 164 L -14 140 L -18 126" stroke="#222228" strokeWidth="8" strokeLinecap="round" strokeLinejoin="round" />
                {/* Torso heaved back right */}
                <path d="M -18 126 L 6 94" stroke="#1A1A20" strokeWidth="14" strokeLinecap="round" />
                {/* Cyber harness strap */}
                <line x1="-8" y1="120" x2="4" y2="98" stroke="#F26B3A" strokeWidth="2.8" strokeLinecap="round" />
                {/* Athlete Head with Orange Visor */}
                <circle cx="14" cy="84" r="9.5" fill="#111114" stroke="#F26B3A" strokeWidth="1.5" />
                <path d="M 19 84 L 9 84" stroke="#F26B3A" strokeWidth="3" strokeLinecap="round" />
                {/* Arms tightly clutched around rope */}
                <path d="M 4 96 L -10 108 L -26 114" stroke="#25252E" strokeWidth="6.5" strokeLinecap="round" strokeLinejoin="round" />
                <circle cx="-26" cy="114" r="5" fill="#F26B3A" stroke="#0B0B0D" strokeWidth="1.2" />
              </g>
            </g>
          </g>
        </svg>
      </div>
    </div>
  );
}

export default memo(TugOfAuraVisual);
