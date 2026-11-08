// client/src/components/Events/TrainingArcGallery.jsx
import React, { useState, useCallback, useEffect, memo, useRef } from 'react';
import { createPortal } from 'react-dom';
import styles from './Events.module.css';
import { workshopPhotos } from '../../data/workshopPhotos.js';
import logoWebp from '../../assets/logo-transparent.webp';
import logoPng from '../../assets/logo-transparent.png';

function TrainingArcGallery({ caption }) {
  const [activeIndex, setActiveIndex] = useState(0);
  const [displayedIndex, setDisplayedIndex] = useState(0);
  const [logoIndex, setLogoIndex] = useState(0);
  const [logoVisible, setLogoVisible] = useState(true);
  const [flyingData, setFlyingData] = useState(null);
  const [isLightboxOpen, setIsLightboxOpen] = useState(false);
  const [lightboxIndex, setLightboxIndex] = useState(0);
  const [isHovered, setIsHovered] = useState(false);

  const galleryWrapperRef = useRef(null);
  const largeViewportRef = useRef(null);
  const miniRefs = useRef([]);
  const isAnimatingRef = useRef(false);
  const flightTimerRef = useRef(null);

  const total = workshopPhotos.length;

  const handleMiniClick = useCallback(
    (targetIdx) => {
      if (
        targetIdx === activeIndex ||
        isAnimatingRef.current ||
        !galleryWrapperRef.current ||
        !largeViewportRef.current ||
        !miniRefs.current[activeIndex] ||
        !miniRefs.current[targetIdx]
      ) {
        return;
      }

      if (
        typeof window !== 'undefined' &&
        window.matchMedia('(prefers-reduced-motion: reduce)').matches
      ) {
        setActiveIndex(targetIdx);
        setDisplayedIndex(targetIdx);
        setLogoIndex(targetIdx);
        setLogoVisible(true);
        return;
      }

      isAnimatingRef.current = true;
      setLogoVisible(false); // 1. Logo on current mini preview disappears immediately

      const wrapperRect = galleryWrapperRef.current.getBoundingClientRect();
      const largeRect = largeViewportRef.current.getBoundingClientRect();
      const sourceMiniRect = miniRefs.current[activeIndex].getBoundingClientRect();
      const targetMiniRect = miniRefs.current[targetIdx].getBoundingClientRect();

      const largePos = {
        left: Math.round(largeRect.left - wrapperRect.left),
        top: Math.round(largeRect.top - wrapperRect.top),
        width: Math.round(largeRect.width),
        height: Math.round(largeRect.height),
      };

      const sourceMiniPos = {
        left: Math.round(sourceMiniRect.left - wrapperRect.left),
        top: Math.round(sourceMiniRect.top - wrapperRect.top),
        width: Math.round(sourceMiniRect.width),
        height: Math.round(sourceMiniRect.height),
      };

      const targetMiniPos = {
        left: Math.round(targetMiniRect.left - wrapperRect.left),
        top: Math.round(targetMiniRect.top - wrapperRect.top),
        width: Math.round(targetMiniRect.width),
        height: Math.round(targetMiniRect.height),
      };

      setFlyingData({
        sourceIdx: activeIndex,
        targetIdx,
        shrink: {
          photo: workshopPhotos[activeIndex],
          start: {
            top: `${largePos.top}px`,
            left: `${largePos.left}px`,
            width: `${largePos.width}px`,
            height: `${largePos.height}px`,
            borderRadius: '18px',
            zIndex: 22,
          },
          end: {
            top: `${sourceMiniPos.top}px`,
            left: `${sourceMiniPos.left}px`,
            width: `${sourceMiniPos.width}px`,
            height: `${sourceMiniPos.height}px`,
            borderRadius: '12px',
            zIndex: 22,
          },
        },
        enlarge: {
          photo: workshopPhotos[targetIdx],
          start: {
            top: `${targetMiniPos.top}px`,
            left: `${targetMiniPos.left}px`,
            width: `${targetMiniPos.width}px`,
            height: `${targetMiniPos.height}px`,
            borderRadius: '12px',
            zIndex: 25,
          },
          end: {
            top: `${largePos.top}px`,
            left: `${largePos.left}px`,
            width: `${largePos.width}px`,
            height: `${largePos.height}px`,
            borderRadius: '18px',
            zIndex: 25,
          },
        },
        active: false,
      });

      // Next tick: engage the smooth CSS flight transition
      requestAnimationFrame(() => {
        requestAnimationFrame(() => {
          setFlyingData((prev) => (prev ? { ...prev, active: true } : null));
        });
      });

      // When flight reaches target positions (430ms)
      flightTimerRef.current = setTimeout(() => {
        setDisplayedIndex(targetIdx);
        setActiveIndex(targetIdx);
        setFlyingData(null);
        setLogoIndex(targetIdx);
        setLogoVisible(true);
        isAnimatingRef.current = false;
      }, 430);
    },
    [activeIndex]
  );

  useEffect(() => {
    return () => {
      if (flightTimerRef.current) clearTimeout(flightTimerRef.current);
    };
  }, []);

  // Auto-advance photo carousel every 4.5 seconds (pauses on hover, lightbox, or tab hidden)
  useEffect(() => {
    if (isLightboxOpen || isHovered) return;

    const interval = setInterval(() => {
      if (document.hidden || isAnimatingRef.current) return;
      handleMiniClick((activeIndex + 1) % total);
    }, 4500);

    return () => clearInterval(interval);
  }, [activeIndex, handleMiniClick, isHovered, isLightboxOpen, total]);

  const openLightbox = useCallback(() => {
    if (flyingData) return;
    setLightboxIndex(displayedIndex);
    setIsLightboxOpen(true);
  }, [displayedIndex, flyingData]);

  const closeLightbox = useCallback(() => {
    setIsLightboxOpen(false);
  }, []);

  const handleKeyDown = useCallback(
    (e) => {
      if (e.key === 'ArrowLeft') {
        e.preventDefault();
        const prev = Math.max(0, activeIndex - 1);
        handleMiniClick(prev);
      } else if (e.key === 'ArrowRight') {
        e.preventDefault();
        const next = Math.min(total - 1, activeIndex + 1);
        handleMiniClick(next);
      }
    },
    [activeIndex, handleMiniClick, total]
  );

  // Lightbox keyboard controls: Escape, ArrowLeft, ArrowRight
  useEffect(() => {
    if (!isLightboxOpen) return;
    const onKey = (e) => {
      if (e.key === 'Escape') {
        closeLightbox();
      } else if (e.key === 'ArrowLeft') {
        e.preventDefault();
        setLightboxIndex((prevIdx) => Math.max(0, prevIdx - 1));
      } else if (e.key === 'ArrowRight') {
        e.preventDefault();
        setLightboxIndex((prevIdx) => Math.min(total - 1, prevIdx + 1));
      }
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [isLightboxOpen, closeLightbox, total]);

  const currentPhoto = workshopPhotos[displayedIndex];

  return (
    <div
      ref={galleryWrapperRef}
      className={styles.galleryWrapper}
      role="region"
      aria-roledescription="carousel"
      aria-label="Past workshop photos"
      tabIndex={0}
      onKeyDown={handleKeyDown}
      onMouseEnter={() => setIsHovered(true)}
      onMouseLeave={() => setIsHovered(false)}
    >
      {/* Visually hidden status */}
      <div className={styles.srOnly} aria-live="polite">
        Photo {displayedIndex + 1} of {total}
      </div>

      {/* 1. Main Enlarged Framed Card */}
      <div className={styles.framedPhotoCard}>
        <button
          ref={largeViewportRef}
          type="button"
          className={`${styles.galleryViewport} ${flyingData ? styles.galleryViewportHidden : ''}`}
          onClick={openLightbox}
          aria-label="Click to enlarge photo full-screen"
        >
          {/* Top-left pill: PAST WORKSHOP (with dynamic appear animation on photo change) */}
          <span key={`cat-${displayedIndex}`} className={styles.categoryPill} aria-hidden="true">
            PAST WORKSHOP
          </span>

          {/* Top-right pill: 1/4 counter (with dynamic appear animation on photo change) */}
          <span key={`cnt-${displayedIndex}`} className={styles.counterPill} aria-hidden="true">
            {displayedIndex + 1}/{total}
          </span>

          {/* Enlarged Photo Stage */}
          <div className={styles.mainStageWrapper}>
            <picture>
              <source srcSet={currentPhoto.srcset} type="image/webp" />
              <img
                src={currentPhoto.src}
                alt={currentPhoto.alt}
                width={currentPhoto.width}
                height={currentPhoto.height}
                decoding="async"
                draggable={false}
                className={styles.mainStageImg}
              />
            </picture>
          </div>
        </button>
      </div>

      {/* Caption under enlarged preview */}
      {caption && (
        <p className={styles.galleryCaptionText}>
          {currentPhoto.caption || caption}
        </p>
      )}

      {/* 2. Four Mini Pictures Row */}
      <div className={styles.miniPicturesGrid} role="group" aria-label="Select photo preview">
        {workshopPhotos.map((photo, i) => {
          const isActive = activeIndex === i;
          const hasLogo = logoIndex === i && logoVisible;
          const isTargetFlying = flyingData && flyingData.targetIdx === i;

          return (
            <button
              key={photo.id}
              ref={(el) => {
                miniRefs.current[i] = el;
              }}
              type="button"
              className={`${styles.miniPictureCard} ${
                isActive ? styles.miniPictureCardActive : ''
              } ${isTargetFlying ? styles.miniPictureCardFlying : ''}`}
              onClick={() => handleMiniClick(i)}
              aria-label={`Select photo ${i + 1}`}
              aria-pressed={isActive}
            >
              <img
                src={photo.src}
                alt={`Thumbnail ${i + 1}`}
                className={styles.miniThumbnailImg}
                loading="lazy"
                decoding="async"
              />

              {/* Larper or Coder Logo Overlay on Active Mini Card */}
              {logoIndex === i && (
                <div
                  className={`${styles.miniLogoOverlay} ${
                    hasLogo ? styles.miniLogoVisible : styles.miniLogoHidden
                  }`}
                  aria-hidden="true"
                >
                  <picture>
                    <source srcSet={logoWebp} type="image/webp" />
                    <img
                      src={logoPng}
                      alt="LARPER OR CODER"
                      className={styles.miniLogoImg}
                    />
                  </picture>
                </div>
              )}
            </button>
          );
        })}
      </div>

      {/* 3. Physical Flying Elements (literal shrinking and enlarging flight) */}
      {flyingData && (
        <>
          {/* Flying Element 1: Large image literally shrinks & moves to preview slot */}
          <div
            className={`${styles.flyingCard} ${flyingData.active ? styles.flyingCardActive : ''}`}
            style={flyingData.active ? flyingData.shrink.end : flyingData.shrink.start}
            aria-hidden="true"
          >
            <img
              src={flyingData.shrink.photo.src}
              alt=""
              className={styles.flyingImg}
            />
          </div>

          {/* Flying Element 2: Clicked preview literally enlarges & moves to large viewport */}
          <div
            className={`${styles.flyingCard} ${flyingData.active ? styles.flyingCardActive : ''}`}
            style={flyingData.active ? flyingData.enlarge.end : flyingData.enlarge.start}
            aria-hidden="true"
          >
            <img
              src={flyingData.enlarge.photo.src}
              alt=""
              className={styles.flyingImg}
            />
          </div>
        </>
      )}

      {/* 4. Lightbox Modal */}
      {isLightboxOpen &&
        typeof document !== 'undefined' &&
        createPortal(
          <div
            className={styles.lightboxOverlay}
            onClick={(e) => {
              if (e.target === e.currentTarget) closeLightbox();
            }}
            role="dialog"
            aria-modal="true"
            aria-label="Enlarged photo view"
          >
            <button
              type="button"
              className={styles.lightboxCloseBtn}
              onClick={closeLightbox}
              aria-label="Close enlarged view"
            >
              <svg
                width="24"
                height="24"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="1.75"
                aria-hidden="true"
              >
                <line x1="18" y1="6" x2="6" y2="18" />
                <line x1="6" y1="6" x2="18" y2="18" />
              </svg>
            </button>

            <button
              type="button"
              className={`${styles.lightboxNavBtn} ${styles.lightboxPrev}`}
              onClick={(e) => {
                e.stopPropagation();
                setLightboxIndex((prevIdx) => Math.max(0, prevIdx - 1));
              }}
              disabled={lightboxIndex === 0}
              aria-disabled={lightboxIndex === 0}
              aria-label="Previous image"
            >
              ‹
            </button>

            <div className={styles.lightboxContent}>
              <div className={styles.lightboxFramedBox}>
                <picture>
                  <source srcSet={workshopPhotos[lightboxIndex].srcset} type="image/webp" />
                  <img
                    src={workshopPhotos[lightboxIndex].src}
                    alt={workshopPhotos[lightboxIndex].alt}
                    className={styles.lightboxImg}
                  />
                </picture>
              </div>
              <p className={styles.lightboxCaption}>
                {workshopPhotos[lightboxIndex].caption || workshopPhotos[lightboxIndex].alt}
              </p>
            </div>

            <button
              type="button"
              className={`${styles.lightboxNavBtn} ${styles.lightboxNext}`}
              onClick={(e) => {
                e.stopPropagation();
                setLightboxIndex((prevIdx) => Math.min(total - 1, prevIdx + 1));
              }}
              disabled={lightboxIndex === total - 1}
              aria-disabled={lightboxIndex === total - 1}
              aria-label="Next image"
            >
              ›
            </button>
          </div>,
          document.body
        )}
    </div>
  );
}

export default memo(TrainingArcGallery);
