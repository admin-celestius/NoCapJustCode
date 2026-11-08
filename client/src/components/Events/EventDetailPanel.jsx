// client/src/components/Events/EventDetailPanel.jsx
import React, { useEffect, useRef, useState, useCallback, startTransition } from 'react';
import { createPortal } from 'react-dom';
import styles from './Events.module.css';
import TugOfAuraVisual from './TugOfAuraVisual.jsx';
import GoatTerminalVisual from './GoatTerminalVisual.jsx';
import TrainingArcGallery from './TrainingArcGallery.jsx';
import { eventData } from '../../data/event.js';

export default function EventDetailPanel({ event, isOpen, onClose, onRegister, triggerRef }) {
  const [activeTab, setActiveTab] = useState('overview'); // For TLE: 'overview' | 'round1' | 'round2'
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
          className={styles.sheetHeader}
          onPointerDown={handlePointerDown}
          onPointerMove={handlePointerMove}
          onPointerUp={handlePointerUp}
          onPointerCancel={handlePointerUp}
        >
          <div className={styles.dragPillIndicator} aria-hidden="true" />
          <div className={styles.headerBar}>
            <span className={styles.headerEyebrow}>{eyebrowText}</span>
            <button
              ref={closeBtnRef}
              type="button"
              className={styles.headerCloseBtn}
              onClick={handleClose}
              aria-label="Close details"
            >
              <svg
                width="20"
                height="20"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="1.75"
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

        {/* (b) BODY: Inner Scroll Container with Dark Thin Scrollbar */}
        <div className={styles.sheetBody}>
          {/* TRAINING ARC: 2-column on laptop, ordered with gallery first on phone */}
          {isTrainingArc && (
            <div className={styles.trainingArcContainer}>
              {/* Left Column: Title, Chips, About, Instructor, Glance */}
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
                        <path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0 1 18 0z" />
                        <circle cx="12" cy="10" r="3" />
                      </svg>
                      Pega Lab
                    </span>

                    <span className={styles.detailMetaChip}>
                      <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                        <path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2" />
                        <circle cx="9" cy="7" r="4" />
                        <path d="M23 21v-2a4 4 0 0 0-3-3.87" />
                        <path d="M16 3.13a4 4 0 0 1 0 7.75" />
                      </svg>
                      Pair entry
                    </span>
                  </div>
                </div>

                <div className={styles.detailSectionsStack}>
                  {/* About: ONE paragraph */}
                  <section className={styles.detailSection}>
                    <h2 className={styles.sectionMonoLabel}>ABOUT</h2>
                    <p className={styles.sectionParagraph}>
                      {event.about || 'A hands-on workshop on competitive coding and problem-solving, conducted by a top coder of CIT, a 3rd year senior.'}
                    </p>
                  </section>



                  {/* At a glance: definition list */}
                  <section className={styles.detailSection}>
                    <h2 className={styles.sectionMonoLabel}>AT A GLANCE</h2>
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
                <TrainingArcGallery caption={event.photoCaption || 'From our past workshops'} />
              </div>
            </div>
          )}

          {/* TLE COMPETITION CONTENT */}
          {isTle && (
            <div className={styles.tleContainer}>
              {/* Left Column: Title, Chips, Sticky Segmented Tab Bar, Panels */}
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
                        <path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0 1 18 0z" />
                        <circle cx="12" cy="10" r="3" />
                      </svg>
                      Pega Lab
                    </span>

                    <span className={styles.detailMetaChip}>
                      <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                        <path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2" />
                        <circle cx="9" cy="7" r="4" />
                        <path d="M23 21v-2a4 4 0 0 0-3-3.87" />
                        <path d="M16 3.13a4 4 0 0 1 0 7.75" />
                      </svg>
                      Pair entry
                    </span>
                  </div>
                </div>

                {/* Sticky Tab Bar (Solid #0B0B0D background, full width on phone, 44px tall, radius 12px) */}
                <div className={styles.stickyTabBarWrapper}>
                  <div className={styles.segmentedControl} role="tablist" aria-label="TLE Competition Sections">
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
                    >
                      Round 2
                    </button>
                  </div>
                </div>

                {/* Tab 1: Overview */}
                {activeTab === 'overview' && (
                  <div
                    id="panel-overview"
                    role="tabpanel"
                    aria-labelledby="tab-btn-overview"
                    className={styles.tabPanelFade}
                  >
                    <section className={styles.detailSection}>
                      <h2 className={styles.sectionMonoLabel}>ABOUT</h2>
                      <p className={styles.sectionParagraph}>
                        {event.overview?.about}
                      </p>
                    </section>

                    <section className={styles.detailSection}>
                      <h2 className={styles.sectionMonoLabel}>FORMAT</h2>
                      <p className={styles.sectionParagraph}>
                        {event.overview?.format}
                      </p>
                    </section>

                    <section className={styles.detailSection}>
                      <h2 className={styles.sectionMonoLabel}>AT A GLANCE</h2>
                      <dl className={styles.glanceList}>
                        {event.overview?.atAGlance?.map((item, idx) => (
                          <div key={idx} className={styles.glanceRow}>
                            <dt className={styles.glanceLabel}>{item.label}</dt>
                            <dd className={styles.glanceValue}>{item.value}</dd>
                          </div>
                        ))}
                      </dl>
                    </section>

                    {/* On phone: Event Day stepper at end of Overview */}
                    <div className={styles.phoneStepperBlock}>
                      <section className={styles.detailSection}>
                        <h2 className={styles.sectionMonoLabel}>EVENT DAY</h2>
                        <div className={styles.stepperCard}>
                          <div className={styles.stepperTrack}>
                            {event.stepper?.map((step, idx) => (
                              <div key={idx} className={styles.stepperItem}>
                                <div className={styles.stepperLineWrap}>
                                  <span className={styles.stepperDot} />
                                  {idx < event.stepper.length - 1 && <span className={styles.stepperLine} />}
                                </div>
                                <div className={styles.stepperContent}>
                                  <span className={styles.stepperTime}>{step.time}</span>
                                  <span className={styles.stepperTitle}>{step.title}</span>
                                  {step.subItems && (
                                    <ul className={styles.stepperSublist}>
                                      {step.subItems.map((sub, sIdx) => (
                                        <li key={sIdx} className={styles.stepperSubitem}>
                                          {sub}
                                        </li>
                                      ))}
                                    </ul>
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
                )}

                {/* Tab 2: Round 1 (Tug of Aura) */}
                {activeTab === 'round1' && (
                  <div
                    id="panel-round1"
                    role="tabpanel"
                    aria-labelledby="tab-btn-round1"
                    className={styles.tabPanelFade}
                  >
                    <section className={styles.detailSection}>
                      <h2 className={styles.sectionMonoLabel}>ROUND 1: TUG OF AURA</h2>
                      <p className={styles.sectionParagraph}>
                        {event.round1?.description}
                      </p>
                    </section>

                    <div className={styles.visualSlot}>
                      <TugOfAuraVisual />
                    </div>
                  </div>
                )}

                {/* Tab 3: Round 2 (Who's the GOAT?) */}
                {activeTab === 'round2' && (
                  <div
                    id="panel-round2"
                    role="tabpanel"
                    aria-labelledby="tab-btn-round2"
                    className={styles.tabPanelFade}
                  >
                    <section className={styles.detailSection}>
                      <h2 className={styles.sectionMonoLabel}>ROUND 2: WHO'S THE GOAT?</h2>
                      <p className={styles.sectionParagraph}>
                        {event.round2?.description}
                      </p>
                    </section>

                    <div className={styles.visualSlot}>
                      <GoatTerminalVisual />
                    </div>
                  </div>
                )}
              </div>

              {/* Right Column (Laptop >= 768px): Event Day Stepper & Note Card */}
              <div className={styles.rightCol}>
                <div className={styles.desktopTleFactsArea}>
                  <section className={styles.detailSection}>
                    <h2 className={styles.sectionMonoLabel}>EVENT DAY</h2>
                    <div className={styles.stepperCard}>
                      <div className={styles.stepperTrack}>
                        {event.stepper?.map((step, idx) => (
                          <div key={idx} className={styles.stepperItem}>
                            <div className={styles.stepperLineWrap}>
                              <span className={styles.stepperDot} />
                              {idx < event.stepper.length - 1 && <span className={styles.stepperLine} />}
                            </div>
                            <div className={styles.stepperContent}>
                              <span className={styles.stepperTime}>{step.time}</span>
                              <span className={styles.stepperTitle}>{step.title}</span>
                              {step.subItems && (
                                <ul className={styles.stepperSublist}>
                                  {step.subItems.map((sub, sIdx) => (
                                    <li key={sIdx} className={styles.stepperSubitem}>
                                      {sub}
                                    </li>
                                  ))}
                                </ul>
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
            Register as a pair
          </button>
        </div>
      </div>
    </div>,
    document.body
  );
}
