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

              <a
                href="https://celestius.in"
                target="_blank"
                rel="noopener noreferrer"
                className={styles.celestiusLogoWrapper}
                aria-label="Celestius website (opens in a new tab)"
              >
                <picture>
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
              </a>
            </div>

            {/* Standalone Distinctive Tagline Text (Pure text, no badge) */}
            <div className={styles.brandTaglineText}>
              no larping. only coding.
            </div>

            <p className={styles.brandBio}>Presented by {eventData.presentedBy}. Built for the ones who actually code. No larping, no glazing, just pure problem-solving.</p>



            {/* Organiser Direct Comms */}
            <div className={styles.contactSection}>
              <span className={styles.contactHeaderLabel}>Need Backup? // Direct Comms</span>
              <div className={styles.contactGrid}>
                {eventData.organisers?.map((org, idx) => (
                  <div key={idx} className={styles.contactCard}>
                    <div className={styles.contactMeta}>
                      <span className={styles.contactPersonName}>{org.name}</span>
                      <a
                        href={`tel:${org.rawPhone || org.phone.replace(/\s+/g, '')}`}
                        className={styles.contactPhoneNumber}
                        aria-label={`Call ${org.name} at ${org.phone}`}
                      >
                        {org.phone}
                      </a>
                    </div>
                    <div className={styles.contactActions}>
                      {/* Call Button - Opens Dialer */}
                      <a
                        href={`tel:${org.rawPhone || org.phone.replace(/\s+/g, '')}`}
                        className={styles.phoneButton}
                        aria-label={`Call ${org.name} at ${org.phone}`}
                        title={`Call ${org.name}`}
                      >
                        <svg
                          width="14"
                          height="14"
                          viewBox="0 0 24 24"
                          fill="none"
                          stroke="currentColor"
                          strokeWidth="2.2"
                          strokeLinecap="round"
                          strokeLinejoin="round"
                          aria-hidden="true"
                        >
                          <path d="M22 16.92v3a2 2 0 0 1-2.18 2 19.79 19.79 0 0 1-8.63-3.07 19.5 19.5 0 0 1-6-6 19.79 19.79 0 0 1-3.07-8.67A2 2 0 0 1 4.11 2h3a2 2 0 0 1 2 1.72 12.84 12.84 0 0 0 .7 2.81 2 2 0 0 1-.45 2.11L8.09 9.91a16 16 0 0 0 6 6l1.27-1.27a2 2 0 0 1 2.11-.45 12.84 12.84 0 0 0 2.81.7A2 2 0 0 1 22 16.92z" />
                        </svg>
                      </a>

                      {/* WhatsApp Button - Direct Chat */}
                      <a
                        href={org.waLink || `https://wa.me/${org.phone.replace(/[^0-9]/g, '')}`}
                        target={LINK_TARGET}
                        rel="noopener noreferrer"
                        className={styles.whatsappButton}
                        aria-label={`Chat with ${org.name} on WhatsApp`}
                        title={`WhatsApp ${org.name}`}
                      >
                        <svg
                          width="14"
                          height="14"
                          viewBox="0 0 24 24"
                          fill="none"
                          stroke="currentColor"
                          strokeWidth="2.2"
                          strokeLinecap="round"
                          strokeLinejoin="round"
                          aria-hidden="true"
                        >
                          <path d="M21 11.5a8.38 8.38 0 0 1-.9 3.8 8.5 8.5 0 0 1-7.6 4.7 8.38 8.38 0 0 1-3.8-.9L3 21l1.9-5.7a8.38 8.38 0 0 1-.9-3.8 8.5 8.5 0 0 1 4.7-7.6 8.38 8.38 0 0 1 3.8-.9h.5a8.48 8.48 0 0 1 8 8v.5z" />
                        </svg>
                      </a>
                    </div>
                  </div>
                ))}
              </div>
            </div>

          </div>

          {/* Quick Links Column */}
          <div className={`${styles.footerCol} scrollReveal`} style={{ transitionDelay: '100ms' }}>
            <span className={styles.colTitle}>Fast Travel</span>
            <ul className={styles.colList}>
              <li>
                <a href="#hero" className={styles.colLink}>
                  <span className={styles.linkArrow} aria-hidden="true">▸</span>
                  <span>Spawn Point</span>
                </a>
              </li>
              <li>
                <a href="#about" className={styles.colLink}>
                  <span className={styles.linkArrow} aria-hidden="true">▸</span>
                  <span>The Lore</span>
                </a>
              </li>
              <li>
                <a href="#schedule" className={styles.colLink}>
                  <span className={styles.linkArrow} aria-hidden="true">▸</span>
                  <span>The Game Plan</span>
                </a>
              </li>
              <li>
                <a href="#events" className={styles.colLink}>
                  <span className={styles.linkArrow} aria-hidden="true">▸</span>
                  <span>The Lineup</span>
                </a>
              </li>
            </ul>
          </div>

          {/* Connect Column (Complete UI Redesign: Interactive Terminal Uplink, NO badges) */}
          <div id="connect" className={`${styles.connectCol} scrollReveal`} style={{ transitionDelay: '180ms' }}>
            <span className={styles.colTitle}>Slide Into Our DMs</span>

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
                  <span className={styles.cliComment}># 01. the official lore</span>
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
                  <span className={styles.cliComment}># 02. peep the chaos</span>
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
            <span className={styles.copyrightAside}> // Made with claude, caffeine, and questionable life choices.</span>
          </p>

          <button type="button" className={styles.backToTopBtn} onClick={scrollToTop} aria-label="Scroll back to top">
            <span>Teleport to Spawn</span>
            <span className={styles.topArrow}>&uarr;</span>
          </button>
        </div>
      </div>
    </footer>
  );
}
