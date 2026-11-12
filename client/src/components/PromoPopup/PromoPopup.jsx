// client/src/components/PromoPopup/PromoPopup.jsx
import React, { useEffect } from 'react';
import { createPortal } from 'react-dom';
import styles from './PromoPopup.module.css';
import { PROMO_PRICING } from '../../data/event.js';

export default function PromoPopup({ isOpen, onClose, onRegister }) {
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

  if (!isOpen) return null;

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
              <span className={styles.eyebrowText}>CELESTIUS · NATIONAL EDUCATION DAY</span>
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

              {/* Closing Soon Status Banner */}
              <div className={styles.closingSoonBox} aria-label="Offer status: Closing soon">
                <span className={styles.closingSoonLabel}>OFFER STATUS</span>
                <span className={styles.closingSoonValue}>CLOSING SOON</span>
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
              Limited Period Offer · <span className={styles.footerHighlight}>Closing Soon</span>
            </span>
          </div>
        </div>
      </div>
    </div>,
    document.body
  );
}
