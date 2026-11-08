// client/src/components/Events/EventCard.jsx
import React, { useRef } from 'react';
import styles from './Events.module.css';
import logoWebp from '../../assets/logo-transparent.webp';
import logoPng from '../../assets/logo-transparent.png';

export default function EventCard({
  event,
  index,
  isFlipped,
  animationStage,
  onCardClick,
  onOpenDetails,
  style = {},
}) {
  const cardRef = useRef(null);
  const numeral = event.numeral || String(index + 1).padStart(2, '0');
  const tagLabel = event.tagLabel || (index === 0 ? 'WORKSHOP' : 'COMPETITION');
  const isSecondCard = index === 1;
  const isTle = event.id === 'tle' || isSecondCard;

  const handleKeyDown = (e) => {
    if (e.key === 'Enter' || e.key === ' ') {
      e.preventDefault();
      if (!isFlipped) {
        onCardClick();
      } else {
        onOpenDetails(event, cardRef);
      }
    }
  };

  const stageClass =
    animationStage === 'spinning'
      ? styles.stageSpinning
      : animationStage === 'splitting'
      ? styles.stageSplitting
      : animationStage === 'ready'
      ? styles.stageReady
      : styles.stageIdle;

  const cardIndexClass = isSecondCard ? styles.cardTwo : styles.cardOne;
  const accentClass = isSecondCard ? styles.cardYellowAccent : styles.cardOrangeAccent;

  return (
    <div
      ref={cardRef}
      className={`${styles.cardPerspectiveWrapper} ${stageClass} ${cardIndexClass}`}
      style={style}
    >
      <div
        className={`${styles.cardFlipper} ${isFlipped ? styles.isFlipped : ''}`}
        tabIndex={0}
        role="button"
        aria-expanded={isFlipped}
        title={isTle ? "Plot armor won't save you." : 'Character development starts here.'}
        aria-label={`${event.title} - ${isFlipped ? 'Content revealed. Click to turn back' : 'Click to turn card'}`}
        onClick={onCardClick}
        onKeyDown={handleKeyDown}
      >
        {/* ==================================================== */}
        {/* FACE A: CARD BACK (LARPER OR CODER BRAND LOGO FACE) */}
        {/* ==================================================== */}
        <div className={`${styles.cardFace} ${styles.cardFaceBack} ${accentClass}`}>
          {/* Animated Glowing Rotating Border Beam */}
          <span className={styles.borderBeam} aria-hidden="true" />

          {/* Center: ONLY the Logo + "Touch to Reveal" */}
          <div className={styles.backBrandCenter}>
            <div className={styles.brandGlowHalo} aria-hidden="true" />
            <picture className={styles.backLogoPicture}>
              <source srcSet={logoWebp} type="image/webp" />
              <img
                src={logoPng}
                alt="LARPER OR CODER"
                className={styles.backLogoImg}
                loading="lazy"
                decoding="async"
              />
            </picture>
            <span className={styles.touchToRevealText}>Touch to Reveal</span>
          </div>
        </div>

        {/* ==================================================== */}
        {/* FACE B: CARD FRONT (EVENT DETAILS CONTENT FACE)      */}
        {/* ==================================================== */}
        <div className={`${styles.cardFace} ${styles.cardFaceFront} ${accentClass}`}>
          {/* Animated Glowing Rotating Border Beam */}
          <span className={styles.borderBeam} aria-hidden="true" />

          {/* Top Header Row: Track Badge (left), Big Numeral (right) */}
          <div className={styles.cardHeader}>
            <div className={styles.tagWrapper}>
              <span className={styles.tagLabel}>{tagLabel}</span>
            </div>

            <span className={styles.headerNumeral} aria-hidden="true">
              {numeral}
            </span>
          </div>

          {/* Hero Title */}
          <div className={styles.titleWrapper}>
            {isTle ? (
              <div className={styles.tleGlitchContainer}>
                <div className={styles.tleGlitchHeader}>
                  <span className={styles.tleLaserCyan} aria-hidden="true" />
                  <h3 className={styles.tleGlitchMain} data-text="TLE">
                    TLE
                  </h3>
                  <span className={styles.tleLaserOrange} aria-hidden="true" />
                </div>
                <div className={styles.tleGlitchSub} data-text="think, lock in, execute">
                  <span className={styles.subKeyword1}>think</span>
                  <span className={styles.subSep}>,</span>
                  <span className={styles.subKeyword2}>lock in</span>
                  <span className={styles.subSep}>,</span>
                  <span className={styles.subKeyword3}>execute</span>
                </div>
              </div>
            ) : (
              <h3 className={styles.cardTitle}>{event.title}</h3>
            )}
          </div>

          {/* Description Blurb */}
          <p className={styles.cardDescription}>{event.blurb}</p>

          {/* Integrated Spec Capsule Strip (Segmented Dock) */}
          <div className={styles.specDock}>
            <div className={styles.specSegment}>
              <svg
                className={styles.specIcon}
                width="13"
                height="13"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="1.8"
                strokeLinecap="round"
                strokeLinejoin="round"
                aria-hidden="true"
              >
                <rect x="3" y="4" width="18" height="18" rx="2" ry="2" />
                <line x1="16" y1="2" x2="16" y2="6" />
                <line x1="8" y1="2" x2="8" y2="6" />
                <line x1="3" y1="10" x2="21" y2="10" />
              </svg>
              <span className={styles.specText}>{event.mode || 'Hands-on'}</span>
            </div>

            <span className={styles.specSeparator} aria-hidden="true" />

            <div className={styles.specSegment}>
              <svg
                className={styles.specIcon}
                width="13"
                height="13"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="1.8"
                strokeLinecap="round"
                strokeLinejoin="round"
                aria-hidden="true"
              >
                <circle cx="12" cy="12" r="10" />
                <polyline points="12 6 12 12 16 14" />
              </svg>
              <span className={styles.specText}>
                {event.duration || (index === 0 ? '1 hour' : '2.5 hrs')}
              </span>
            </div>

            <span className={styles.specSeparator} aria-hidden="true" />

            <div className={styles.specSegment}>
              <svg
                className={styles.specIcon}
                width="13"
                height="13"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="1.8"
                strokeLinecap="round"
                strokeLinejoin="round"
                aria-hidden="true"
              >
                <path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2" />
                <circle cx="9" cy="7" r="4" />
                <path d="M23 21v-2a4 4 0 0 0-3-3.87" />
                <path d="M16 3.13a4 4 0 0 1 0 7.75" />
              </svg>
              <span className={styles.specText}>{event.teamSize || '2'}</span>
            </div>
          </div>

          {/* Bottom Bar: Action link (left) & Timing Badge (right) */}
          <div className={styles.actionBar}>
            <button
              type="button"
              className={styles.actionPromptBtn}
              onClick={(e) => {
                e.stopPropagation();
                onOpenDetails(event, cardRef);
              }}
              aria-label={`View details and rules for ${event.title}`}
            >
              <span className={styles.actionText}>Know the Game</span>
              <svg
                className={styles.actionArrow}
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
                <line x1="5" y1="12" x2="19" y2="12" />
                <polyline points="12 5 19 12 12 19" />
              </svg>
            </button>

            <div className={styles.timeBadge}>
              <svg
                className={styles.timeIcon}
                width="12"
                height="12"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="2"
                strokeLinecap="round"
                strokeLinejoin="round"
                aria-hidden="true"
              >
                <circle cx="12" cy="12" r="10" />
                <polyline points="12 6 12 12 16 14" />
              </svg>
              <span>{event.time}</span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
