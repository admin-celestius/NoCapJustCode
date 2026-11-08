// client/src/components/Register/BouncingBallsCanvas.jsx
import React, { useEffect, useRef } from 'react';
import styles from './Register.module.css';

const BALL_CONFIGS = [
  {
    radius: 34,
    colors: ['#FFC4A3', '#F26B3A', '#BA370E', '#4A1202'],
    glow: 'rgba(242, 107, 58, 0.45)',
    vx: 2.6,
    vy: 2.8,
    opacity: 0.9,
  },
  {
    radius: 25,
    colors: ['#FFD1B3', '#FF753A', '#C63D0F', '#4C1302'],
    glow: 'rgba(242, 107, 58, 0.42)',
    vx: -2.9,
    vy: 2.4,
    opacity: 0.88,
  },
  {
    radius: 38,
    colors: ['#FFBA94', '#F26B3A', '#B5330C', '#400F01'],
    glow: 'rgba(242, 107, 58, 0.46)',
    vx: 2.3,
    vy: -2.7,
    opacity: 0.92,
  },
  {
    radius: 20,
    colors: ['#FFE0CC', '#FF7D42', '#BD3C10', '#4A1202'],
    glow: 'rgba(242, 107, 58, 0.4)',
    vx: -3.2,
    vy: -2.8,
    opacity: 0.85,
  },
  {
    radius: 30,
    colors: ['#FFC8A8', '#F26B3A', '#B8380E', '#481102'],
    glow: 'rgba(242, 107, 58, 0.44)',
    vx: 2.8,
    vy: -2.5,
    opacity: 0.88,
  },
  {
    radius: 18,
    colors: ['#FFE2D1', '#FF6D30', '#B0330A', '#420F01'],
    glow: 'rgba(242, 107, 58, 0.4)',
    vx: -3.4,
    vy: 3.1,
    opacity: 0.85,
  },
  {
    radius: 24,
    colors: ['#FFCEAF', '#F26B3A', '#BD3C10', '#4A1202'],
    glow: 'rgba(242, 107, 58, 0.42)',
    vx: 2.7,
    vy: 2.9,
    opacity: 0.87,
  },
];

export default function BouncingBallsCanvas() {
  const canvasRef = useRef(null);
  const containerRef = useRef(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    const container = containerRef.current;
    if (!canvas || !container) return;

    const ctx = canvas.getContext('2d', { alpha: true });
    if (!ctx) return;

    let animId = null;
    let width = 0;
    let height = 0;

    // Initialize ball physics states
    const balls = BALL_CONFIGS.map((cfg, i) => {
      return {
        ...cfg,
        x: 60 + i * 55,
        y: 50 + (i % 3) * 80,
        vx: cfg.vx,
        vy: cfg.vy,
      };
    });

    const resize = () => {
      const rect = container.getBoundingClientRect();
      width = Math.max(10, rect.width);
      height = Math.max(10, rect.height);

      const dpr = window.devicePixelRatio || 1;
      canvas.width = Math.floor(width * dpr);
      canvas.height = Math.floor(height * dpr);
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);

      // Clamp balls within current bounds
      balls.forEach((b) => {
        if (b.x < b.radius) b.x = b.radius;
        if (b.x > width - b.radius) b.x = width - b.radius;
        if (b.y < b.radius) b.y = b.radius;
        if (b.y > height - b.radius) b.y = height - b.radius;
      });
    };

    const resizeObserver = new ResizeObserver(() => {
      resize();
    });
    resizeObserver.observe(container);
    resize();

    let lastTime = performance.now();

    const draw = (now) => {
      const dt = Math.min((now - lastTime) / 16.666, 2.5); // Normalize to 60fps frame delta
      lastTime = now;

      ctx.clearRect(0, 0, width, height);

      balls.forEach((ball) => {
        ball.x += ball.vx * dt;
        ball.y += ball.vy * dt;

        // Bounce horizontally
        if (ball.x - ball.radius <= 0) {
          ball.x = ball.radius;
          ball.vx = Math.abs(ball.vx);
        } else if (ball.x + ball.radius >= width) {
          ball.x = width - ball.radius;
          ball.vx = -Math.abs(ball.vx);
        }

        // Bounce vertically
        if (ball.y - ball.radius <= 0) {
          ball.y = ball.radius;
          ball.vy = Math.abs(ball.vy);
        } else if (ball.y + ball.radius >= height) {
          ball.y = height - ball.radius;
          ball.vy = -Math.abs(ball.vy);
        }

        // Render 3D shaded sphere
        ctx.save();
        ctx.globalAlpha = ball.opacity;

        ctx.shadowColor = ball.glow;
        ctx.shadowBlur = 18;
        ctx.shadowOffsetX = 0;
        ctx.shadowOffsetY = 6;

        const lightX = ball.x - ball.radius * 0.35;
        const lightY = ball.y - ball.radius * 0.35;
        const grad = ctx.createRadialGradient(
          lightX,
          lightY,
          ball.radius * 0.08,
          ball.x,
          ball.y,
          ball.radius
        );

        grad.addColorStop(0, ball.colors[0]);
        grad.addColorStop(0.38, ball.colors[1]);
        grad.addColorStop(0.82, ball.colors[2]);
        grad.addColorStop(1, ball.colors[3]);

        ctx.beginPath();
        ctx.arc(ball.x, ball.y, ball.radius, 0, Math.PI * 2);
        ctx.fillStyle = grad;
        ctx.fill();

        // High-gloss specular highlight
        ctx.shadowColor = 'transparent';
        const specGrad = ctx.createRadialGradient(
          lightX,
          lightY,
          0,
          lightX,
          lightY,
          ball.radius * 0.45
        );
        specGrad.addColorStop(0, 'rgba(255, 255, 255, 0.45)');
        specGrad.addColorStop(0.5, 'rgba(255, 255, 255, 0.12)');
        specGrad.addColorStop(1, 'rgba(255, 255, 255, 0)');

        ctx.beginPath();
        ctx.arc(lightX, lightY, ball.radius * 0.45, 0, Math.PI * 2);
        ctx.fillStyle = specGrad;
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
    <div className={styles.bouncingBallsWrapper} ref={containerRef} aria-hidden="true">
      <canvas ref={canvasRef} className={styles.bouncingBallsCanvas} />
    </div>
  );
}
