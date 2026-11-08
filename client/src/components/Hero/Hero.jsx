// client/src/components/Hero/Hero.jsx
import React from 'react';
import styles from './Hero.module.css';
import logoImg from '../../assets/logo-transparent.webp';
import logoPngFallback from '../../assets/logo-transparent.png';
import { eventData } from '../../data/event.js';
import Button from '../ui/Button.jsx';
import Chip from '../ui/Chip.jsx';
import Marquee from './Marquee.jsx';
import { SectionScene } from '../Scene/index.js';
import Quote from '../Quote/Quote.jsx';

export default function Hero({ onOpenRegister, animateIn }) {
  const scrollToEvents = (e) => {
    e.preventDefault();
    const target = document.getElementById('events');
    if (target) {
      target.scrollIntoView({ behavior: 'smooth' });
    }
  };

  return (
    <section id="hero" className={`${styles.heroSection} ${animateIn ? styles.heroEntrance : ''}`}>
      <SectionScene section="hero" />
      <div className={`container ${styles.heroContent}`}>
        <div className={styles.heroGrid}>
          {/* Left Column */}
          <div className={styles.leftCol}>
            <div className={styles.presenterPill}>
              PRESENTED BY CELESTIUS
            </div>

            <h1 className={styles.heroTitleH1}>
              <span className="sr-only">LARPER OR CODER - Coding Event by Celestius</span>
              <picture className={styles.heroLogoPicture}>
                <source srcSet={logoImg} type="image/webp" />
                <img
                  src={logoPngFallback}
                  alt="Larper or Coder"
                  className={`${styles.heroLogoImg} heroLogo`}
                  loading="eager"
                  fetchPriority="high"
                  width={617}
                  height={314}
                  style={{ aspectRatio: '617 / 314' }}
                />
              </picture>
            </h1>

            <div className={styles.tagline}>
              {eventData.tagline}
            </div>

            <p className={styles.leadText}>
              {eventData.description}
            </p>

            {/* Date, Venue & Pricing Chips */}
            <div className={styles.chipsContainer}>
              <div className={styles.priceChipRow}>
                <Chip
                  className={styles.heroChipFull}
                  icon={
                    <span style={{ fontWeight: 700, fontSize: '0.95rem' }}>₹</span>
                  }
                >
                  ₹149 per person // ₹298 with Hommiee
                </Chip>
              </div>

              <div className={styles.dateTimeVenueGrid}>
                <Chip
                  className={styles.heroChipGridItem}
                  icon={
                    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                      <rect x="3" y="4" width="18" height="18" rx="2" ry="2" />
                      <line x1="16" y1="2" x2="16" y2="6" />
                      <line x1="8" y1="2" x2="8" y2="6" />
                      <line x1="3" y1="10" x2="21" y2="10" />
                    </svg>
                  }
                >
                  DATE: {eventData.date}
                </Chip>

                <Chip
                  className={styles.heroChipGridItem}
                  icon={
                    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                      <path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0 1 18 0z" />
                      <circle cx="12" cy="10" r="3" />
                    </svg>
                  }
                >
                  VENUE: {eventData.venue}
                </Chip>
              </div>
            </div>

            {/* Action Buttons */}
            <div className={styles.ctaGroup}>
              <Button size="lg" variant="primary" onClick={() => onOpenRegister()}>
                Register with Hommiee
              </Button>
              <Button
                size="lg"
                variant="secondary"
                href="#events"
                onClick={scrollToEvents}
                className={styles.secondaryQuietBtn}
              >
                See Events
              </Button>
            </div>
          </div>

          {/* Right Column: The Thinker Statue & Quote (In place of Laptop) */}
          <div className={styles.rightCol}>
            <Quote isHero={true} animateIn={animateIn} />
          </div>
        </div>
      </div>

      {/* Marquee Ticker */}
      <Marquee />
    </section>
  );
}
