// client/src/components/Intro/introConstants.js

export const INTRO_STATES = {
  LOADING: 'LOADING',             // Rapid counter to 99%, segmented bar, dynamic changing telemetry lines
  ALERT: 'ALERT',                 // "LARPER DETECTED" banner, fast orange screen wash
  TURN_GREEN: 'TURN_GREEN',       // Snappy cut to green, counter 99% -> 100%
  COMPLETE: 'COMPLETE',           // 100% flash & quick hold
  TYPE_LOGO: 'TYPE_LOGO',         // Fast snappy LARPER OR CODER typing
  LOGO_FADE_OUT: 'LOGO_FADE_OUT', // LARPER OR CODER vanishes cleanly
  TRANSFORM: 'TRANSFORM',         // Centered POWERED BY + Celestius logo appearance & unified synchronized reforge
  AUTO_ENTER: 'AUTO_ENTER',       // Clean fade out into the site
};

export const PRESENTER_NAME = 'CELESTIUS';

export const TIMINGS = {
  LOADING_DURATION: 900,          // Fast climb: 0 to 99% in 0.9s
  ALERT_DURATION: 750,            // Snappy orange alert: 0.75s
  TURN_GREEN_DURATION: 800,       // Snappy green verify: 0.8s
  COMPLETE_HOLD: 160,             // 0.16s snap flash
  HOLD_LOGO: 700,                 // hold completed event title before disappearing
  LOGO_DISAPPEAR: 300,            // time for event title to glitch/fade away completely
  TYPE_STEP_SPEED: 78,            // fast logo typing: 13 boxes * 78ms = ~1014ms
  PRESENTED_BY_DECODE: 320,       // "PRESENTED BY" decode scrambler animation
  PRESENTED_BY_SOLO_HOLD: 750,    // distinct delay where "PRESENTED BY" is seen alone
  LOGO_APPEAR_DURATION: 480,      // smooth entrance for original logo
  ORIGINAL_LOGO_HOLD: 1250,       // clearly visible for 1.25s before sweep begins
  TRANSFORM_SWEEP_DURATION: 2000, // 2.0s synchronized pixel-precise reforge sweep
  TRANSFORM_MORPH_DURATION: 2000, // backward-compat alias
  SETTLED_HOLD: 1400,             // 1.4s hold on modified logo for clear observation
  DISAPPEAR_DURATION: 520,        // high-speed fine red particle scatter & laser rupture
  FADE_OUT_DURATION: 280,         // smooth fade out to site
  REDUCED_MOTION_HOLD: 1200,
};

export const SPLASH_TIMINGS = {
  FADE_IN: 300,
  HOLD: 1000,
  FADE_OUT: 300,
  REDUCED_HOLD: 1000,
};

// Dynamic changing status messages during the loading phase
export const LOADING_STATUS_MESSAGES = [
  '> telemetry: scanning memory space...',
  '> initializing quantum kernel [OK]...',
  '> grepping for resume buzzwords...',
  '> measuring aura levels...',
  '> verifying participant clearance...',
  '> integrity check in progress...',
];

// Exact sampled colors from client/src/assets/logo.png
export const COLORS = {
  bgBase: '#050507',
  orange: '#F57546',
  orangeGrid: '#C95228',
  orangeEcho: '#7A280D',
  cream: '#F9EDD2',
  creamGrid: '#D8CCAE',
  creamEcho: '#3E3A32',
  yellow: '#FAA012',
  darkText: '#0B0A0D',
  green: '#3DDC84',
  greenGrid: '#228A4E',
  greenEcho: '#11522A',
  borderDark: 'rgba(247, 237, 216, 0.08)',
};

export const STATUS_LINE_LOADING = '> telemetry: scanning memory space...';

export const TOTAL_SEGMENTS = 26;

// Particle density scaling constants
export const PARTICLES_PHONE = 36;
export const PARTICLES_TABLET = 54;
export const PARTICLES_DESKTOP = 72;

export const SESSION_KEYS = {
  INTRO_SEEN: 'larper_or_coder_intro_seen',
  SOUND_ENABLED: 'larper_or_coder_sound_enabled',
};

