// client/src/components/Footer/Footer.jsx
import React, { useEffect } from 'react';
import styles from './Footer.module.css';
import navbarLogoWebp from '../../assets/logo-navbar.webp';
import navbarLogoPng from '../../assets/logo-navbar.png';
import { eventData, LINK_TARGET } from '../../data/event.js';
import { SectionScene } from '../Scene/index.js';

export default function Footer() {
  const scrollToTop = () => {
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  useEffect(() => {
    // Component mounted
  }, []);

  return (
    <footer className={styles.footer}>
      <SectionScene section="footer" />
      <div className={`container ${styles.footerContainer}`}>
        <div className={styles.footerGrid}>
          {/* Brand Column */}
          <div className={`${styles.brandCol} scrollReveal`} style={{ transitionDelay: '0ms' }}>
            <div className={styles.brandHeading}>
              <picture>
                <source srcSet={navbarLogoWebp} type="image/webp" />
                <img
                  src={navbarLogoPng}
                  alt="Larper or Coder"
                  className={styles.footerLogo}
                  width={320}
                  height={163}
                  style={{ aspectRatio: '320 / 163' }}
                />
              </picture>
            </div>
            <span className={styles.tagline}>{eventData.tagline}</span>
            <p className={styles.brandBio}>
              Presented by {eventData.presentedBy}.
              The definitive battleground for developers and problem solvers.
            </p>
          </div>

          {/* Quick Links */}
          <div className={`${styles.footerCol} scrollReveal`} style={{ transitionDelay: '100ms' }}>
            <span className={styles.colTitle}>Navigation</span>
            <ul className={styles.colList}>
              <li>
                <a href="#hero" className={styles.colLink}>Home</a>
              </li>
              <li>
                <a href="#about" className={styles.colLink}>About the Event</a>
              </li>
              <li>
                <a href="#schedule" className={styles.colLink}>Full Schedule</a>
              </li>
              <li>
                <a href="#events" className={styles.colLink}>Tracks & Arenas</a>
              </li>
            </ul>
          </div>

          {/* Connect Column */}
          <div id="connect" className={`${styles.connectCol} scrollReveal`} style={{ transitionDelay: '180ms' }}>
            <span className={styles.colTitle}>Connect</span>
            <div className={styles.cardsList}>
              {/* Website Card */}
              <a
                href={eventData.connect.website}
                target={LINK_TARGET}
                rel="noopener noreferrer"
                className={`${styles.connectCard} scrollReveal`}
                style={{ transitionDelay: '220ms' }}
                aria-label="Visit the Celestius website (opens in a new tab)"
              >
                <div className={styles.iconTile} aria-hidden="true">
                  <svg
                    width="20"
                    height="20"
                    viewBox="0 0 24 24"
                    fill="none"
                    stroke="currentColor"
                    strokeWidth="1.75"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    className={styles.iconSvg}
                  >
                    <circle cx="12" cy="12" r="10" />
                    <line x1="2" y1="12" x2="22" y2="12" />
                    <path d="M12 2a15.3 15.3 0 0 1 4 10 15.3 15.3 0 0 1-4 10 15.3 15.3 0 0 1-4-10 15.3 15.3 0 0 1 4-10z" />
                  </svg>
                </div>
                <div className={styles.cardInfo}>
                  <span className={styles.cardLabel}>Website</span>
                  <span className={styles.cardDetail}>
                    {eventData.connect.websiteLabel || 'celestius.in'}
                  </span>
                </div>
                <div className={styles.actionPill} aria-hidden="true">
                  <span className={styles.pillTextTouch}>TAP TO OPEN</span>
                  <span className={styles.pillTextMouse}>CLICK TO OPEN</span>
                  <span className={styles.pillTextNarrow}>OPEN</span>
                  <svg
                    width="12"
                    height="12"
                    viewBox="0 0 24 24"
                    fill="none"
                    stroke="currentColor"
                    strokeWidth="2.2"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    className={styles.pillArrow}
                  >
                    <line x1="7" y1="17" x2="17" y2="7" />
                    <polyline points="7 7 17 7 17 17" />
                  </svg>
                </div>
              </a>

              {/* Instagram Card */}
              <a
                href={eventData.connect.instagram}
                target={LINK_TARGET}
                rel="noopener noreferrer"
                className={`${styles.connectCard} scrollReveal`}
                style={{ transitionDelay: '300ms' }}
                aria-label="Open Celestius on Instagram (opens in a new tab)"
              >
                <div className={styles.iconTile} aria-hidden="true">
                  <svg
                    width="20"
                    height="20"
                    viewBox="0 0 24 24"
                    fill="none"
                    stroke="currentColor"
                    strokeWidth="1.75"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    className={styles.iconSvg}
                  >
                    <rect x="2" y="2" width="20" height="20" rx="5" ry="5" />
                    <path d="M16 11.37A4 4 0 1 1 12.63 8 4 4 0 0 1 16 11.37z" />
                    <line x1="17.5" y1="6.5" x2="17.51" y2="6.5" />
                  </svg>
                </div>
                <div className={styles.cardInfo}>
                  <span className={styles.cardLabel}>Instagram</span>
                  <span className={styles.cardDetail}>
                    {eventData.connect.instagramLabel || '@celestius_cit'}
                  </span>
                </div>
                <div className={styles.actionPill} aria-hidden="true">
                  <span className={styles.pillTextTouch}>TAP TO OPEN</span>
                  <span className={styles.pillTextMouse}>CLICK TO OPEN</span>
                  <span className={styles.pillTextNarrow}>OPEN</span>
                  <svg
                    width="12"
                    height="12"
                    viewBox="0 0 24 24"
                    fill="none"
                    stroke="currentColor"
                    strokeWidth="2.2"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    className={styles.pillArrow}
                  >
                    <line x1="7" y1="17" x2="17" y2="7" />
                    <polyline points="7 7 17 7 17 17" />
                  </svg>
                </div>
              </a>
            </div>
          </div>
        </div>

        {/* Bottom Bar */}
        <div className={`${styles.bottomBar} scrollReveal`} style={{ transitionDelay: '260ms' }}>
          <p className={styles.copyright}>
            &copy; {eventData.presentedBy}. All rights reserved.
          </p>

          <button type="button" className={styles.backToTopBtn} onClick={scrollToTop}>
            <span>Back to top</span>
            <span>&uarr;</span>
          </button>
        </div>
      </div>
    </footer>
  );
}
