// client/src/components/About/About.jsx
import React from 'react';
import styles from './About.module.css';
import { eventData } from '../../data/event.js';
import { SectionScene } from '../Scene/index.js';

export default function About() {
  return (
    <section id="about" className={`section ${styles.aboutSection}`}>
      <SectionScene section="about" />
      <div className={`container ${styles.aboutContainer}`}>
        <div className={styles.aboutGrid}>
          {/* Left Text */}
          <div className={styles.textContent}>
            <div className="section-tag scrollReveal" style={{ transitionDelay: '0ms' }}>
              // 01. THE LORE
            </div>
            <h2 className="section-title scrollReveal" style={{ transitionDelay: '80ms' }}>
              All talk? Time to beat the allegations.
            </h2>
            <p className={`${styles.description} scrollReveal`} style={{ transitionDelay: '160ms' }}>
              Think you're cracked at coding? Time to prove it. No buzzword flexing, no tutorial merchant energy.
              Just pure logic and problem-solving.
            </p>
            <p className={`${styles.subDescription} scrollReveal`} style={{ transitionDelay: '240ms' }}>
              From getting your training arc in to entering the coding battleground, this is where theory meets reality.
              Your GitHub contributions won't save you here.
            </p>
          </div>

          {/* Right Neutral Stat Tiles */}
          <div className={styles.statsGrid}>
            {eventData.stats.map((stat, idx) => {
              const isBrand = idx === 2 || stat.label?.toLowerCase().includes('presented');
              return (
                <div
                  key={idx}
                  className={`${styles.statCard} ${isBrand ? styles.statCardBrand : ''} scrollReveal`}
                  style={{ transitionDelay: `${280 + idx * 110}ms` }}
                >
                  <span className={styles.cardAccentLine} aria-hidden="true" />
                  {isBrand ? (
                    <div className={styles.brandBlock}>
                      <span className={styles.brandEyebrow}>
                        <span className={styles.brandBeaconDot} aria-hidden="true" />
                        Presented by
                      </span>
                      <div className={styles.brandValue}>{stat.value}</div>
                    </div>
                  ) : (
                    <>
                      <div className={styles.statValue}>{stat.value}</div>
                      <div className={styles.statLabel}>{stat.label}</div>
                    </>
                  )}
                </div>
              );
            })}
          </div>
        </div>
      </div>
    </section>
  );
}
