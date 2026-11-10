// client/src/components/Events/EventDetailPanel.jsx
import React, { useEffect, useRef, useState, useCallback, startTransition } from 'react';
import { createPortal } from 'react-dom';
import styles from './Events.module.css';
import TugOfAuraVisual from './TugOfAuraVisual.jsx';
import GoatTerminalVisual from './GoatTerminalVisual.jsx';
import TrainingArcGallery from './TrainingArcGallery.jsx';
import { eventData } from '../../data/event.js';

const TAB_INDEX_MAP = {
  overview: 0,
  round1: 1,
  round2: 2,
};

export default function EventDetailPanel({ event, isOpen, onClose, onRegister, triggerRef }) {
  const [activeTab, setActiveTab] = useState('overview'); // For TLE: 'overview' | 'round1' | 'round2'
  const activeTabIndex = TAB_INDEX_MAP[activeTab] ?? 0;
  const [dragY, setDragY] = useState(0);
  const [isDragging, setIsDragging] = useState(false);
  const [prevEventId, setPrevEventId] = useState(null);

  if (event?.id !== prevEventId) {
    setPrevEventId(event?.id);
    setActiveTab('overview');
    setDragY(0);
  }

  const panelRef = useRef(null);
  const closeBtnRef = useRef(null);
  const dragStartY = useRef(0);
  const pushedHistoryRef = useRef(false);

  // Close handler: pops history cleanly and notifies parent
  const handleClose = useCallback(() => {
    if (pushedHistoryRef.current) {
      pushedHistoryRef.current = false;
      window.history.back();
    }
    onClose();
  }, [onClose]);

  // Lock body scroll, manage browser history, and manage focus
  useEffect(() => {
    if (!isOpen || !event) return;

    document.body.classList.add('detail-panel-open');

    // Browser back button handling
    window.history.pushState({ eventDetailOpen: true, eventId: event.id }, '');
    pushedHistoryRef.current = true;

    const handlePopState = () => {
      pushedHistoryRef.current = false;
      onClose();
    };

    window.addEventListener('popstate', handlePopState);

    // Initial focus on close button
    const timer = setTimeout(() => {
      closeBtnRef.current?.focus();
    }, 50);

    const triggerEl = triggerRef?.current;

    return () => {
      clearTimeout(timer);
      document.body.classList.remove('detail-panel-open');
      window.removeEventListener('popstate', handlePopState);
      if (triggerEl) {
        triggerEl.focus();
      }
    };
  }, [isOpen, event, triggerRef, onClose]);

  // Focus trap inside the modal
  useEffect(() => {
    if (!isOpen) return;

    const handleKeyDown = (e) => {
      if (e.key === 'Escape') {
        e.preventDefault();
        handleClose();
        return;
      }

      if (e.key === 'Tab') {
        const modalEl = panelRef.current;
        if (!modalEl) return;
        const focusable = modalEl.querySelectorAll(
          'button:not([disabled]), [href], input:not([disabled]), select:not([disabled]), textarea:not([disabled]), [tabindex]:not([tabindex="-1"])'
        );
        if (focusable.length === 0) return;
        const first = focusable[0];
        const last = focusable[focusable.length - 1];

        if (e.shiftKey && document.activeElement === first) {
          e.preventDefault();
          last.focus();
        } else if (!e.shiftKey && document.activeElement === last) {
          e.preventDefault();
          first.focus();
        }
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, handleClose]);

  // Drag down to close on mobile (< 768px)
  const handlePointerDown = (e) => {
    if (window.innerWidth >= 768) return;
    if (e.target.closest('button')) return; // do not drag if clicking button
    dragStartY.current = e.clientY;
    setIsDragging(true);
    e.currentTarget.setPointerCapture(e.pointerId);
  };

  const handlePointerMove = (e) => {
    if (!isDragging) return;
    const deltaY = e.clientY - dragStartY.current;
    if (deltaY > 0) {
      setDragY(deltaY);
    } else {
      setDragY(deltaY * 0.2); // rubber band if pulling up
    }
  };

  const handlePointerUp = (e) => {
    if (!isDragging) return;
    setIsDragging(false);
    try {
      e.currentTarget.releasePointerCapture(e.pointerId);
    } catch {
      // ignore
    }
    if (dragY >= 80) {
      handleClose();
    } else {
      setDragY(0);
    }
  };

  // Switch tabs using startTransition for instant INP
  const switchTab = useCallback((tabName) => {
    startTransition(() => {
      setActiveTab(tabName);
    });
  }, []);

  // Keyboard navigation for TLE tabs
  const handleTabKeyDown = (e, currentIdx) => {
    const tabsList = ['overview', 'round1', 'round2'];
    let nextIdx = currentIdx;
    if (e.key === 'ArrowRight' || e.key === 'ArrowDown') {
      e.preventDefault();
      nextIdx = (currentIdx + 1) % tabsList.length;
    } else if (e.key === 'ArrowLeft' || e.key === 'ArrowUp') {
      e.preventDefault();
      nextIdx = (currentIdx - 1 + tabsList.length) % tabsList.length;
    }
    if (nextIdx !== currentIdx) {
      switchTab(tabsList[nextIdx]);
      const btn = document.getElementById(`tab-btn-${tabsList[nextIdx]}`);
      btn?.focus();
    }
  };

  if (!isOpen || !event) return null;

  const isTrainingArc = event.id === 'training-arc';
  const isTle = event.id === 'tle';
  const eyebrowText = event.eyebrow || (isTrainingArc ? 'WORKSHOP 01' : 'COMPETITION 02');

  const handleRegisterClick = () => {
    if (onRegister) {
      onRegister(event.id);
    } else if (eventData.ticketUrl) {
      window.open(eventData.ticketUrl, '_blank', 'noopener,noreferrer');
    }
  };

  return createPortal(
    <div
      className={styles.panelBackdrop}
      onClick={(e) => {
        if (e.target === e.currentTarget) handleClose();
      }}
      role="dialog"
      aria-modal="true"
      aria-labelledby="detail-panel-title"
    >
      <div
        className={styles.detailSheet}
        ref={panelRef}
        style={{
          transform: dragY > 0 ? `translateY(${dragY}px)` : undefined,
          transition: isDragging ? 'none' : undefined,
        }}
      >
        {/* (a) HEADER (64px laptop, 56px phone, border-bottom) */}
        <div
          className={`${styles.sheetHeader} ${isTle ? styles.sheetHeaderWithTabs : ''}`}
          onPointerDown={handlePointerDown}
          onPointerMove={handlePointerMove}
          onPointerUp={handlePointerUp}
          onPointerCancel={handlePointerUp}
        >
          <div className={styles.dragPillIndicator} aria-hidden="true" />
          <div className={styles.headerBar}>
            <span className={styles.headerEyebrow}>{eyebrowText}</span>

            {/* Redesigned Centered Segmented Control for TLE Navigation */}
            {isTle && (
              <div className={styles.headerNavCenter}>
                <div
                  className={styles.segmentedControl}
                  role="tablist"
                  aria-label="TLE Competition Sections"
                >
                  <button
                    id="tab-btn-overview"
                    type="button"
                    role="tab"
                    aria-selected={activeTab === 'overview'}
                    aria-controls="panel-overview"
                    tabIndex={activeTab === 'overview' ? 0 : -1}
                    className={`${styles.tabBtn} ${activeTab === 'overview' ? styles.tabBtnActive : ''}`}
                    onClick={() => switchTab('overview')}
                    onKeyDown={(e) => handleTabKeyDown(e, 0)}
                  >
                    Overview
                  </button>
                  <button
                    id="tab-btn-round1"
                    type="button"
                    role="tab"
                    aria-selected={activeTab === 'round1'}
                    aria-controls="panel-round1"
                    tabIndex={activeTab === 'round1' ? 0 : -1}
                    className={`${styles.tabBtn} ${activeTab === 'round1' ? styles.tabBtnActive : ''}`}
                    onClick={() => switchTab('round1')}
                    onKeyDown={(e) => handleTabKeyDown(e, 1)}
                    aria-label="Round 1: Tug of Aura"
                  >
                    Round 1
                  </button>
                  <button
                    id="tab-btn-round2"
                    type="button"
                    role="tab"
                    aria-selected={activeTab === 'round2'}
                    aria-controls="panel-round2"
                    tabIndex={activeTab === 'round2' ? 0 : -1}
                    className={`${styles.tabBtn} ${activeTab === 'round2' ? styles.tabBtnActive : ''}`}
                    onClick={() => switchTab('round2')}
                    onKeyDown={(e) => handleTabKeyDown(e, 2)}
                    aria-label="Round 2: Who's the GOAT?"
                  >
                    Round 2
                  </button>
                </div>
              </div>
            )}

            <button
              ref={closeBtnRef}
              type="button"
              className={styles.headerCloseBtn}
              onClick={handleClose}
              aria-label="Close details"
            >
              <svg
                width="18"
                height="18"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="2"
                strokeLinecap="round"
                strokeLinejoin="round"
                aria-hidden="true"
              >
                <line x1="18" y1="6" x2="6" y2="18" />
                <line x1="6" y1="6" x2="18" y2="18" />
              </svg>
            </button>
          </div>
        </div>

        {/* (b) BODY: Inner Container */}
        <div className={`${styles.sheetBody} ${isTle ? styles.sheetBodyWithTle : ''}`}>
          {/* TRAINING ARC: 2-column on laptop, ordered with gallery first on phone */}
          {isTrainingArc && (
            <div className={styles.trainingArcContainer}>
              {/* Left Column: Title, Chips, About, Glance */}
              <div className={styles.leftCol}>
                <div className={styles.detailTitleSection}>
                  <h1 id="detail-panel-title" className={styles.detailTitle}>
                    {event.title}
                  </h1>

                  <div className={styles.detailMetaRow}>
                    <span className={styles.detailMetaChip}>
                      <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                        <rect x="3" y="4" width="18" height="18" rx="2" ry="2" />
                        <line x1="16" y1="2" x2="16" y2="6" />
                        <line x1="8" y1="2" x2="8" y2="6" />
                        <line x1="3" y1="10" x2="21" y2="10" />
                      </svg>
                      13 Nov 2026
                    </span>


                    <span className={styles.detailMetaChip}>
                      <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                        <path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2" />
                        <circle cx="9" cy="7" r="4" />
                        <path d="M23 21v-2a4 4 0 0 0-3-3.87" />
                        <path d="M16 3.13a4 4 0 0 1 0 7.75" />
                      </svg>
                      With Your Homie
                    </span>
                  </div>
                </div>

                <div className={styles.detailSectionsStack}>
                  {/* About */}
                  <section className={styles.detailSection}>
                    <h2 className={styles.sectionMonoLabel}>THE LORE</h2>
                    <p className={styles.sectionParagraph}>
                      {event.about || 'A hands-on workshop on competitive coding and problem-solving, conducted by a top coder of CIT, a 3rd year senior.'}
                    </p>
                  </section>

                  {/* At a glance: definition list */}
                  <section className={styles.detailSection}>
                    <h2 className={styles.sectionMonoLabel}>TL;DR</h2>
                    <dl className={styles.glanceList}>
                      {event.atAGlance?.map((item, idx) => (
                        <div key={idx} className={styles.glanceRow}>
                          <dt className={styles.glanceLabel}>{item.label}</dt>
                          <dd className={styles.glanceValue}>{item.value}</dd>
                        </div>
                      ))}
                    </dl>
                  </section>
                </div>
              </div>

              {/* Right Column (Laptop) / Top (Phone): Framed Photo Gallery */}
              <div className={styles.gallerySlot}>
                <TrainingArcGallery caption={event.photoCaption || 'Lore from our past workshops'} />
              </div>
            </div>
          )}

          {/* TLE COMPETITION CONTENT */}
          {isTle && (
            <div className={styles.tleContainer}>
              {/* TLE Hero Header (Preserved across all 3 sections) */}
              <div className={styles.tleOverviewHeader}>
                <div className={styles.tleTitleSection}>
                  <div className={`${styles.tleGlitchContainer} ${styles.tleGlitchContainerModal}`}>
                    <div className={styles.tleGlitchHeader}>
                      <span className={styles.tleLaserCyan} aria-hidden="true" />
                      <h1 id="detail-panel-title" className={`${styles.tleGlitchMain} ${styles.tleGlitchMainModal}`} data-text="TLE">
                        TLE
                      </h1>
                      <span className={styles.tleLaserOrange} aria-hidden="true" />
                    </div>
                    <div className={`${styles.tleGlitchSub} ${styles.tleGlitchSubModal}`} data-text="think, lock in, execute">
                      <span className={styles.subKeyword1}>think</span>
                      <span className={styles.subSep}>,</span>
                      <span className={styles.subKeyword2}>lock in</span>
                      <span className={styles.subSep}>,</span>
                      <span className={styles.subKeyword3}>execute</span>
                    </div>
                  </div>
                </div>
              </div>

              {/* Main Sliding Content Viewport (Animated 3-Section Track) */}
              <div className={styles.tleSliderViewport}>
                <div
                  className={styles.tleSliderTrack}
                  style={{ transform: `translateX(-${activeTabIndex * 100}%)` }}
                >
                  {/* Slide 0: Overview */}
                  <div
                    id="panel-overview"
                    role="tabpanel"
                    aria-labelledby="tab-btn-overview"
                    aria-hidden={activeTab !== 'overview'}
                    tabIndex={activeTab === 'overview' ? 0 : -1}
                    className={`${styles.tleSlide} ${activeTab === 'overview' ? styles.tleSlideActive : styles.tleSlideInactive}`}
                  >
                    <div className={styles.tleGridRow}>
                      {/* Left Column: Track Cards (Stacked Vertically & Full Width) */}
                      <div className={styles.leftCol}>
                        <section className={styles.detailSection}>
                          <div className={styles.roundsHeaderRow}>
                            <h2 className={styles.sectionMonoLabel}>PICK YOUR ROUND</h2>
                          </div>

                          <div className={styles.roundsCardsGrid}>
                            {/* Round 1 Card */}
                            <button
                              type="button"
                              className={`${styles.roundPreviewCard} ${styles.roundCardOne}`}
                              onClick={() => switchTab('round1')}
                              aria-label="Choose Round 1: Tug of Aura to view details"
                            >
                              <span className={styles.cardCornerNotch} aria-hidden="true" />
                              <span className={styles.cardAccentBar} aria-hidden="true" />
                              <span className={styles.roundCardShimmer} aria-hidden="true" />

                              {/* Left Cyber Conduit Rail */}
                              <div className={styles.cardConduitColumn} aria-hidden="true">
                                <span className={`${styles.conduitPip} ${styles.conduitPipOne}`} />
                                <span className={`${styles.conduitPip} ${styles.conduitPipOne}`} />
                                <span className={`${styles.conduitPip} ${styles.conduitPipOne}`} />
                              </div>

                              <div className={styles.cardContentWrapper}>
                                {/* Card Top: Badges */}
                                <div className={styles.roundCardTop}>
                                  <div className={styles.roundBadgeWrap}>
                                    <span className={`${styles.roundBeaconDot} ${styles.roundBeaconOne}`} aria-hidden="true" />
                                    <span className={styles.roundBadge}>ROUND 01</span>
                                  </div>
                                  <span className={styles.roundTrackTag}>TUG-OF-WAR</span>
                                </div>

                                {/* Card Main: Icon + Title */}
                                <div className={styles.roundCardMain}>
                                  <div className={styles.roundCardIconWrap} aria-hidden="true">
                                    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
                                      <path d="M13 2L3 14h9l-1 8 10-12h-9l1-8z" />
                                    </svg>
                                  </div>
                                  <div className={styles.roundCardTitleBlock}>
                                    <h3 className={styles.roundCardTitle}>Tug of Aura</h3>
                                    <span className={styles.roundCardTechSubtitle}>// ARENA · KINETIC FORCE</span>
                                  </div>
                                </div>

                                {/* Card Footer: Action Bar */}
                                <div className={styles.roundCardFooter}>
                                  <span className={styles.roundActionPill}>
                                    <span>Peep It</span>
                                    <svg className={styles.roundActionArrow} width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                                      <line x1="5" y1="12" x2="19" y2="12" />
                                      <polyline points="12 5 19 12 12 19" />
                                    </svg>
                                  </span>
                                </div>
                              </div>
                            </button>

                            {/* Round 2 Card */}
                            <button
                              type="button"
                              className={`${styles.roundPreviewCard} ${styles.roundCardTwo}`}
                              onClick={() => switchTab('round2')}
                              aria-label="Choose Round 2: Who's the GOAT? to view details"
                            >
                              <span className={styles.cardCornerNotch} aria-hidden="true" />
                              <span className={styles.cardAccentBar} aria-hidden="true" />
                              <span className={styles.roundCardShimmer} aria-hidden="true" />

                              {/* Left Cyber Conduit Rail */}
                              <div className={styles.cardConduitColumn} aria-hidden="true">
                                <span className={`${styles.conduitPip} ${styles.conduitPipTwo}`} />
                                <span className={`${styles.conduitPip} ${styles.conduitPipTwo}`} />
                                <span className={`${styles.conduitPip} ${styles.conduitPipTwo}`} />
                              </div>

                              <div className={styles.cardContentWrapper}>
                                {/* Card Top: Badges */}
                                <div className={styles.roundCardTop}>
                                  <div className={styles.roundBadgeWrap}>
                                    <span className={`${styles.roundBeaconDot} ${styles.roundBeaconTwo}`} aria-hidden="true" />
                                    <span className={styles.roundBadge}>ROUND 02</span>
                                  </div>
                                  <span className={styles.roundTrackTag}>REVERSE CODE</span>
                                </div>

                                {/* Card Main: Icon + Title */}
                                <div className={styles.roundCardMain}>
                                  <div className={styles.roundCardIconWrap} aria-hidden="true">
                                    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
                                      <polyline points="4 17 10 11 4 5" />
                                      <line x1="12" y1="19" x2="20" y2="19" />
                                    </svg>
                                  </div>
                                  <div className={styles.roundCardTitleBlock}>
                                    <h3 className={styles.roundCardTitle}>Who's the GOAT?</h3>
                                    <span className={styles.roundCardTechSubtitle}>// TERMINAL · BLACK BOX</span>
                                  </div>
                                </div>

                                {/* Card Footer: Action Bar */}
                                <div className={styles.roundCardFooter}>
                                  <span className={styles.roundActionPill}>
                                    <span>Peep It</span>
                                    <svg className={styles.roundActionArrow} width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                                      <line x1="5" y1="12" x2="19" y2="12" />
                                      <polyline points="12 5 19 12 12 19" />
                                    </svg>
                                  </span>
                                </div>
                              </div>
                            </button>
                          </div>
                        </section>

                        {/* On phone: Event Day stepper at end of Overview */}
                        <div className={styles.phoneStepperBlock}>
                          <section className={styles.detailSection}>
                            <h2 className={styles.sectionMonoLabel}>THE GAME PLAN</h2>
                            <div className={styles.stepperCard}>
                              <div className={styles.stepperTrack}>
                                {event.stepper?.map((step, idx) => (
                                  <div key={idx} className={`${styles.stepperItem} ${idx === 0 ? styles.stepperItemFirst : styles.stepperItemSecond}`}>
                                    <div className={styles.stepperLineWrap}>
                                      <span className={`${styles.stepperDot} ${idx === 0 ? styles.stepperDotActive : styles.stepperDotSecond}`} />
                                      {idx < event.stepper.length - 1 && (
                                        <div className={styles.stepperTrackRail}>
                                          <span className={styles.stepperLaserBeam} />
                                        </div>
                                      )}
                                    </div>
                                    <div className={`${styles.stepperContent} ${idx === 0 ? styles.stepperContentFirst : styles.stepperContentSecond}`}>
                                      <span className={styles.stepperTime}>{step.time}</span>
                                      <span className={styles.stepperTitle}>{step.title}</span>
                                      {step.subItems && (
                                        <div className={styles.stepperInteractiveSublist}>
                                          <button
                                            type="button"
                                            className={`${styles.stepperSubitemBtn} ${styles.stepperSubitemBtnFirst}`}
                                            onClick={() => switchTab('round1')}
                                            aria-label="Switch to Round 1: Tug of Aura"
                                          >
                                            <span className={styles.stepperSubitemBullet} aria-hidden="true">▸</span>
                                            <span>Round 1: Tug of Aura</span>
                                            <svg className={styles.stepperSubitemArrow} width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2">
                                              <polyline points="9 18 15 12 9 6" />
                                            </svg>
                                          </button>
                                          <button
                                            type="button"
                                            className={`${styles.stepperSubitemBtn} ${styles.stepperSubitemBtnSecond}`}
                                            onClick={() => switchTab('round2')}
                                            aria-label="Switch to Round 2: Who's the GOAT?"
                                          >
                                            <span className={styles.stepperSubitemBullet} aria-hidden="true">▸</span>
                                            <span>Round 2: Who's the GOAT?</span>
                                            <svg className={styles.stepperSubitemArrow} width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2">
                                              <polyline points="9 18 15 12 9 6" />
                                            </svg>
                                          </button>
                                        </div>
                                      )}
                                    </div>
                                  </div>
                                ))}
                              </div>
                            </div>
                            <div className={styles.noteCard}>
                              <p className={styles.noteCardText}>{event.noteCard}</p>
                            </div>
                          </section>
                        </div>
                      </div>

                      {/* Right Column (Laptop >= 768px): Event Day Schedule */}
                      <div className={styles.rightCol}>
                        <div className={styles.desktopTleFactsArea}>
                          <section className={styles.detailSection}>
                            <h2 className={styles.sectionMonoLabel}>THE GAME PLAN</h2>
                            <div className={styles.stepperCard}>
                              <div className={styles.stepperTrack}>
                                {event.stepper?.map((step, idx) => (
                                  <div key={idx} className={`${styles.stepperItem} ${idx === 0 ? styles.stepperItemFirst : styles.stepperItemSecond}`}>
                                    <div className={styles.stepperLineWrap}>
                                      <span className={`${styles.stepperDot} ${idx === 0 ? styles.stepperDotActive : styles.stepperDotSecond}`} />
                                      {idx < event.stepper.length - 1 && (
                                        <div className={styles.stepperTrackRail}>
                                          <span className={styles.stepperLaserBeam} />
                                        </div>
                                      )}
                                    </div>
                                    <div className={`${styles.stepperContent} ${idx === 0 ? styles.stepperContentFirst : styles.stepperContentSecond}`}>
                                      <span className={styles.stepperTime}>{step.time}</span>
                                      <span className={styles.stepperTitle}>{step.title}</span>
                                      {step.subItems && (
                                        <div className={styles.stepperInteractiveSublist}>
                                          <button
                                            type="button"
                                            className={`${styles.stepperSubitemBtn} ${styles.stepperSubitemBtnFirst}`}
                                            onClick={() => switchTab('round1')}
                                            aria-label="Switch to Round 1: Tug of Aura"
                                          >
                                            <span className={styles.stepperSubitemBullet} aria-hidden="true">▸</span>
                                            <span>Round 1: Tug of Aura</span>
                                            <svg className={styles.stepperSubitemArrow} width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2">
                                              <polyline points="9 18 15 12 9 6" />
                                            </svg>
                                          </button>
                                          <button
                                            type="button"
                                            className={`${styles.stepperSubitemBtn} ${styles.stepperSubitemBtnSecond}`}
                                            onClick={() => switchTab('round2')}
                                            aria-label="Switch to Round 2: Who's the GOAT?"
                                          >
                                            <span className={styles.stepperSubitemBullet} aria-hidden="true">▸</span>
                                            <span>Round 2: Who's the GOAT?</span>
                                            <svg className={styles.stepperSubitemArrow} width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2">
                                              <polyline points="9 18 15 12 9 6" />
                                            </svg>
                                          </button>
                                        </div>
                                      )}
                                    </div>
                                  </div>
                                ))}
                              </div>
                            </div>

                            <div className={styles.noteCard}>
                              <p className={styles.noteCardText}>{event.noteCard}</p>
                            </div>
                          </section>
                        </div>
                      </div>
                    </div>
                  </div>

                  {/* Slide 1: Round 1 (Tug of Aura) */}
                  <div
                    id="panel-round1"
                    role="tabpanel"
                    aria-labelledby="tab-btn-round1"
                    aria-hidden={activeTab !== 'round1'}
                    tabIndex={activeTab === 'round1' ? 0 : -1}
                    className={`${styles.tleSlide} ${activeTab === 'round1' ? styles.tleSlideActive : styles.tleSlideInactive}`}
                  >
                    <div className={styles.tleGridRow}>
                      <div className={styles.leftCol}>
                        <section className={styles.detailSection}>
                          <div className={styles.roundDetailHeader}>
                            <span className={styles.roundDetailBadge}>ROUND 01 · COMPETITION TRACK</span>
                            <h2 className={styles.roundDetailTitle}>{event.round1?.name}</h2>
                          </div>
                          <p className={styles.sectionParagraph}>
                            {event.round1?.description}
                          </p>

                          <div className={styles.roundMetaCallout}>
                            <div className={styles.roundMetaRow}>
                              <span className={styles.roundMetaKey}>MECHANIC</span>
                              <span className={styles.roundMetaVal}>Digital Tug-of-War · Teams Alpha vs Omega</span>
                            </div>
                            <div className={styles.roundMetaRow}>
                              <span className={styles.roundMetaKey}>CORE FOCUS</span>
                              <span className={styles.roundMetaVal}>Speed, Accuracy & Live Kinetic Force Control</span>
                            </div>
                          </div>
                        </section>

                        {/* On phone: Show visual inside panel */}
                        <div className={styles.phoneVisualSlot}>
                          <TugOfAuraVisual />
                        </div>
                      </div>

                      {/* Right Column (Laptop >= 768px): Tug Visual */}
                      <div className={styles.rightCol}>
                        <div className={styles.desktopVisualArea}>
                          <div className={styles.visualSlot}>
                            <TugOfAuraVisual />
                          </div>
                        </div>
                      </div>
                    </div>
                  </div>

                  {/* Slide 2: Round 2 (Who's the GOAT?) */}
                  <div
                    id="panel-round2"
                    role="tabpanel"
                    aria-labelledby="tab-btn-round2"
                    aria-hidden={activeTab !== 'round2'}
                    tabIndex={activeTab === 'round2' ? 0 : -1}
                    className={`${styles.tleSlide} ${activeTab === 'round2' ? styles.tleSlideActive : styles.tleSlideInactive}`}
                  >
                    <div className={styles.tleGridRow}>
                      <div className={styles.leftCol}>
                        <section className={styles.detailSection}>
                          <div className={styles.roundDetailHeader}>
                            <span className={styles.roundDetailBadge}>ROUND 02 · COMPETITION TRACK</span>
                            <h2 className={styles.roundDetailTitle}>{event.round2?.name}</h2>
                          </div>
                          <p className={styles.sectionParagraph}>
                            {event.round2?.description}
                          </p>

                          <div className={styles.roundMetaCallout}>
                            <div className={styles.roundMetaRow}>
                              <span className={styles.roundMetaKey}>ENVIRONMENT</span>
                              <span className={styles.roundMetaVal}>Black Box Terminal · No Problem Statement</span>
                            </div>
                            <div className={styles.roundMetaRow}>
                              <span className={styles.roundMetaKey}>CORE FOCUS</span>
                              <span className={styles.roundMetaVal}>Only Raw Input & Output Provided · No Complexity Clues</span>
                            </div>
                          </div>
                        </section>

                        {/* On phone: Show visual inside panel */}
                        <div className={styles.phoneVisualSlot}>
                          <GoatTerminalVisual />
                        </div>
                      </div>

                      {/* Right Column (Laptop >= 768px): Animated Terminal Visual */}
                      <div className={styles.rightCol}>
                        <div className={styles.desktopVisualArea}>
                          <div className={styles.visualSlot}>
                            <GoatTerminalVisual />
                          </div>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
          </div>
          )}
        </div>

        {/* (c) STICKY FOOTER BAR */}
        <div className={styles.stickyFooterBar}>
          <div className={styles.footerPricingBlock}>
            <span className={styles.footerPricePrimary}>
              {eventData.pricingSummary.pair}
            </span>
            <span className={styles.footerPriceSplitLaptop}>
              {eventData.pricingSummary.split}
            </span>
            <span className={styles.footerPriceSplitPhone}>
              {eventData.pricingSummary.splitShort}
            </span>
          </div>

          <button
            type="button"
            className={styles.primaryRegisterBtn}
            onClick={handleRegisterClick}
          >
            Register With Your Homie
          </button>
        </div>
      </div>
    </div>,
    document.body
  );
}
