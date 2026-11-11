// client/src/components/PromoPopup/PromoPopup.jsx
import React, { useEffect, useState } from 'react';
import { createPortal } from 'react-dom';
import styles from './PromoPopup.module.css';
import { PROMO_END_MS, PROMO_PRICING } from '../../data/event.js';

function getTimeLeft() {
  const diff = Math.max(0, PROMO_END_MS - Date.now());
  const totalSeconds = Math.floor(diff / 1000);
  const days = Math.floor(totalSeconds / 86400);
  const hours = Math.floor((totalSeconds % 86400) / 3600);
  const minutes = Math.floor((totalSeconds % 3600) / 60);
  const seconds = totalSeconds % 60;
  return { diff, days, hours, minutes, seconds };
}

const pad = (n) => String(n).padStart(2, '0');

export default function PromoPopup({ isOpen, onClose, onRegister }) {
  const [timeLeft, setTimeLeft] = useState(getTimeLeft);

  useEffect(() => {
    if (!isOpen) return;

    const tick = () => {
      const next = getTimeLeft();
      setTimeLeft(next);
      if (next.diff <= 0) {
        onClose?.();
      }
    };

    tick();
    const timer = setInterval(tick, 1000);
    return () => clearInterval(timer);
  }, [isOpen, onClose]);

  useEffect(() => {
    if (!isOpen) return;
    const handleKeyDown = (e) => {
      if (e.key === 'Escape') {
        onClose?.();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, onClose]);

  if (!isOpen || timeLeft.diff <= 0) return null;

  const handleClaim = () => {
    onClose?.();
    onRegister?.();
  };

  const discountAmount = PROMO_PRICING.regularPair - PROMO_PRICING.pair;

  return createPortal(
    <div
      className={styles.backdrop}
      onClick={(e) => {
        if (e.target === e.currentTarget) onClose?.();
      }}
      role="dialog"
      aria-modal="true"
      aria-labelledby="promo-popup-title"
    >
      <div className={styles.cardWrapper}>
        {/* Floating Circular Close Button Straddling Top-Right Corner */}
        <button
          type="button"
          className={styles.closeBtn}
          onClick={onClose}
          aria-label="Close offer popup"
        >
          <svg
            width="15"
            height="15"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="2.1"
            strokeLinecap="round"
            strokeLinejoin="round"
            aria-hidden="true"
          >
            <line x1="18" y1="6" x2="6" y2="18" />
            <line x1="6" y1="6" x2="18" y2="18" />
          </svg>
        </button>

        {/* Chamfered 1px Orange Cyber Shell */}
        <div className={styles.cardShell}>
          <div className={styles.cardInner}>
            {/* Top Eyebrow */}
            <div className={styles.eyebrowRow}>
              <span className={styles.eyebrowDot} aria-hidden="true" />
              <span className={styles.eyebrowText}>CELESTIUS · NOV 11 SPECIAL</span>
            </div>

            {/* Large Focal Portrait */}
            <div className={styles.portraitStage}>
              <div className={styles.portraitGlow} aria-hidden="true" />
              <img
                src="/national-education-day.png"
                alt="Maulana Abul Kalam Azad, First Education Minister of Independent India"
                className={styles.portraitImg}
                width="196"
                height="196"
              />
            </div>

            {/* Small Respectful Attribution & Classy Quote */}
            <div className={styles.honoreeBlock}>
              <span className={styles.honoreeName}>
                Maulana Abul Kalam Azad &middot; <span className={styles.honoreeYears}>1947–1958</span>
              </span>
              <p className={styles.quoteLine}>
                &ldquo;Education imparted by heart can bring revolution in the society.&rdquo;
              </p>
            </div>

            <div className={`${styles.hairlineDivider} ${styles.hairlineTop}`} aria-hidden="true" />

            {/* Centered Bold Pricing Lockup (breaks up the two text sections) */}
            <div className={styles.priceBlock}>
              <div className={styles.priceLockup}>
                <span className={styles.oldPriceWrap}>
                  <span className={styles.oldPriceText}>₹{PROMO_PRICING.regularPair}</span>
                  <span className={styles.oldPriceSlash} aria-hidden="true" />
                </span>
                <span className={styles.newPrice}>₹{PROMO_PRICING.pair}</span>
              </div>
              <span className={styles.priceMeta}>+ TAXES · BOTH CODERS</span>
            </div>

            <div className={`${styles.hairlineDivider} ${styles.hairlineBottom}`} aria-hidden="true" />

            {/* Bold Attention-Grabbing Offer Section */}
            <div className={styles.offerSection}>
              <h2 id="promo-popup-title" className={styles.offerHeading}>
                National Education Day Promotional Offer
              </h2>
              <p className={styles.catchyLine}>
                Celestius drops ₹{discountAmount} off your duo pass — celebrate his legacy and lock in together.
              </p>

              {/* Split-Flap Precision Countdown Timer */}
              <div className={styles.timerContainer} aria-label="Offer countdown timer">
                <span className={styles.timerHeader}>OFFER ENDS IN</span>
                <div className={styles.timerGrid}>
                  {[
                    { unit: 'DAYS', value: timeLeft.days },
                    { unit: 'HRS', value: timeLeft.hours },
                    { unit: 'MIN', value: timeLeft.minutes },
                    { unit: 'SEC', value: timeLeft.seconds, live: true },
                  ].map((item, idx) => (
                    <React.Fragment key={item.unit}>
                      {idx > 0 && (
                        <span
                          className={styles.timerColon}
                          style={{ '--tile-idx': idx }}
                          aria-hidden="true"
                        >
                          :
                        </span>
                      )}
                      <div className={styles.timerTile} style={{ '--tile-idx': idx }}>
                        <div className={`${styles.tileCard} ${item.live ? styles.tileCardLive : ''}`}>
                          <span className={`${styles.tileNumber} ${item.live ? styles.tileNumberLive : ''}`}>
                            {pad(item.value)}
                          </span>
                        </div>
                        <span className={styles.tileUnit}>{item.unit}</span>
                      </div>
                    </React.Fragment>
                  ))}
                </div>
              </div>
            </div>

            {/* Warm Burnt-Orange CTA */}
            <button type="button" className={styles.ctaBtn} onClick={handleClaim}>
              <span>CLAIM ₹{PROMO_PRICING.pair} DUO PASS</span>
              <svg
                width="15"
                height="15"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="2.3"
                strokeLinecap="round"
                strokeLinejoin="round"
                aria-hidden="true"
              >
                <line x1="5" y1="12" x2="19" y2="12" />
                <polyline points="12 5 19 12 12 19" />
              </svg>
            </button>

            <span className={styles.footerCaption}>
              Ends <span className={styles.footerHighlight}>Nov 11 · 11:59 PM IST</span>
            </span>
          </div>
        </div>
      </div>
    </div>,
    document.body
  );
}
