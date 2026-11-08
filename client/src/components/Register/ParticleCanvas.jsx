// client/src/components/Register/ParticleCanvas.jsx
import React, { useEffect, useRef } from 'react';
import styles from './Register.module.css';

const NUM_PARTICLES = 320;

const RED_PALETTE = [
  [255, 59, 48],
  [255, 75, 60],
  [245, 68, 54],
  [255, 95, 75],
  [235, 45, 55],
  [255, 40, 80],
];

const GREEN_PALETTE = [
  [0, 240, 118],
  [16, 225, 125],
  [52, 211, 153],
  [74, 222, 128],
  [0, 255, 140],
  [100, 255, 175],
];

export default function ParticleCanvas({ mode = 'ambient', isClosing = false }) {
  const canvasRef = useRef(null);
  const containerRef = useRef(null);
  const modeRef = useRef(mode);
  modeRef.current = mode;
  const isClosingRef = useRef(isClosing);
  isClosingRef.current = isClosing;

  useEffect(() => {
    const canvas = canvasRef.current;
    const container = containerRef.current;
    if (!canvas || !container) return;

    const ctx = canvas.getContext('2d', { alpha: true });
    if (!ctx) return;

    let animId = null;
    let width = 0;
    let height = 0;
    let fadeMultiplier = 0.05;

    const initW = container.clientWidth || window.innerWidth || 1000;
    const initH = container.clientHeight || window.innerHeight || 800;
    const initCx = initW / 2;
    const initCy = initH / 2;

    const spawnW = Math.min(initW * 0.65, 720);
    const spawnH = Math.min(initH * 0.65, 500);

    // Initial particles spawning behind the opening form footprint
    const particles = Array.from({ length: NUM_PARTICLES }, (_, i) => {
      const col = RED_PALETTE[i % RED_PALETTE.length];
      const spawnX = initCx + (Math.random() - 0.5) * spawnW;
      const spawnY = initCy + (Math.random() - 0.5) * spawnH;
      const angle = Math.atan2(spawnY - initCy, spawnX - initCx) + (Math.random() - 0.5) * 0.4;
      const burstSpeed = 5.2 + Math.random() * 6.5;

      return {
        x: spawnX,
        y: spawnY,
        vx: Math.cos(angle) * burstSpeed,
        vy: Math.sin(angle) * burstSpeed,
        targetSpeed: 0.45 + Math.random() * 0.8,
        radius: 1.8 + Math.random() * 2.3,
        baseAlpha: 0.6 + Math.random() * 0.38,
        color: [...col],
        targetColor: [...col],
        targetX: 0,
        targetY: 0,
        pulseOffset: Math.random() * Math.PI * 2,
        converted: false,
        inMotionToTarget: false,
        flash: 0,
      };
    });

    // Wave transition states
    let waveActive = false;
    let waveRadius = 0;
    let waveOrigin = { x: initCx, y: initCy };
    let prevMode = modeRef.current;

    const computeShapeTargets = (shapeMode, w, h) => {
      const cx = w / 2;
      // Position symbol in viewport center between top message and bottom actions
      const cy = Math.max(160, h * 0.46);
      const symbolSize = Math.min(w * 0.42, Math.min(h * 0.32, 160));

      if (shapeMode === 'tick') {
        // Classic, bold checkmark geometry
        const p1 = { x: cx - symbolSize * 0.78, y: cy + symbolSize * 0.04 };
        const p2 = { x: cx - symbolSize * 0.20, y: cy + symbolSize * 0.58 };
        const p3 = { x: cx + symbolSize * 0.82, y: cy - symbolSize * 0.58 };

        const leg1Count = Math.floor(NUM_PARTICLES * 0.34);
        const leg2Count = NUM_PARTICLES - leg1Count;

        const v1x = p2.x - p1.x;
        const v1y = p2.y - p1.y;
        const len1 = Math.hypot(v1x, v1y) || 1;
        const u1x = -v1y / len1;
        const u1y = v1x / len1;

        const v2x = p3.x - p2.x;
        const v2y = p3.y - p2.y;
        const len2 = Math.hypot(v2x, v2y) || 1;
        const u2x = -v2y / len2;
        const u2y = v2x / len2;

        const strands = 3;
        const strandSpacing = 6;

        particles.forEach((p, idx) => {
          const jitterX = (Math.random() - 0.5) * 2.5;
          const jitterY = (Math.random() - 0.5) * 2.5;

          if (idx < leg1Count) {
            const particlesPerStrand = Math.floor(leg1Count / strands) || 1;
            const strand = Math.floor(idx / particlesPerStrand) - 1; // -1, 0, 1
            const t = (idx % particlesPerStrand) / (particlesPerStrand - 1 || 1);
            const baseX = p1.x + (p2.x - p1.x) * t;
            const baseY = p1.y + (p2.y - p1.y) * t;
            p.targetX = baseX + u1x * strand * strandSpacing + jitterX;
            p.targetY = baseY + u1y * strand * strandSpacing + jitterY;
          } else {
            const leg2Idx = idx - leg1Count;
            const particlesPerStrand = Math.floor(leg2Count / strands) || 1;
            const strand = Math.floor(leg2Idx / particlesPerStrand) - 1; // -1, 0, 1
            const t = (leg2Idx % particlesPerStrand) / (particlesPerStrand - 1 || 1);
            const baseX = p2.x + (p3.x - p2.x) * t;
            const baseY = p2.y + (p3.y - p2.y) * t;
            p.targetX = baseX + u2x * strand * strandSpacing + jitterX;
            p.targetY = baseY + u2y * strand * strandSpacing + jitterY;
          }
        });
      } else if (shapeMode === 'cross') {
        // High-definition Cross mark geometry with multi-strand width
        const armLen = symbolSize * 0.88;
        const half = Math.floor(NUM_PARTICLES / 2);
        const strands = 3;
        const strandSpacing = 6;
        const norm = 1 / Math.SQRT2;

        particles.forEach((p, idx) => {
          const jitterX = (Math.random() - 0.5) * 2.5;
          const jitterY = (Math.random() - 0.5) * 2.5;

          if (idx < half) {
            // Bar 1: diagonal top-left to bottom-right
            const particlesPerStrand = Math.floor(half / strands) || 1;
            const strand = Math.floor(idx / particlesPerStrand) - 1; // -1, 0, 1
            const t = (idx % particlesPerStrand) / (particlesPerStrand - 1 || 1);
            const baseX = cx - armLen + t * (2 * armLen);
            const baseY = cy - armLen + t * (2 * armLen);
            p.targetX = baseX - norm * strand * strandSpacing + jitterX;
            p.targetY = baseY + norm * strand * strandSpacing + jitterY;
          } else {
            // Bar 2: diagonal top-right to bottom-left
            const secondHalfIdx = idx - half;
            const particlesPerStrand = Math.floor((NUM_PARTICLES - half) / strands) || 1;
            const strand = Math.floor(secondHalfIdx / particlesPerStrand) - 1; // -1, 0, 1
            const t = (secondHalfIdx % particlesPerStrand) / (particlesPerStrand - 1 || 1);
            const baseX = cx + armLen - t * (2 * armLen);
            const baseY = cy - armLen + t * (2 * armLen);
            p.targetX = baseX + norm * strand * strandSpacing + jitterX;
            p.targetY = baseY + norm * strand * strandSpacing + jitterY;
          }
        });
      } else {
        // Ambient mode: free floating red/orange particles across the backdrop
        particles.forEach((p, idx) => {
          p.targetColor = RED_PALETTE[idx % RED_PALETTE.length];
        });
      }
    };

    const resize = () => {
      const rect = container.getBoundingClientRect();
      width = Math.max(10, rect.width || window.innerWidth);
      height = Math.max(10, rect.height || window.innerHeight);

      const dpr = window.devicePixelRatio || 1;
      canvas.width = Math.floor(width * dpr);
      canvas.height = Math.floor(height * dpr);
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);

      computeShapeTargets(modeRef.current, width, height);
    };

    const resizeObserver = new ResizeObserver(() => {
      resize();
    });
    resizeObserver.observe(container);
    resize();

    let lastTime = performance.now();

    const draw = (now) => {
      const dt = Math.min((now - lastTime) / 16.666, 2.5);
      lastTime = now;

      ctx.clearRect(0, 0, width, height);

      // Smooth fadeMultiplier for opening and closing
      if (isClosingRef.current) {
        fadeMultiplier = Math.max(0, fadeMultiplier - dt * 0.065);
      } else {
        fadeMultiplier = Math.min(1, fadeMultiplier + dt * 0.05);
      }

      if (fadeMultiplier <= 0.001) {
        animId = requestAnimationFrame(draw);
        return;
      }

      const targetMode = modeRef.current;

      // Detect mode transitions
      if (targetMode !== prevMode) {
        if (targetMode === 'tick' || targetMode === 'cross') {
          waveActive = true;
          waveRadius = 0;
          waveOrigin = { x: width / 2, y: height / 2 };
          computeShapeTargets(targetMode, width, height);
          particles.forEach((p) => {
            p.converted = false;
            p.inMotionToTarget = false;
            p.flash = 0;
          });
        } else if (prevMode === 'cross' && targetMode === 'ambient') {
          // User clicked "Try Again": freely and fastly scatter particles outward
          const cx = width / 2;
          const cy = height / 2;
          particles.forEach((p, idx) => {
            const angle = Math.atan2(p.y - cy, p.x - cx) + (Math.random() - 0.5) * 0.9;
            const scatterSpeed = 8.5 + Math.random() * 9.5;
            p.vx = Math.cos(angle) * scatterSpeed;
            p.vy = Math.sin(angle) * scatterSpeed;
            p.targetColor = RED_PALETTE[idx % RED_PALETTE.length];
            p.flash = 0.8;
            p.converted = false;
            p.inMotionToTarget = false;
          });
        }
        prevMode = targetMode;
      }

      const maxWaveDist = Math.hypot(width, height);

      // Process and render radial color wave
      if (waveActive) {
        // Expands across the entire screen over ~1.3 seconds
        waveRadius += 680 * (dt / 60) * 60 * 0.016;

        particles.forEach((p, idx) => {
          if (!p.converted) {
            const d = Math.hypot(p.x - waveOrigin.x, p.y - waveOrigin.y);
            if (d <= waveRadius) {
              p.converted = true;
              p.flash = 1.0;
              p.inMotionToTarget = true;
              p.targetColor = targetMode === 'tick'
                ? GREEN_PALETTE[idx % GREEN_PALETTE.length]
                : RED_PALETTE[idx % RED_PALETTE.length];
            }
          }
        });

        if (waveRadius > maxWaveDist) {
          waveActive = false;
        }

        // Render luminous shockwave ring expanding outward
        if (waveRadius > 5 && waveRadius < maxWaveDist) {
          const waveProgress = waveRadius / maxWaveDist;
          const waveAlpha = Math.max(0, 1 - waveProgress) * 0.55 * fadeMultiplier;
          const rgb = targetMode === 'tick' ? '0, 240, 118' : '255, 59, 48';

          ctx.save();
          ctx.beginPath();
          ctx.arc(waveOrigin.x, waveOrigin.y, waveRadius, 0, Math.PI * 2);
          ctx.strokeStyle = `rgba(${rgb}, ${waveAlpha})`;
          ctx.lineWidth = 4.5;
          ctx.shadowColor = `rgba(${rgb}, 0.85)`;
          ctx.shadowBlur = 18;
          ctx.stroke();
          ctx.restore();
        }
      }

      // Update particle positions and colors
      particles.forEach((p) => {
        // Smooth color transition
        p.color[0] += (p.targetColor[0] - p.color[0]) * 0.07 * dt;
        p.color[1] += (p.targetColor[1] - p.color[1]) * 0.07 * dt;
        p.color[2] += (p.targetColor[2] - p.color[2]) * 0.07 * dt;

        if (p.flash > 0) {
          p.flash = Math.max(0, p.flash - dt * 0.035);
        }

        if (targetMode === 'tick' || targetMode === 'cross') {
          if (p.inMotionToTarget) {
            // Ultra-slow cinematic convergence (~3.5s)
            const dx = p.targetX - p.x;
            const dy = p.targetY - p.y;
            const distToTarget = Math.hypot(dx, dy);

            // Gentle steer force
            const steerForce = 0.0032 * dt;
            p.vx += dx * steerForce;
            p.vy += dy * steerForce;

            // Fluid drag
            p.vx *= Math.pow(0.95, dt);
            p.vy *= Math.pow(0.95, dt);

            // Strict speed limit for majestic slow motion
            const speed = Math.hypot(p.vx, p.vy);
            const maxSpeed = 1.85;
            if (speed > maxSpeed) {
              p.vx = (p.vx / speed) * maxSpeed;
              p.vy = (p.vy / speed) * maxSpeed;
            }

            p.x += p.vx * dt;
            p.y += p.vy * dt;

            // Subtle organic breathing once assembled
            if (distToTarget < 14) {
              p.x += Math.sin(now * 0.0028 + p.pulseOffset) * 0.35;
              p.y += Math.cos(now * 0.0028 + p.pulseOffset) * 0.35;
            }
          } else {
            // Awaiting wave: gentle drift
            p.x += p.vx * 0.5 * dt;
            p.y += p.vy * 0.5 * dt;
          }
        } else {
          // Ambient mode: particles burst from behind the modal and decelerate to floating drift
          const currentSpeed = Math.hypot(p.vx, p.vy);
          if (currentSpeed > p.targetSpeed) {
            p.vx *= Math.pow(0.965, dt);
            p.vy *= Math.pow(0.965, dt);
          }

          p.x += p.vx * dt;
          p.y += p.vy * dt;

          if (p.x <= 0) {
            p.x = 0;
            p.vx = Math.abs(p.vx) * 0.75;
          } else if (p.x >= width) {
            p.x = width;
            p.vx = -Math.abs(p.vx) * 0.75;
          }

          if (p.y <= 0) {
            p.y = 0;
            p.vy = Math.abs(p.vy) * 0.75;
          } else if (p.y >= height) {
            p.y = height;
            p.vy = -Math.abs(p.vy) * 0.75;
          }
        }

        // Render glowing particle
        let r = Math.round(p.color[0]);
        let g = Math.round(p.color[1]);
        let b = Math.round(p.color[2]);
        if (p.flash > 0) {
          r = Math.min(255, r + Math.round(p.flash * 70));
          g = Math.min(255, g + Math.round(p.flash * 70));
          b = Math.min(255, b + Math.round(p.flash * 70));
        }

        const alpha = p.baseAlpha * fadeMultiplier * (0.8 + Math.sin(now * 0.004 + p.pulseOffset) * 0.2);

        ctx.save();
        ctx.shadowColor = `rgba(${r}, ${g}, ${b}, 0.85)`;
        ctx.shadowBlur = targetMode === 'ambient' ? 8 : 14;
        ctx.fillStyle = `rgba(${r}, ${g}, ${b}, ${alpha})`;

        ctx.beginPath();
        const renderRadius = targetMode === 'ambient' ? p.radius : p.radius * 1.15;
        ctx.arc(p.x, p.y, renderRadius, 0, Math.PI * 2);
        ctx.fill();
        ctx.restore();
      });

      animId = requestAnimationFrame(draw);
    };

    animId = requestAnimationFrame(draw);

    return () => {
      if (animId) cancelAnimationFrame(animId);
      resizeObserver.disconnect();
    };
  }, []);

  return (
    <div className={styles.backdropParticlesLayer} ref={containerRef} aria-hidden="true">
      <canvas ref={canvasRef} className={styles.backdropParticlesCanvas} />
    </div>
  );
}
