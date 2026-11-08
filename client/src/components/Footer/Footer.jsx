// client/src/components/Footer/Footer.jsx
import React from 'react';
import styles from './Footer.module.css';
import navbarLogoWebp from '../../assets/logo-navbar.webp';
import navbarLogoPng from '../../assets/logo-navbar.png';
import celestiusWebp from '../../assets/celestius-transparent.webp';
import celestiusPng from '../../assets/celestius-transparent.png';
import { eventData, LINK_TARGET } from '../../data/event.js';
import { SectionScene } from '../Scene/index.js';

export default function Footer() {
  const scrollToTop = () => {
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  return (
    <footer className={styles.footer}>
      {/* Top Cyber Laser Glow Rail */}
      <div className={styles.footerLaserTop} aria-hidden="true" />
      <SectionScene section="footer" />

      <div className={`container ${styles.footerContainer}`}>
        <div className={styles.footerGrid}>
          {/* Brand Column */}
          <div className={`${styles.brandCol} scrollReveal`} style={{ transitionDelay: '0ms' }}>
            {/* Logos: LOC Logo + Vertical Ruler + Celestius Logo (Enlarged) */}
            <div className={styles.brandHeading}>
              <picture className={styles.footerLogoWrapper}>
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

              <span className={styles.brandDivider} aria-hidden="true" />

              <picture className={styles.celestiusLogoWrapper}>
                <source srcSet={celestiusWebp} type="image/webp" />
                <img
                  src={celestiusPng}
                  alt="Celestius"
                  className={styles.footerCelestiusLogo}
                  width={386}
                  height={120}
                  style={{ aspectRatio: '386 / 120' }}
                />
              </picture>
            </div>

            {/* Standalone Distinctive Tagline Text (Pure text, no badge) */}
            <div className={styles.brandTaglineText}>
              no larping. only coding.
            </div>

            <p className={styles.brandBio}>
              Presented by {eventData.presentedBy}. A battleground where resume buzzwords don't save you. Only pure logic and locked-in problem solving.
            </p>
          </div>

          {/* Quick Links Column */}
          <div className={`${styles.footerCol} scrollReveal`} style={{ transitionDelay: '100ms' }}>
            <span className={styles.colTitle}>Navigation</span>
            <ul className={styles.colList}>
              <li>
                <a href="#hero" className={styles.colLink}>
                  <span className={styles.linkArrow} aria-hidden="true">▸</span>
                  <span>Home</span>
                </a>
              </li>
              <li>
                <a href="#about" className={styles.colLink}>
                  <span className={styles.linkArrow} aria-hidden="true">▸</span>
                  <span>About the Event</span>
                </a>
              </li>
              <li>
                <a href="#schedule" className={styles.colLink}>
                  <span className={styles.linkArrow} aria-hidden="true">▸</span>
                  <span>Full Schedule</span>
                </a>
              </li>
              <li>
                <a href="#events" className={styles.colLink}>
                  <span className={styles.linkArrow} aria-hidden="true">▸</span>
                  <span>Tracks & Arenas</span>
                </a>
              </li>
            </ul>
          </div>

          {/* Connect Column (Complete UI Redesign: Interactive Terminal Uplink, NO badges) */}
          <div id="connect" className={`${styles.connectCol} scrollReveal`} style={{ transitionDelay: '180ms' }}>
            <span className={styles.colTitle}>Connect</span>

            <div className={styles.terminalConsole}>
              {/* Terminal Title Bar */}
              <div className={styles.terminalHeader}>
                <div className={styles.terminalLights} aria-hidden="true">
                  <span className={`${styles.lightDot} ${styles.lightRed}`} />
                  <span className={`${styles.lightDot} ${styles.lightYellow}`} />
                  <span className={`${styles.lightDot} ${styles.lightGreen}`} />
                </div>
                <span className={styles.terminalPath}>~/celestius/connect.sh</span>
              </div>

              {/* Terminal Commands Area */}
              <div className={styles.terminalBody}>
                {/* Direct Uplink 1: Website */}
                <div className={styles.commandUnit}>
                  <span className={styles.cliComment}># 01. official website</span>
                  <a
                    href={eventData.connect.website}
                    target={LINK_TARGET}
                    rel="noopener noreferrer"
                    className={styles.cliRow}
                    aria-label="Visit the Celestius website (opens in a new tab)"
                  >
                    <span className={styles.cliPrompt}>$</span>
                    <span className={styles.cliCmd}>open</span>
                    <span className={styles.cliTarget}>celestius.in</span>
                    <span className={styles.cliKey}>[ENTER ↵]</span>
                  </a>
                </div>

                {/* Direct Uplink 2: Instagram */}
                <div className={styles.commandUnit}>
                  <span className={styles.cliComment}># 02. social dispatch</span>
                  <a
                    href={eventData.connect.instagram}
                    target={LINK_TARGET}
                    rel="noopener noreferrer"
                    className={styles.cliRow}
                    aria-label="Open Celestius on Instagram (opens in a new tab)"
                  >
                    <span className={styles.cliPrompt}>$</span>
                    <span className={styles.cliCmd}>follow</span>
                    <span className={styles.cliTarget}>@celestius_cit</span>
                    <span className={styles.cliKey}>[ENTER ↵]</span>
                  </a>
                </div>

                {/* Blinking Interactive Prompt Line */}
                <div className={styles.terminalPromptLine}>
                  <span className={styles.cliUserPrompt}>visitor@cit:~$</span>
                  <span className={styles.terminalCursor} aria-hidden="true" />
                  <span className={styles.cliHint}>click command to execute</span>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Bottom Bar: Copyright & Back to Top */}
        <div className={`${styles.bottomBar} scrollReveal`} style={{ transitionDelay: '240ms' }}>
          <p className={styles.copyright}>
            &copy; {new Date().getFullYear()} {eventData.presentedBy} &middot; Larper or Coder. All rights reserved.
          </p>

          <button type="button" className={styles.backToTopBtn} onClick={scrollToTop} aria-label="Scroll back to top">
            <span>Back to top</span>
            <span className={styles.topArrow}>&uarr;</span>
          </button>
        </div>
      </div>
    </footer>
  );
}
