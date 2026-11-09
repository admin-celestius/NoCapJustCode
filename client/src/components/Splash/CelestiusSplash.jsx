// client/src/components/Splash/CelestiusSplash.jsx
import React, { useState, useEffect, useRef } from 'react';
import styles from './CelestiusSplash.module.css';
import { SPLASH_TIMINGS } from '../Intro/introConstants.js';
import { logTimelineEvent } from '../../utils/timelineLogger.js';
import PresentedBrandTag from './PresentedBrandTag.jsx';

import celestiusWebp from '../../assets/celestius-transparent.webp';
import celestius2xWebp from '../../assets/celestius-transparent@2x.webp';
import celestiusPng from '../../assets/celestius-transparent.png';
import celestius2xPng from '../../assets/celestius-transparent@2x.png';

/**
 * CelestiusSplash screen:
 * Renders ONLY:
 * 1. The PRESENTED BY brand tag (slanted cream parallelogram with dark pixel text, yellow checkers & brackets)
 * 2. The Celestius logo image
 * (Zero stray or plain text nodes beside or around the logo)
 *
 * Sequence:
 * - Fade in (300ms, scale 0.96 -> 1.0)
 * - Hold (1000ms)
 * - Fade out into site (300ms)
 * Total duration: 1600ms (1.6s)
 */
export default function CelestiusSplash({ onComplete }) {
  const [animState, setAnimState] = useState('entering');
  const splashRef = useRef(null);
  const onCompleteRef = useRef(onComplete);

  useEffect(() => {
    onCompleteRef.current = onComplete;
  }, [onComplete]);

  useEffect(() => {
    logTimelineEvent('splash start');

    // Body scroll lock
    const prevOverflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden';

    const isReduced = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    const fadeInDuration = isReduced ? 150 : SPLASH_TIMINGS.FADE_IN;
    const holdDuration = isReduced ? SPLASH_TIMINGS.REDUCED_HOLD : SPLASH_TIMINGS.HOLD;
    const fadeOutDuration = isReduced ? 200 : SPLASH_TIMINGS.FADE_OUT;

    // Start entering -> holding on next animation frame
    const startTimer = setTimeout(() => {
      setAnimState('holding');
    }, 20);

    // Transition from holding to exiting
    const exitTimer = setTimeout(() => {
      setAnimState('exiting');
    }, fadeInDuration + holdDuration);

    // Complete splash
    const completeTimer = setTimeout(() => {
      document.body.style.overflow = prevOverflow;
      logTimelineEvent('splash end');
      onCompleteRef.current?.();
    }, fadeInDuration + holdDuration + fadeOutDuration);

    return () => {
      clearTimeout(startTimer);
      clearTimeout(exitTimer);
      clearTimeout(completeTimer);
      document.body.style.overflow = prevOverflow;
    };
  }, []);

  const stateClass =
    animState === 'holding'
      ? styles.stateHolding
      : animState === 'exiting'
        ? styles.stateExiting
        : styles.stateEntering;

  return (
    <div
      ref={splashRef}
      className={`${styles.splashOverlay} ${animState === 'exiting' ? styles.overlayExiting : ''}`}
      role="dialog"
      aria-modal="true"
      aria-label="Presented by Celestius"
    >
      {/* Background Dot Grid and Radial Yellow Tint */}
      <div className={styles.dotGrid} aria-hidden="true" />
      <div className={styles.radialTint} aria-hidden="true" />

      {/* Centered Presentation Block */}
      <div className={`${styles.content} ${stateClass}`}>
        {/* Pixel-styled brand tag (cream parallelogram with yellow checkers & brackets) */}
        <PresentedBrandTag className={styles.brandTag} />

        <a
          href="https://celestius.in"
          target="_blank"
          rel="noopener noreferrer"
          className={styles.logoWrapper}
          aria-label="Celestius website (opens in a new tab)"
        >
          <picture>
            <source
              srcSet={`${celestiusWebp} 1x, ${celestius2xWebp} 2x`}
              type="image/webp"
            />
            <img
              src={celestiusPng}
              srcSet={`${celestiusPng} 1x, ${celestius2xPng} 2x`}
              alt="Celestius"
              className={styles.logoImg}
              width={773}
              height={241}
              style={{ aspectRatio: '773 / 241' }}
              loading="eager"
            />
          </picture>
        </a>
      </div>
    </div>
  );
}
