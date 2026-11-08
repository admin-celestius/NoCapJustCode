// client/src/components/Quote/Quote.jsx
import React, { useState, useEffect, useRef } from 'react';
import styles from './Quote.module.css';
import thinkerWebp from '../../assets/thinker.webp';
import thinker450Webp from '../../assets/thinker-450w.webp';
import { QUOTE, QUOTE_ATTRIBUTION } from '../../data/event.js';

// Dense hatching reads strong, keep statue quiet at 0.7 opacity
const STATUE_OPACITY = 0.7;

export default function Quote({ isHero = false, animateIn = true }) {
  const sectionRef = useRef(null);
  const [isRevealed, setIsRevealed] = useState(() => {
    if (typeof window === 'undefined') return true;
    return window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  });

  useEffect(() => {
    const el = sectionRef.current;
    if (!el || window.matchMedia('(prefers-reduced-motion: reduce)').matches) {
      setIsRevealed(true);
      return;
    }

    // Apply interactive pre-state only after JS observer is ready
    el.setAttribute('data-ready', 'true');

    if (isHero) {
      if (animateIn) {
        // Stagger by 420ms so heroGlide arrives first, then statue blooms and typing triggers in front of user
        const timer = setTimeout(() => {
          setIsRevealed(true);
        }, 420);
        return () => clearTimeout(timer);
      } else {
        setIsRevealed(false);
      }
      return;
    }

    const checkReveal = () => {
      const rect = el.getBoundingClientRect();
      const windowHeight = window.innerHeight || document.documentElement.clientHeight;
      if (rect.top <= windowHeight * 0.85 && rect.bottom >= 0) {
        setIsRevealed(true);
        return true;
      }
      return false;
    };

    if (checkReveal()) return;

    let observer;
    if ('IntersectionObserver' in window) {
      observer = new IntersectionObserver(
        (entries) => {
          const [entry] = entries;
          if (entry && entry.isIntersecting) {
            setIsRevealed(true);
            observer.disconnect();
          }
        },
        {
          threshold: 0.1,
          rootMargin: '0px 0px -40px 0px',
        }
      );
      observer.observe(el);
    }

    const handleScroll = () => {
      if (checkReveal() && observer) {
        observer.disconnect();
        window.removeEventListener('scroll', handleScroll);
      }
    };

    window.addEventListener('scroll', handleScroll, { passive: true });

    return () => {
      window.removeEventListener('scroll', handleScroll);
      if (observer) observer.disconnect();
    };
  }, [isHero, animateIn]);

  const Tag = isHero ? 'div' : 'section';

  return (
    <Tag
      id="quote"
      ref={sectionRef}
      className={`${styles.quoteSection} ${isHero ? styles.heroQuote : ''}`}
      data-revealed={isRevealed ? 'true' : 'false'}
      style={{ '--statue-opacity': STATUE_OPACITY }}
    >
      <div className={isHero ? styles.heroQuoteContainer : styles.quoteContainer}>
        <figure className={`${styles.quoteFigure} ${isHero ? styles.heroQuoteFigure : ''}`}>
          {/* Statue Column with Holographic Bloom & Idle Breath Animation */}
          <div className={`${styles.statueWrapper} ${isHero ? styles.heroStatueWrapper : ''}`}>
            {/* Ambient Aura behind the statue */}
            <div className={styles.statueAmbientAura} aria-hidden="true" />

            <img
              src={thinkerWebp}
              srcSet={`${thinker450Webp} 450w, ${thinkerWebp} 900w`}
              sizes={isHero ? "(min-width: 1024px) 260px, (min-width: 768px) 220px, 45vw" : "(min-width: 1024px) 450px, (min-width: 768px) 320px, 62vw"}
              width={900}
              height={1420}
              alt="Orange line drawing of The Thinker statue, seated with his chin on his hand"
              className={`${styles.statueImage} ${isHero ? styles.heroStatueImage : ''}`}
              decoding="async"
              loading={isHero ? "eager" : "lazy"}
            />
          </div>

          {/* Quote Column with Animated Laser Ruler */}
          <div className={`${styles.quoteContent} ${isHero ? styles.heroQuoteContent : ''}`}>
            {/* Laser Vertical Ruler */}
            <div className={styles.laserRuler} aria-hidden="true">
              <span className={styles.laserRulerBeam} />
              <span className={styles.laserRulerSpark} />
            </div>

            {/* Mobile / Tablet orange divider */}
            <div className={styles.mobileDivider} aria-hidden="true" />

            {/* Screen readers read complete quote immediately */}
            <blockquote className={styles.srOnly}>
              “{QUOTE}”
            </blockquote>

            {/* CRT Display with Scanlines, Glow, and typing effect */}
            <div className={styles.quoteDisplay} aria-hidden="true">
              {/* Ghost block: reserves height to eliminate CLS */}
              <div className={styles.quoteGhost}>
                <span>
                  The more u <span className={styles.larpCream}>larp</span>,
                </span>
                <span>
                  the less u <span className={styles.larpCream}>larp</span>.
                </span>
              </div>

              {/* Animated overlay */}
              <div className={styles.quoteAnimated}>
                <span className={`${styles.quoteLine} ${styles.line1}`}>
                  The more u <span className={styles.larpCream}>larp</span>,
                  <span className={styles.cursor1} />
                </span>
                <span className={`${styles.quoteLine} ${styles.line2}`}>
                  the less u <span className={styles.larpCream}>larp</span>.
                  <span className={styles.cursor2} />
                </span>
              </div>
            </div>

            <figcaption className={styles.attribution}>
              <span className={styles.attributionDash}>—</span> {QUOTE_ATTRIBUTION}
            </figcaption>
          </div>
        </figure>
      </div>
    </Tag>
  );
}
