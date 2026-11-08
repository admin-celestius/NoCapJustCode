// client/src/components/Schedule/Schedule.jsx
import React, { useState, useEffect, useRef } from 'react';
import styles from './Schedule.module.css';
import { eventData } from '../../data/event.js';
import { SectionScene } from '../Scene/index.js';

export default function Schedule() {
  const timelineRef = useRef(null);
  const itemRefs = useRef([]);
  const tickingRef = useRef(false);
  const [activeStep, setActiveStep] = useState(() => {
    if (typeof window !== 'undefined' && window.matchMedia('(prefers-reduced-motion: reduce)').matches) {
      return eventData.schedule.length;
    }
    return 0;
  });
  const [spineHeight, setSpineHeight] = useState(0);

  // Responsive two-way scroll tracking (animates down when scrolling down, retracts up when scrolling up)
  useEffect(() => {
    if (typeof window === 'undefined') return;

    const isReduced = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    if (isReduced) {
      return;
    }

    const handleScroll = () => {
      if (!tickingRef.current) {
        window.requestAnimationFrame(() => {
          if (!timelineRef.current) {
            tickingRef.current = false;
            return;
          }

          const windowHeight = window.innerHeight || document.documentElement.clientHeight;
          // Activation trigger line: when the node enters the comfortable lower-mid viewport (~70%)
          const triggerLine = windowHeight * 0.70;
          const timelineRect = timelineRef.current.getBoundingClientRect();

          let highestActive = 0;
          let activeNodeY = 0;

          itemRefs.current.forEach((el, idx) => {
            if (!el) return;
            const rect = el.getBoundingClientRect();
            // Center of the node dot (~26px from top of row)
            const nodeCenter = rect.top + 26;

            if (nodeCenter <= triggerLine) {
              highestActive = idx + 1;
              activeNodeY = nodeCenter - timelineRect.top;
            }
          });

          setActiveStep(highestActive);

          if (highestActive === 0) {
            setSpineHeight(0);
          } else {
            setSpineHeight(Math.max(0, activeNodeY));
          }

          tickingRef.current = false;
        });
        tickingRef.current = true;
      }
    };

    window.addEventListener('scroll', handleScroll, { passive: true });
    window.addEventListener('resize', handleScroll, { passive: true });
    handleScroll(); // Initial check

    return () => {
      window.removeEventListener('scroll', handleScroll);
      window.removeEventListener('resize', handleScroll);
    };
  }, []);

  return (
    <section id="schedule" className={`section ${styles.scheduleSection}`}>
      <SectionScene section="schedule" />
      <div className={`container ${styles.scheduleContainer}`}>
        <div className={styles.scheduleHeader}>
          <div className="section-tag scrollReveal" style={{ transitionDelay: '0ms' }}>
            // 02. FULL SCHEDULE
          </div>
          <h2 className="section-title scrollReveal" style={{ transitionDelay: '80ms' }}>
            Event Timeline
          </h2>
          <p className="section-subtitle scrollReveal" style={{ transitionDelay: '160ms' }}>
            A single day structured for learning, testing your endurance, and crowning the problem-solving champions.
          </p>
        </div>

        <div ref={timelineRef} className={styles.timeline}>
          {/* Cyber Spine Track & Responsive Bidirectional Laser Energy Rail */}
          <div className={styles.spineTrack} aria-hidden="true">
            <div
              className={styles.spineEnergyRail}
              style={{ height: `${spineHeight}px` }}
            >
              {spineHeight > 0 && <div className={styles.laserSparkHead} />}
            </div>
          </div>

          {eventData.schedule.map((item, idx) => {
            const isActivated = activeStep > idx;
            const typeLower = item.type?.toLowerCase() || '';
            const isWorkshop = typeLower === 'workshop';
            const isCompetition = typeLower === 'competition';

            return (
              <div
                key={item.id}
                ref={(el) => (itemRefs.current[idx] = el)}
                className={`${styles.timelineItem} ${item.highlight ? styles.highlight : ''} ${
                  isActivated ? styles.itemActivated : ''
                } scrollReveal`}
                style={{ transitionDelay: `${100 + idx * 60}ms` }}
              >
                {/* Node indicator with radar ping ripples */}
                <div
                  className={`${styles.nodeDot} ${isActivated ? styles.nodeActivated : ''}`}
                  aria-hidden="true"
                >
                  <div className={styles.nodeInnerCore} />
                  {isActivated && <div className={styles.radarPing} />}
                  {isActivated && <div className={styles.radarPingSecondary} />}
                </div>

                {/* Connector circuit arm linking node to content card */}
                <div
                  className={`${styles.connectorArm} ${isActivated ? styles.armActive : ''}`}
                  aria-hidden="true"
                />

                {/* Time Column with cyber telemetry */}
                <div className={styles.timeCol}>
                  <div className={styles.digitalClock}>
                    <svg
                      className={styles.clockIcon}
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
                    <span>{item.startHour || item.time.split(' - ')[0]}</span>
                  </div>
                  <span className={styles.timeText}>{item.time}</span>
                  <div className={styles.telemetryTag}>
                    <span
                      className={`${styles.statusDot} ${isActivated ? styles.statusDotActive : ''}`}
                      aria-hidden="true"
                    />
                    <span>{isActivated ? 'LOCKED IN' : 'UPCOMING'}</span>
                  </div>
                </div>

                {/* Content Card with laser border sweep & hologram depth */}
                <div className={styles.contentCard}>
                  <div className={styles.cardLaserSweep} aria-hidden="true" />

                  <div className={styles.cardHeader}>
                    <div className={styles.titleGroup}>
                      <span className={styles.milestoneIndex}>// 0{idx + 1}</span>
                      <h3 className={styles.itemTitle}>{item.title}</h3>
                    </div>

                    <div className={styles.badgesGroup}>
                      {isWorkshop && (
                        <span className={`${styles.badge} ${styles.badgeWorkshop}`}>
                          <span className={styles.badgePulseDot} aria-hidden="true" />
                          <svg
                            className={styles.badgeSvgIcon}
                            width="11"
                            height="11"
                            viewBox="0 0 24 24"
                            fill="currentColor"
                            aria-hidden="true"
                          >
                            <polygon points="13 2 3 14 12 14 11 22 21 10 12 10 13 2" />
                          </svg>
                          <span>{item.type}</span>
                        </span>
                      )}
                      {isCompetition && (
                        <span className={`${styles.badge} ${styles.badgeCompetition}`}>
                          <span className={styles.badgePulseDot} aria-hidden="true" />
                          <svg
                            className={styles.badgeSvgIcon}
                            width="11"
                            height="11"
                            viewBox="0 0 24 24"
                            fill="none"
                            stroke="currentColor"
                            strokeWidth="2.2"
                            strokeLinecap="round"
                            strokeLinejoin="round"
                            aria-hidden="true"
                          >
                            <polyline points="14.5 17.5 3 6 3 3 6 3 17.5 14.5" />
                            <line x1="13" y1="19" x2="19" y2="13" />
                            <line x1="16" y1="16" x2="20" y2="20" />
                            <line x1="19" y1="21" x2="21" y2="19" />
                            <polyline points="14.5 6.5 18 3 21 3 21 6 17.5 9.5" />
                            <line x1="5" y1="14" x2="9" y2="18" />
                            <line x1="7" y1="17" x2="4" y2="20" />
                            <line x1="3" y1="19" x2="5" y2="21" />
                          </svg>
                          <span>{item.type}</span>
                        </span>
                      )}
                      {!isWorkshop && !isCompetition && (
                        <span className={styles.badge}>{item.type}</span>
                      )}
                    </div>
                  </div>

                  <p className={styles.itemDescription}>{item.description}</p>
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </section>
  );
}