// Dimensions for the tight cropped typing images (840 x 328, aspect ratio ~2.561)
export const LOGO_CANVAS_WIDTH = 840;
export const LOGO_CANVAS_HEIGHT = 328;

/**
 * Letter reveal bounding boxes for logo-typing.png (LARPER OR CODER).
 */
export const LOGO_REVEAL_BOXES = [
  // Top line: LARPER
  { id: 'logo-top-0', name: 'L', x: 125, y: 10, w: 105, h: 135, leftPct: '14.88%', topPct: '3.05%', wPct: '12.5%', hPct: '41.16%', cursor: { x: 232, y: 122, w: 38, h: 18 } },
  { id: 'logo-top-1', name: 'A', x: 230, y: 10, w: 103, h: 135, leftPct: '27.38%', topPct: '3.05%', wPct: '12.26%', hPct: '41.16%', cursor: { x: 335, y: 122, w: 38, h: 18 } },
  { id: 'logo-top-2', name: 'R', x: 333, y: 10, w: 97,  h: 135, leftPct: '39.64%', topPct: '3.05%', wPct: '11.55%', hPct: '41.16%', cursor: { x: 432, y: 122, w: 38, h: 18 } },
  { id: 'logo-top-3', name: 'P', x: 430, y: 10, w: 102, h: 135, leftPct: '51.19%', topPct: '3.05%', wPct: '12.14%', hPct: '41.16%', cursor: { x: 534, y: 122, w: 38, h: 18 } },
  { id: 'logo-top-4', name: 'E', x: 532, y: 10, w: 91,  h: 135, leftPct: '63.33%', topPct: '3.05%', wPct: '10.83%', hPct: '41.16%', cursor: { x: 625, y: 122, w: 38, h: 18 } },
  { id: 'logo-top-5', name: 'R', x: 623, y: 10, w: 102, h: 135, leftPct: '74.17%', topPct: '3.05%', wPct: '12.14%', hPct: '41.16%', cursor: { x: 727, y: 122, w: 38, h: 18 } },
  // Middle row: [-- OR --]
  { id: 'logo-mid-0', name: 'TAG_OR', x: 130, y: 140, w: 595, h: 76, leftPct: '15.48%', topPct: '42.68%', wPct: '70.83%', hPct: '23.17%', cursor: { x: 225, y: 282, w: 44, h: 16 } },
  // Bottom line: CODER
  { id: 'logo-bot-0', name: 'C', x: 135, y: 216, w: 100, h: 92, leftPct: '16.07%', topPct: '65.85%', wPct: '11.9%', hPct: '28.05%', cursor: { x: 240, y: 282, w: 44, h: 16 } },
  { id: 'logo-bot-1', name: 'O', x: 235, y: 216, w: 105, h: 92, leftPct: '27.98%', topPct: '65.85%', wPct: '12.5%', hPct: '28.05%', cursor: { x: 348, y: 282, w: 44, h: 16 } },
  { id: 'logo-bot-2', name: 'D', x: 340, y: 216, w: 105, h: 92, leftPct: '40.48%', topPct: '65.85%', wPct: '12.5%', hPct: '28.05%', cursor: { x: 454, y: 282, w: 44, h: 16 } },
  { id: 'logo-bot-3', name: 'E', x: 445, y: 216, w: 100, h: 92, leftPct: '52.98%', topPct: '65.85%', wPct: '11.9%', hPct: '28.05%', cursor: { x: 554, y: 282, w: 44, h: 16 } },
  { id: 'logo-bot-4', name: 'R', x: 545, y: 216, w: 100, h: 92, leftPct: '64.88%', topPct: '65.85%', wPct: '11.9%', hPct: '28.05%', cursor: { x: 653, y: 282, w: 53, h: 16 } },
  // End cursor reveal (the baked-in cursor)
  { id: 'logo-cur-0', name: 'CURSOR', x: 650, y: 275, w: 60, h: 28, leftPct: '77.38%', topPct: '83.84%', wPct: '7.14%', hPct: '8.54%', cursor: { x: 653, y: 282, w: 53, h: 16 } },
];
