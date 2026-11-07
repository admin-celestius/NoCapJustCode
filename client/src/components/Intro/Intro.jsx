// client/src/components/Intro/Intro.jsx
import React, { useState, useEffect, useRef, useCallback } from 'react';
import styles from './Intro.module.css';
import ImageTypewriter from './ImageTypewriter.jsx';
import logoTypingImg from '../../assets/intro/logo-typing.png';
import { logTimelineEvent } from '../../utils/timelineLogger.js';
import {
  INTRO_STATES,
  PRESENTER_NAME,
  TIMINGS,
  LOADING_STATUS_MESSAGES,
  PARTICLES_PHONE,
  PARTICLES_TABLET,
  PARTICLES_DESKTOP,
  SESSION_KEYS,
  LOGO_REVEAL_BOXES,
} from './introConstants.js';

export default function Intro({ onComplete }) {
  // Sound enabled state: default ON on desktop, OFF on mobile/tablet unless user has a stored preference
  const [soundEnabled] = useState(() => {
    try {
      const stored = sessionStorage.getItem(SESSION_KEYS.SOUND_ENABLED);
      if (stored !== null) {
        return stored === 'true';
      }
      if (typeof window !== 'undefined' && window.matchMedia) {
        return window.matchMedia('(hover: hover) and (pointer: fine) and (min-width: 1024px)').matches;
      }
      return false;
    } catch {
      return false;
    }
  });

  // Check prefers-reduced-motion
  const isReducedMotion =
    typeof window !== 'undefined' &&
    window.matchMedia &&
    window.matchMedia('(prefers-reduced-motion: reduce)').matches;

  // State machine state: always starts at LOADING on every reload
  const [state, setState] = useState(() =>
    isReducedMotion ? INTRO_STATES.TRANSFORM : INTRO_STATES.LOADING
  );

  // Loading & status values
  const [progress, setProgress] = useState(0);

  // Event title typing: revealed count of LARPER OR CODER
  const [revealedCount, setRevealedCount] = useState(() =>
    isReducedMotion ? LOGO_REVEAL_BOXES.length : 0
  );

  // Transformation states: 'idle' | 'presented_by' | 'appearing' | 'original' | 'morphing' | 'settled' | 'disappearing' | 'fading_out'
  const [transformStage, setTransformStage] = useState(() =>
    isReducedMotion ? 'settled' : 'idle'
  );
  const [sweepProgress, setSweepProgress] = useState(() => (isReducedMotion ? 1 : 0));
  const sweepProgressRef = useRef(isReducedMotion ? 1 : 0);
  const [glitchText, setGlitchText] = useState('PRESENTED BY');

  const skipBtnRef = useRef(null);
  const canvasRef = useRef(null);
  const scatterCanvasRef = useRef(null);
  const audioCtxRef = useRef(null);
  const animationFrameRef = useRef(null);
  const scatterAnimRef = useRef(null);

  // Lock body scroll on mount, restore on unmount
  useEffect(() => {
    document.body.classList.add('scroll-locked');
    return () => {
      document.body.classList.remove('scroll-locked');
    };
  }, []);

  // Focus skip button on mount
  useEffect(() => {
    if (skipBtnRef.current) {
      skipBtnRef.current.focus();
    }
  }, []);

  // Timeline event tracking
  const prevStateRef = useRef(null);
  useEffect(() => {
    if (prevStateRef.current === null) {
      logTimelineEvent('intro start');
      logTimelineEvent(`phase: ${state}`);
      prevStateRef.current = state;
    } else if (prevStateRef.current !== state) {
      logTimelineEvent(`phase: ${state}`);
      prevStateRef.current = state;
    }
  }, [state]);

  // Web Audio Context initialization & synthesis
  const getAudioCtx = useCallback(() => {
    try {
      if (!audioCtxRef.current) {
        const AudioContextClass = window.AudioContext || window.webkitAudioContext;
        if (AudioContextClass) {
          audioCtxRef.current = new AudioContextClass();
        }
      }
      if (audioCtxRef.current && audioCtxRef.current.state === 'suspended') {
        audioCtxRef.current.resume().catch(() => {});
      }
      return audioCtxRef.current;
    } catch {
      return null;
    }
  }, []);

  const playTick = useCallback(() => {
    if (!soundEnabled) return;
    try {
      const ctx = getAudioCtx();
      if (!ctx) return;
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.type = 'sine';
      osc.frequency.setValueAtTime(1400, ctx.currentTime);
      gain.gain.setValueAtTime(0.025, ctx.currentTime);
      gain.gain.exponentialRampToValueAtTime(0.0001, ctx.currentTime + 0.015);
      osc.connect(gain);
      gain.connect(ctx.destination);
      osc.start();
      osc.stop(ctx.currentTime + 0.018);
    } catch {
      // Audio safety
    }
  }, [soundEnabled, getAudioCtx]);

  // Futuristic digital frequency sweep for code integrity scan (smooth harmonic tone, zero alarm buzzing)
  const playScanTone = useCallback(() => {
    if (!soundEnabled) return;
    try {
      const ctx = getAudioCtx();
      if (!ctx) return;
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.type = 'sine';
      osc.frequency.setValueAtTime(480, ctx.currentTime);
      osc.frequency.exponentialRampToValueAtTime(720, ctx.currentTime + 0.22);
      gain.gain.setValueAtTime(0.038, ctx.currentTime);
      gain.gain.exponentialRampToValueAtTime(0.0001, ctx.currentTime + 0.28);
      osc.connect(gain);
      gain.connect(ctx.destination);
      osc.start();
      osc.stop(ctx.currentTime + 0.3);
    } catch {
      // Audio safety
    }
  }, [soundEnabled, getAudioCtx]);

  const playDing = useCallback((freq = 587, targetFreq = 880) => {
    if (!soundEnabled) return;
    try {
      const ctx = getAudioCtx();
      if (!ctx) return;
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.type = 'triangle';
      osc.frequency.setValueAtTime(freq, ctx.currentTime);
      osc.frequency.exponentialRampToValueAtTime(targetFreq, ctx.currentTime + 0.14);
      gain.gain.setValueAtTime(0.08, ctx.currentTime);
      gain.gain.exponentialRampToValueAtTime(0.0001, ctx.currentTime + 0.35);
      osc.connect(gain);
      gain.connect(ctx.destination);
      osc.start();
      osc.stop(ctx.currentTime + 0.38);
    } catch {
      // Audio safety
    }
  }, [soundEnabled, getAudioCtx]);

  // Soothing warm harmonic chord chime for the modified logo arrival
  const playChimeChord = useCallback(() => {
    if (!soundEnabled) return;
    try {
      const ctx = getAudioCtx();
      if (!ctx) return;
      [587.33, 739.99, 880, 1174.66].forEach((freq, idx) => {
        const osc = ctx.createOscillator();
        const gain = ctx.createGain();
        osc.type = 'sine';
        osc.frequency.setValueAtTime(freq, ctx.currentTime + idx * 0.03);
        gain.gain.setValueAtTime(0.045, ctx.currentTime + idx * 0.03);
        gain.gain.exponentialRampToValueAtTime(0.0001, ctx.currentTime + 0.6);
        osc.connect(gain);
        gain.connect(ctx.destination);
        osc.start(ctx.currentTime + idx * 0.03);
        osc.stop(ctx.currentTime + 0.65);
      });
    } catch {
      // Audio safety
    }
  }, [soundEnabled, getAudioCtx]);

  // Gentle rising frequency sweep for logo appearance
  const playChargeUp = useCallback(() => {
    if (!soundEnabled) return;
    try {
      const ctx = getAudioCtx();
      if (!ctx) return;
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.type = 'sine';
      osc.frequency.setValueAtTime(360, ctx.currentTime);
      osc.frequency.exponentialRampToValueAtTime(720, ctx.currentTime + 0.35);
      gain.gain.setValueAtTime(0.03, ctx.currentTime);
      gain.gain.exponentialRampToValueAtTime(0.0001, ctx.currentTime + 0.38);
      osc.connect(gain);
      gain.connect(ctx.destination);
      osc.start();
      osc.stop(ctx.currentTime + 0.4);
    } catch {
      // Audio safety
    }
  }, [soundEnabled, getAudioCtx]);

  // Subtle, warm resonant harmonic hum during the 2-second reforge sweep
  const playReforgeHum = useCallback(() => {
    if (!soundEnabled) return;
    try {
      const ctx = getAudioCtx();
      if (!ctx) return;
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.type = 'sine';
      osc.frequency.setValueAtTime(440, ctx.currentTime);
      osc.frequency.exponentialRampToValueAtTime(587.33, ctx.currentTime + 1.8);
      gain.gain.setValueAtTime(0.015, ctx.currentTime);
      gain.gain.linearRampToValueAtTime(0.025, ctx.currentTime + 0.8);
      gain.gain.exponentialRampToValueAtTime(0.0001, ctx.currentTime + 2.0);
      osc.connect(gain);
      gain.connect(ctx.destination);
      osc.start();
      osc.stop(ctx.currentTime + 2.05);
    } catch {
      // Audio safety
    }
  }, [soundEnabled, getAudioCtx]);

  // Cinematic quantum de-materialization whoosh (smooth futuristic light-speed slipstream, no firecracker bomb thump)
  const playDisappearSound = useCallback(() => {
    if (!soundEnabled) return;
    try {
      const ctx = getAudioCtx();
      if (!ctx) return;
      const t = ctx.currentTime;

      // Layer 1: High-speed laser slipstream whoosh (smooth sine sweep)
      const whooshOsc = ctx.createOscillator();
      const whooshGain = ctx.createGain();
      whooshOsc.type = 'sine';
      whooshOsc.frequency.setValueAtTime(580, t);
      whooshOsc.frequency.exponentialRampToValueAtTime(1400, t + 0.28);
      whooshGain.gain.setValueAtTime(0.035, t);
      whooshGain.gain.exponentialRampToValueAtTime(0.0001, t + 0.38);
      whooshOsc.connect(whooshGain);
      whooshGain.connect(ctx.destination);
      whooshOsc.start();
      whooshOsc.stop(t + 0.4);

      // Layer 2: Soft warm resonant tonal decay (clean sci-fi dematerialize, no explosive thump)
      const toneOsc = ctx.createOscillator();
      const toneGain = ctx.createGain();
      toneOsc.type = 'triangle';
      toneOsc.frequency.setValueAtTime(320, t);
      toneOsc.frequency.exponentialRampToValueAtTime(180, t + 0.35);
      toneGain.gain.setValueAtTime(0.03, t);
      toneGain.gain.exponentialRampToValueAtTime(0.0001, t + 0.38);
      toneOsc.connect(toneGain);
      toneGain.connect(ctx.destination);
      toneOsc.start();
      toneOsc.stop(t + 0.4);
    } catch {
      // Audio safety
    }
  }, [soundEnabled, getAudioCtx]);

  const playKeyClick = useCallback(() => {
    if (!soundEnabled) return;
    try {
      const ctx = getAudioCtx();
      if (!ctx) return;
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.type = 'sine';
      osc.frequency.setValueAtTime(750, ctx.currentTime);
      gain.gain.setValueAtTime(0.02, ctx.currentTime);
      gain.gain.exponentialRampToValueAtTime(0.0001, ctx.currentTime + 0.012);
      osc.connect(gain);
      gain.connect(ctx.destination);
      osc.start();
      osc.stop(ctx.currentTime + 0.015);
    } catch {
      // Audio safety
    }
  }, [soundEnabled, getAudioCtx]);

  // Autoplay handler
  useEffect(() => {
    if (!soundEnabled) return;
    const ctx = getAudioCtx();
    if (!ctx) return;
    if (ctx.state === 'suspended') {
      ctx.resume().catch(() => {});
      const unlockAudio = () => {
        if (ctx.state === 'suspended') {
          ctx.resume().catch(() => {});
        }
      };
      const events = ['click', 'keydown', 'pointerdown', 'touchstart'];
      events.forEach((evt) => window.addEventListener(evt, unlockAudio, { once: true, passive: true }));
      return () => {
        events.forEach((evt) => window.removeEventListener(evt, unlockAudio));
      };
    }
  }, [soundEnabled, getAudioCtx]);

  const cleanupAudio = useCallback(() => {
    if (audioCtxRef.current) {
      try {
        if (audioCtxRef.current.state !== 'closed') {
          audioCtxRef.current.close().catch(() => {});
        }
      } catch {
        // Audio safety
      }
      audioCtxRef.current = null;
    }
  }, []);

  useEffect(() => {
    return () => {
      cleanupAudio();
    };
  }, [cleanupAudio]);

  // Dismiss intro immediately and transition to site
  const dismiss = useCallback(() => {
    cleanupAudio();
    onComplete?.();
  }, [onComplete, cleanupAudio]);

  const handleSkip = useCallback(() => {
    cleanupAudio();
    logTimelineEvent('skip pressed');
    dismiss();
  }, [dismiss, cleanupAudio]);

  // Keyboard shortcut listener
  useEffect(() => {
    const handleKeyDown = (e) => {
      if (e.key === 'Escape' || e.key === 'Enter') {
        e.preventDefault();
        handleSkip();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [handleSkip]);

  // Reduced motion: show completed title, hold then enter
  useEffect(() => {
    if (!isReducedMotion) return;
    const timer = setTimeout(() => {
      dismiss();
    }, TIMINGS.REDUCED_MOTION_HOLD);
    return () => clearTimeout(timer);
  }, [isReducedMotion, dismiss]);

  // Main Background Canvas for floating code glyphs
  useEffect(() => {
    if (isReducedMotion) return;
    const canvas = canvasRef.current;
    if (!canvas) return;

    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    canvas.width = window.innerWidth;
    canvas.height = window.innerHeight;

    const glyphs = ['{', '}', '<', '/', '>', ';', '_', '0', '1'];

    const calculateParticles = (w) => {
      let count = PARTICLES_PHONE;
      let scale = 1.0;
      if (w >= 1200) {
        count = PARTICLES_DESKTOP;
        scale = 1.12;
      } else if (w >= 768) {
        count = PARTICLES_TABLET;
        scale = 1.0;
      }

      return Array.from({ length: count }, () => ({
        x: Math.random() * w,
        y: Math.random() * canvas.height,
        vy: 0.32 + Math.random() * 0.5,
        char: glyphs[Math.floor(Math.random() * glyphs.length)],
        size: Math.round((12 + Math.random() * 4) * scale),
        alpha: 0.06 + Math.random() * 0.04,
        isOrange: Math.random() > 0.45,
      }));
    };

    let particles = calculateParticles(canvas.width);

    const timerRef = { current: null };
    const handleResize = () => {
      clearTimeout(timerRef.current);
      timerRef.current = setTimeout(() => {
        if (canvas) {
          canvas.width = window.innerWidth;
          canvas.height = window.innerHeight;
          particles = calculateParticles(canvas.width);
        }
      }, 150);
    };
    window.addEventListener('resize', handleResize);

    const isGreen = state === INTRO_STATES.TURN_GREEN || state === INTRO_STATES.COMPLETE;

    const render = () => {
      if (!document.hidden && canvas) {
        const w = canvas.width;
        const h = canvas.height;
        ctx.clearRect(0, 0, w, h);
        ctx.textAlign = 'center';

        particles.forEach((p) => {
          p.y += p.vy;
          if (p.y > h + 20) {
            p.y = -10;
            p.x = Math.random() * w;
          }

          if (isGreen) {
            ctx.fillStyle = `rgba(61, 220, 132, ${p.alpha * 1.3})`;
          } else if (p.isOrange) {
            ctx.fillStyle = `rgba(245, 117, 70, ${p.alpha})`;
          } else {
            ctx.fillStyle = `rgba(249, 237, 210, ${p.alpha})`;
          }

          ctx.font = `${p.size}px monospace`;
          ctx.fillText(p.char, p.x, p.y);
        });
      }
      animationFrameRef.current = requestAnimationFrame(render);
    };

    render();

    return () => {
      window.removeEventListener('resize', handleResize);
      clearTimeout(timerRef.current);
      if (animationFrameRef.current) {
        cancelAnimationFrame(animationFrameRef.current);
      }
    };
  }, [isReducedMotion, state]);

  // ORANGE PARTICLES SCATTERING CANVAS (FULL-SCREEN SPREAD & ENERGETIC OUTWARD BURST)
  useEffect(() => {
    if (isReducedMotion) return;
    const canvas = scatterCanvasRef.current;
    if (!canvas) return;

    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    canvas.width = window.innerWidth;
    canvas.height = window.innerHeight;

    const isEmitting =
      transformStage === 'morphing' ||
      transformStage === 'settled' ||
      transformStage === 'disappearing';

    if (!isEmitting) {
      ctx.clearRect(0, 0, canvas.width, canvas.height);
      return;
    }

    const particles = [];
    const maxParticles =
      transformStage === 'morphing' ? 55 : transformStage === 'settled' ? 18 : 160;
    const cx = canvas.width / 2;
    const cy = canvas.height / 2;
    const pillHalfW = Math.min(Math.max(120, canvas.width * 0.22), 175);
    const pillHalfH = pillHalfW / 3.1;

    const spawnParticle = (fromBeam = true) => {
      let x, y, vx, vy;
      if (fromBeam && transformStage === 'morphing') {
        const beamX = (cx - pillHalfW) + (2 * pillHalfW * sweepProgressRef.current);
        x = beamX + (Math.random() * 10 - 5);
        y = cy + (Math.random() * (pillHalfH * 1.8) - pillHalfH * 0.9);
        vx = (Math.random() - 0.5) * 1.6 - 0.2;
        vy = -1.2 - Math.random() * 2.2;
      } else {
        const angle = Math.random() * Math.PI * 2;
        x = cx + (pillHalfW + (Math.random() * 14 - 7)) * Math.cos(angle);
        y = cy + (pillHalfH + (Math.random() * 8 - 4)) * Math.sin(angle);
        vx = Math.cos(angle) * 0.4 + (Math.random() - 0.5) * 0.2;
        vy = -0.5 - Math.random() * 0.8;
      }

      const isHot = Math.random() > 0.65;
      const isAmber = Math.random() > 0.35;
      const color = isHot ? '255, 235, 170' : isAmber ? '245, 117, 70' : '253, 201, 6';

      return {
        x,
        y,
        vx,
        vy,
        size: 1.6 + Math.random() * 2.6,
        alpha: 0.85 + Math.random() * 0.15,
        fadeSpeed: transformStage === 'morphing' ? 0.012 + Math.random() * 0.016 : 0.006 + Math.random() * 0.008,
        color,
      };
    };

    // If entering "disappearing" stage: high-speed cyber orange quantum stream dissolution (not cracker blast)
    if (transformStage === 'disappearing') {
      const burstCount = 180;
      for (let i = 0; i < burstCount; i++) {
        // Distribute across the actual logo bounding box
        const edgeX = cx + (Math.random() - 0.5) * pillHalfW * 1.9;
        const edgeY = cy + (Math.random() - 0.5) * pillHalfH * 1.6;

        // Stream outwards laterally and upward at hyper-velocity (directional warp dissolve)
        const dirX = edgeX >= cx ? 1 : -1;
        const speedX = dirX * (15.0 + Math.random() * 26.0) + (Math.random() - 0.5) * 6;
        const speedY = (Math.random() - 0.6) * 13.0 - 2.5;

        // Vibrant Celestius orange & electric amber palette with luminous core
        const rand = Math.random();
        const color = rand > 0.75
          ? '255, 240, 210' // Hot white-cream core
          : rand > 0.45
          ? '245, 168, 28'  // Electric amber gold
          : rand > 0.15
          ? '242, 107, 58'  // Core Celestius orange
          : '255, 130, 60';  // Bright neon flame

        particles.push({
          x: edgeX,
          y: edgeY,
          vx: speedX,
          vy: speedY,
          size: 1.0 + Math.random() * 1.2,
          alpha: 0.95 + Math.random() * 0.05,
          fadeSpeed: 0.022 + Math.random() * 0.022,
          drag: 0.988, // Keeps high velocity across viewport
          streakLen: 2.4 + Math.random() * 3.2, // Sleek laser stream vector
          color,
        });
      }
    } else {
      // Pre-populate initial sparks for morphing/settled
      for (let i = 0; i < 15; i++) {
        particles.push(spawnParticle(transformStage === 'morphing'));
      }
    }

    const renderScatter = () => {
      ctx.clearRect(0, 0, canvas.width, canvas.height);

      if (transformStage === 'disappearing' && particles.length < 320 && Math.random() > 0.25) {
        // Progressive slipstream waves for continuous dematerialization
        for (let k = 0; k < 6; k++) {
          const edgeX = cx + (Math.random() - 0.5) * pillHalfW * 1.8;
          const edgeY = cy + (Math.random() - 0.5) * pillHalfH * 1.5;
          const dirX = edgeX >= cx ? 1 : -1;
          const speedX = dirX * (16.0 + Math.random() * 24.0) + (Math.random() - 0.5) * 4;
          const speedY = (Math.random() - 0.6) * 12.0 - 2.0;
          const rand = Math.random();
          const color = rand > 0.6 ? '255, 240, 210' : rand > 0.3 ? '245, 168, 28' : '242, 107, 58';

          particles.push({
            x: edgeX,
            y: edgeY,
            vx: speedX,
            vy: speedY,
            size: 0.9 + Math.random() * 1.1,
            alpha: 1.0,
            fadeSpeed: 0.026 + Math.random() * 0.022,
            drag: 0.988,
            streakLen: 2.6 + Math.random() * 3.0,
            color,
          });
        }
      } else if (transformStage !== 'disappearing' && particles.length < maxParticles && Math.random() > 0.25) {
        particles.push(spawnParticle(transformStage === 'morphing'));
      }

      for (let i = particles.length - 1; i >= 0; i--) {
        const p = particles[i];
        p.x += p.vx;
        p.y += p.vy;
        if (p.drag) {
          p.vx *= p.drag;
          p.vy *= p.drag;
        }
        p.alpha -= p.fadeSpeed;

        if (p.alpha <= 0) {
          particles.splice(i, 1);
          continue;
        }

        if (p.streakLen) {
          // Fine high-speed red laser needle streak
          ctx.beginPath();
          ctx.moveTo(p.x, p.y);
          ctx.lineTo(p.x - p.vx * p.streakLen, p.y - p.vy * p.streakLen);
          ctx.strokeStyle = `rgba(${p.color}, ${p.alpha})`;
          ctx.lineWidth = p.size;
          ctx.shadowColor = `rgba(${p.color}, ${p.alpha * 0.95})`;
          ctx.shadowBlur = 8;
          ctx.stroke();
          ctx.shadowBlur = 0;
        } else {
          ctx.beginPath();
          ctx.arc(p.x, p.y, p.size, 0, Math.PI * 2);
          ctx.fillStyle = `rgba(${p.color}, ${p.alpha})`;
          ctx.shadowColor = `rgba(${p.color}, ${p.alpha * 0.8})`;
          ctx.shadowBlur = 8;
          ctx.fill();
          ctx.shadowBlur = 0;
        }
      }

      scatterAnimRef.current = requestAnimationFrame(renderScatter);
    };

    renderScatter();

    return () => {
      if (scatterAnimRef.current) {
        cancelAnimationFrame(scatterAnimRef.current);
      }
    };
  }, [transformStage, isReducedMotion]);

  // Main state sequence controller (Phases 1 - 4: Fast Snappy Scanner)
  useEffect(() => {
    if (isReducedMotion) return;

    // 1. FAST LOADING (0 to 900ms): Rapid non-linear climb to 99%
    if (state === INTRO_STATES.LOADING) {
      const startTime = performance.now();
      const tickTracker = { lastTick: 0 };

      const progressInterval = setInterval(() => {
        const elapsed = performance.now() - startTime;
        const ratio = Math.min(elapsed / TIMINGS.LOADING_DURATION, 1);

        let target;
        if (ratio < 0.3) {
          target = Math.floor(ratio * 1.8 * 100);
        } else if (ratio < 0.6) {
          target = 54 + Math.floor((ratio - 0.3) * 70);
        } else if (ratio < 0.85) {
          target = 75 + Math.floor((ratio - 0.6) * 80);
        } else {
          target = 95 + Math.floor((ratio - 0.85) * 26);
        }

        const nextProgress = Math.min(Math.max(target, 0), 99);
        setProgress(nextProgress);

        if (nextProgress > tickTracker.lastTick + 15) {
          tickTracker.lastTick = nextProgress;
          playTick();
        }

        if (ratio >= 1) {
          clearInterval(progressInterval);
          setProgress(99);
          setState(INTRO_STATES.ALERT);
        }
      }, 30);

      return () => clearInterval(progressInterval);
    }

    // 2. ALERT (750ms duration): Logic integrity scan (sleek laser sweep & harmonic tone, no blinking)
    if (state === INTRO_STATES.ALERT) {
      playScanTone();
      const timer = setTimeout(() => {
        setState(INTRO_STATES.TURN_GREEN);
      }, TIMINGS.ALERT_DURATION);
      return () => clearTimeout(timer);
    }

    // 3. TURN_GREEN (800ms duration): turns green, fast progress 99% to 100%
    if (state === INTRO_STATES.TURN_GREEN) {
      playDing(587, 880);
      const greenStartTime = performance.now();

      const greenInterval = setInterval(() => {
        const elapsed = performance.now() - greenStartTime;
        const ratio = Math.min(elapsed / TIMINGS.TURN_GREEN_DURATION, 1);
        if (ratio >= 0.75) {
          setProgress(100);
        }
      }, 40);

      const timer = setTimeout(() => {
        clearInterval(greenInterval);
        setProgress(100);
        setState(INTRO_STATES.COMPLETE);
      }, TIMINGS.TURN_GREEN_DURATION);

      return () => {
        clearInterval(greenInterval);
        clearTimeout(timer);
      };
    }

    // 4. COMPLETE (160ms hold at 100%): fast snap flash, moves to title typing
    if (state === INTRO_STATES.COMPLETE) {
      playDing(880, 1174);
      const timer = setTimeout(() => {
        setState(INTRO_STATES.TYPE_LOGO);
      }, TIMINGS.COMPLETE_HOLD);
      return () => clearTimeout(timer);
    }
  }, [state, isReducedMotion, playTick, playScanTone, playDing]);

  // 5. TYPE_LOGO: Fast snappy typing of LARPER OR CODER
  useEffect(() => {
    if (isReducedMotion || state !== INTRO_STATES.TYPE_LOGO) return;

    let count = 0;
    const total = LOGO_REVEAL_BOXES.length; // 13 boxes

    const interval = setInterval(() => {
      count++;
      setRevealedCount(count);
      playKeyClick();

      if (count >= total) {
        clearInterval(interval);
        // Hold event title, then proceed to disappear phase
        setTimeout(() => {
          setState(INTRO_STATES.LOGO_FADE_OUT);
        }, TIMINGS.HOLD_LOGO);
      }
    }, TIMINGS.TYPE_STEP_SPEED);

    return () => clearInterval(interval);
  }, [state, isReducedMotion, playKeyClick]);

  // 5b. LOGO_FADE_OUT: LARPER OR CODER vanishes completely from the stage
  useEffect(() => {
    if (isReducedMotion || state !== INTRO_STATES.LOGO_FADE_OUT) return;

    const timer = setTimeout(() => {
      setState(INTRO_STATES.TRANSFORM);
      setTransformStage('presented_by');
    }, TIMINGS.LOGO_DISAPPEAR || 300);

    return () => clearTimeout(timer);
  }, [state, isReducedMotion]);

  // 6. TRANSFORM: Centered "PRESENTED BY" first -> Delayed Original Logo -> Brand Reforge -> Cool Disappearance
  useEffect(() => {
    if (isReducedMotion || state !== INTRO_STATES.TRANSFORM) return;

    // Decode scrambler for free-floating "PRESENTED BY"
    const targetText = 'PRESENTED BY';
    const scrambleChars = '!<>-_\\/[]{}—=+*^?#_01';
    const startTime = performance.now();

    const decodeInterval = setInterval(() => {
      const elapsed = performance.now() - startTime;
      const progressRatio = Math.min(elapsed / (TIMINGS.PRESENTED_BY_DECODE || 320), 1);
      const revealedLength = Math.floor(progressRatio * targetText.length);

      let result = '';
      for (let i = 0; i < targetText.length; i++) {
        if (i < revealedLength || targetText[i] === ' ') {
          result += targetText[i];
        } else {
          result += scrambleChars[Math.floor(Math.random() * scrambleChars.length)];
        }
      }
      setGlitchText(result);

      if (progressRatio >= 1) {
        clearInterval(decodeInterval);
        setGlitchText('PRESENTED BY');
      }
    }, 28);

    // Timeline: 1. "PRESENTED BY" solo -> 2. Delay -> 3. Original logo appears -> 4. Reforge -> 5. Cool disappearance
    const tDecode = TIMINGS.PRESENTED_BY_DECODE || 320;
    const tSoloHold = TIMINGS.PRESENTED_BY_SOLO_HOLD || 750;
    const tDelay = tDecode + tSoloHold; // distinct delay before original logo arrives
    const tAppear = TIMINGS.LOGO_APPEAR_DURATION || 480;
    const tHoldOrig = TIMINGS.ORIGINAL_LOGO_HOLD || 1250;
    const tSweep = TIMINGS.TRANSFORM_SWEEP_DURATION || 2000;
    const tHoldSettled = TIMINGS.SETTLED_HOLD || 1600;
    const tDisappear = TIMINGS.DISAPPEAR_DURATION || 480;

    // Step A: Original logo appears with delay after user processes "PRESENTED BY"
    const appearTimer = setTimeout(() => {
      setTransformStage('appearing');
      playChargeUp();
      logTimelineEvent('logo appear: Celestius original');
    }, tDelay);

    // Step B: Original logo stabilizes in full clarity for user to view (1.25s)
    const origTimer = setTimeout(() => {
      setTransformStage('original');
    }, tDelay + tAppear);

    // Step C: Reforge sweep starts left-to-right (2.0s duration)
    const morphTimer = setTimeout(() => {
      setTransformStage('morphing');
      playReforgeHum();
      logTimelineEvent('logo transform: reforge sweep start');
    }, tDelay + tAppear + tHoldOrig);

    // Step D: Settle cleanly on modified logo with triumph chord chime & hold for 1.6s
    const settleTimer = setTimeout(() => {
      setTransformStage('settled');
      setSweepProgress(1);
      sweepProgressRef.current = 1;
      playChimeChord();
      logTimelineEvent('logo transform: Celestius modified settled');
    }, tDelay + tAppear + tHoldOrig + tSweep);

    // Step E: Trigger cool disappearance animation for all elements (480ms)
    const disappearTimer = setTimeout(() => {
      setTransformStage('disappearing');
      playDisappearSound();
      logTimelineEvent('logo transform: cool disappearance animation');
    }, tDelay + tAppear + tHoldOrig + tSweep + tHoldSettled);

    // Step F: Complete intro and transition into site
    const completeTimer = setTimeout(() => {
      dismiss();
    }, tDelay + tAppear + tHoldOrig + tSweep + tHoldSettled + tDisappear);

    return () => {
      clearInterval(decodeInterval);
      clearTimeout(appearTimer);
      clearTimeout(origTimer);
      clearTimeout(morphTimer);
      clearTimeout(settleTimer);
      clearTimeout(disappearTimer);
      clearTimeout(completeTimer);
    };
  }, [state, isReducedMotion, playChargeUp, playReforgeHum, playChimeChord, playDisappearSound, dismiss]);

  // Synchronized RAF sweep controller for morphing stage
  useEffect(() => {
    if (isReducedMotion || transformStage !== 'morphing') return;

    const rafTracker = { current: null };
    const startTime = performance.now();
    const duration = TIMINGS.TRANSFORM_SWEEP_DURATION || 2000;

    const animateSweep = (now) => {
      const elapsed = now - startTime;
      const raw = Math.min(elapsed / duration, 1);
      // smooth cubic ease-in-out curve for fluid organic sweep
      const eased = raw < 0.5
        ? 4 * raw * raw * raw
        : 1 - Math.pow(-2 * raw + 2, 3) / 2;

      setSweepProgress(eased);
      sweepProgressRef.current = eased;

      if (raw < 1) {
        rafTracker.current = requestAnimationFrame(animateSweep);
      }
    };

    rafTracker.current = requestAnimationFrame(animateSweep);

    return () => {
      if (rafTracker.current) cancelAnimationFrame(rafTracker.current);
    };
  }, [transformStage, isReducedMotion]);

  const isGreenPhase = state === INTRO_STATES.TURN_GREEN || state === INTRO_STATES.COMPLETE;
  const isLoaderVisible =
    state === INTRO_STATES.LOADING ||
    state === INTRO_STATES.ALERT ||
    state === INTRO_STATES.TURN_GREEN ||
    state === INTRO_STATES.COMPLETE;
  const showAlert = state === INTRO_STATES.ALERT || state === INTRO_STATES.TURN_GREEN;

  // Progress value (snaps to 100 on complete)
  const displayProgress = state === INTRO_STATES.COMPLETE ? 100 : progress;

  // Dynamic changing status message in the loading section
  const dynamicLoadingStatus = (() => {
    if (state === INTRO_STATES.ALERT) {
      return '> RUNTIME_SCAN: ANALYZING SYNTAX & LOGIC TREES...';
    }
    if (state === INTRO_STATES.TURN_GREEN) {
      return '> CLEARANCE GRANTED: 100% PURE PROBLEM SOLVER [OK]';
    }
    if (state === INTRO_STATES.COMPLETE) {
      return '> RUNTIME VERIFIED // INITIALIZING ENVIRONMENT [100%]';
    }
    const step = Math.min(
      Math.floor((progress / 100) * LOADING_STATUS_MESSAGES.length),
      LOADING_STATUS_MESSAGES.length - 1
    );
    return LOADING_STATUS_MESSAGES[step];
  })();

  // Screen reader text announcement
  const liveAnnouncement = (() => {
    switch (state) {
      case INTRO_STATES.LOADING:
        return 'System loading and compiling...';
      case INTRO_STATES.ALERT:
        return 'Verifying logic integrity...';
      case INTRO_STATES.TURN_GREEN:
        return 'Verified: 100% Coder';
      case INTRO_STATES.TYPE_LOGO:
      case INTRO_STATES.LOGO_FADE_OUT:
        return 'LARPER OR CODER';
      case INTRO_STATES.TRANSFORM:
        return `Presented by ${PRESENTER_NAME}`;
      default:
        return '';
    }
  })();

  const isFadingOut =
    state === INTRO_STATES.AUTO_ENTER || transformStage === 'fading_out';

  return (
    <div
      className={`${styles.overlay} ${isFadingOut ? styles.fadingOut : ''}`}
      role="dialog"
      aria-modal="true"
      aria-label="Story Introduction"
    >
      {/* Background canvas for floating code glyphs */}
      {!isReducedMotion && <canvas ref={canvasRef} className={styles.particleCanvas} />}

      {/* Scattering Orange Particles Canvas (Full-Screen Spread & Energetic Outward Blast) */}
      {!isReducedMotion && (
        <canvas ref={scatterCanvasRef} className={styles.scatterCanvas} aria-hidden="true" />
      )}

      {/* 100% COMPLETE: Clean white flash on snap */}
      {state === INTRO_STATES.COMPLETE && !isReducedMotion && (
        <div className={styles.completeFlash} aria-hidden="true" />
      )}

      {/* Screen reader live updates */}
      <div className={styles.srOnly} aria-live="polite">
        {liveAnnouncement}
      </div>

      {/* Top Controls: Skip Button (Top Right) */}
      <div className={styles.topControls}>
        <button
          ref={skipBtnRef}
          type="button"
          className={styles.skipButton}
          onClick={handleSkip}
          aria-label="Skip intro to site"
        >
          SKIP
        </button>
      </div>

      {/* Center Stage */}
      <div className={styles.stage}>
        {/* Sequence Part 1 - 4: Fast Loader + Dynamic Changing Status Text */}
        {isLoaderVisible && (
          <div className={`${styles.loaderArea} ${state === INTRO_STATES.COMPLETE ? styles.clearing : ''}`}>
            {/* HOLOGRAPHIC VERIFICATION CAPSULE (Smooth, elegant, zero blinking) */}
            {showAlert && (
              <div className={`${styles.verificationCapsule} ${isGreenPhase ? styles.capsuleGreen : ''}`}>
                <div className={styles.capsuleInner}>
                  <div className={styles.capsuleStatusLine}>
                    <span className={styles.capsuleIcon}>
                      {isGreenPhase ? '✓' : '◈'}
                    </span>
                    <span className={styles.capsuleTitle}>
                      {isGreenPhase
                        ? 'VERIFICATION PASSED: ZERO LARP DETECTED'
                        : 'DEEP SCAN: ANALYZING RUNTIME LOGIC...'}
                    </span>
                  </div>
                  <span className={styles.capsuleSubline}>
                    {isGreenPhase
                      ? '> 100% pure locked-in problem solver'
                      : '> scanning ast trees // filtering resume buzzwords'}
                  </span>
                </div>
              </div>
            )}

            {/* Large Percentage Counter */}
            <div className={`${styles.counterRow} ${isGreenPhase ? styles.greenText : ''}`}>
              <span>{displayProgress}</span>
              <span className={styles.counterPercent}>%</span>
            </div>

            {/* Cyber Precision Energy Progress Bar (Continuous photon energy wave & laser sweep) */}
            <div className={styles.progressContainer}>
              {/* Telemetry Header Line */}
              <div className={styles.progressTelemetryHeader}>
                <span className={styles.telemetryTag}>
                  <span className={`${styles.statusDot} ${isGreenPhase ? styles.statusDotGreen : ''}`} />
                  {isGreenPhase ? 'VERIFICATION // CLEARED' : 'STREAM // KERNEL_INIT'}
                </span>
                <span className={styles.telemetryRate}>
                  {displayProgress < 100 ? `${(displayProgress * 14.2).toFixed(0)} KB/s` : 'LOCKED 1.2 GB/s'}
                </span>
              </div>

              {/* High-Tech Energy Rail */}
              <div
                className={`${styles.cyberRail} ${isGreenPhase ? styles.railGreen : ''}`}
                role="progressbar"
                aria-valuenow={displayProgress}
                aria-valuemin="0"
                aria-valuemax="100"
                aria-label="System compilation and verification progress"
              >
                {/* Active Energy Fill Bar */}
                <div
                  className={`${styles.cyberFill} ${isGreenPhase ? styles.fillGreen : ''}`}
                  style={{ width: `${displayProgress}%` }}
                >
                  {/* High-speed Photon Energy Wave (Continuous shimmer, replaces blinking) */}
                  <div className={styles.energyWave} />

                  {/* Luminous Leading-Edge Spark / Plasma Head */}
                  {displayProgress > 0 && displayProgress < 100 && (
                    <div className={styles.laserHead} />
                  )}
                </div>

                {/* Laser Optical Scan Beam during Verification Phase (Replaces strobe blinking) */}
                {showAlert && (
                  <div className={`${styles.laserScanBeam} ${isGreenPhase ? styles.beamGreen : ''}`} />
                )}
              </div>

              {/* Micro-Ticks Ruler */}
              <div className={styles.rulerTicks} aria-hidden="true">
                <span>00</span>
                <span>25</span>
                <span>50</span>
                <span>75</span>
                <span>100</span>
              </div>
            </div>

            {/* DYNAMIC CHANGING STATUS LINE */}
            <div
              className={`${styles.statusLineMuted} ${isGreenPhase ? styles.greenModeText : ''}`}
              aria-live="polite"
            >
              {dynamicLoadingStatus}
            </div>
          </div>
        )}

        {/* Sequence Part 5: EVENT TITLE "LARPER OR CODER" (CENTER STAGE) */}
        {(state === INTRO_STATES.TYPE_LOGO || state === INTRO_STATES.LOGO_FADE_OUT) && (
          <div
            className={`${styles.eventLogoWrapper} ${
              state === INTRO_STATES.LOGO_FADE_OUT ? styles.eventLogoDisappearing : ''
            }`}
            aria-live="polite"
          >
            <ImageTypewriter
              imageSrc={logoTypingImg}
              boxes={LOGO_REVEAL_BOXES}
              revealedCount={revealedCount}
              showActiveCursor={!isReducedMotion && state === INTRO_STATES.TYPE_LOGO}
              isComplete={isReducedMotion || state === INTRO_STATES.LOGO_FADE_OUT}
              alt="LARPER OR CODER"
            />
          </div>
        )}

        {/* Sequence Part 6: CENTERED "PRESENTED BY" + DELAYED CELESTIUS LOGO */}
        {(state === INTRO_STATES.TRANSFORM || isReducedMotion) && (
          <div
            className={`${styles.centerPresenterStage} ${
              transformStage === 'disappearing' ? styles.stageDisappearing : ''
            }`}
            aria-live="polite"
          >
            {/* Free-Floating "PRESENTED BY" Text with Cool Aperture Entrance */}
            <div className={styles.freePoweredBy} data-text={glitchText}>
              {glitchText}
            </div>

            {/* Logo Section: Appears with a distinct delay after "PRESENTED BY" */}
            {(isReducedMotion || (transformStage !== 'idle' && transformStage !== 'presented_by')) && (
              <div className={styles.logoSection}>
                {/* Celestius Transformation Pill Container */}
                <div
                  className={`${styles.logoMorphWrapper} ${
                    transformStage === 'morphing' ? styles.morphActive : ''
                  } ${transformStage === 'settled' || isReducedMotion ? styles.morphSettled : ''}`}
                >
                  {/* Radiant Warm Ambient Aura behind the pill */}
                  <div className={styles.pillAura} aria-hidden="true" />

                  {/* Capsule Pill Frame with Smooth Reveal */}
                  <div
                    className={`${styles.pillContainer} ${
                      transformStage === 'appearing' ? styles.pillAppearing : ''
                    }`}
                  >
                    {/* Synchronized Reforge Beam during morphing */}
                    {transformStage === 'morphing' && !isReducedMotion && (
                      <div
                        className={styles.reforgeBeam}
                        style={{ left: `${sweepProgress * 100}%` }}
                        aria-hidden="true"
                      />
                    )}

                    {/* Original Logo from /public/celestius_original.png */}
                    <img
                      src="/celestius_original.png"
                      alt="Celestius Original Logo"
                      className={styles.celestiusImg}
                      style={{
                        clipPath:
                          isReducedMotion || transformStage === 'settled' || transformStage === 'disappearing' || transformStage === 'fading_out'
                            ? 'inset(0 0 0 100%)'
                            : transformStage === 'morphing'
                            ? `inset(0 0 0 ${sweepProgress * 100}%)`
                            : 'none',
                      }}
                      loading="eager"
                    />

                    {/* Modified Logo from /public/Celestius_modified.png */}
                    <img
                      src="/Celestius_modified.png"
                      alt="Celestius Modified Logo"
                      className={styles.celestiusImg}
                      style={{
                        clipPath:
                          isReducedMotion || transformStage === 'settled' || transformStage === 'disappearing' || transformStage === 'fading_out'
                            ? 'none'
                            : transformStage === 'morphing'
                            ? `inset(0 ${100 - sweepProgress * 100}% 0 0)`
                            : 'inset(0 100% 0 0)',
                      }}
                      loading="eager"
                    />
                  </div>
                </div>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
